"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.flushPushBatches = exports.onHouseholdActivity = void 0;
const admin = __importStar(require("firebase-admin"));
const firestore_1 = require("firebase-functions/v2/firestore");
const scheduler_1 = require("firebase-functions/v2/scheduler");
const firebase_functions_1 = require("firebase-functions");
const summary_1 = require("./summary");
admin.initializeApp();
admin.firestore().settings({ ignoreUndefinedProperties: true });
const db = admin.firestore();
const DEBOUNCE_MS = 3 * 60 * 1000;
/** Egy activity esemény → összefoglaló sorba, 3 perc debounce. */
exports.onHouseholdActivity = (0, firestore_1.onDocumentCreated)({
    document: "households/{householdId}/activity/{activityId}",
    region: "europe-central2",
}, async (event) => {
    const householdId = event.params.householdId;
    const data = event.data?.data();
    if (!data)
        return;
    const activity = {
        type: data.type,
        listName: data.listName ?? "Lista",
        itemName: data.itemName,
        count: data.count,
        actorUid: data.actorUid,
        actorName: data.actorName ?? "Valaki",
    };
    const batchRef = db.doc(`pushBatchQueue/${householdId}`);
    const sendAfter = admin.firestore.Timestamp.fromMillis(Date.now() + DEBOUNCE_MS);
    await db.runTransaction(async (tx) => {
        const snap = await tx.get(batchRef);
        const prev = snap.exists ? snap.data() : null;
        const events = [...(prev?.events ?? []), activity].slice(-50);
        const actorUids = [...new Set([...(prev?.actorUids ?? []), activity.actorUid])];
        tx.set(batchRef, {
            householdId,
            sendAfter,
            sent: false,
            events,
            actorUids,
        });
    });
});
async function sendExpoPush(tokens, title, body, data) {
    if (tokens.length === 0)
        return;
    const messages = tokens.map((to) => ({
        to,
        sound: "default",
        title,
        body,
        data,
    }));
    const headers = {
        Accept: "application/json",
        "Accept-encoding": "gzip, deflate",
        "Content-Type": "application/json",
    };
    const accessToken = process.env.EXPO_ACCESS_TOKEN;
    if (accessToken) {
        headers.Authorization = `Bearer ${accessToken}`;
    }
    const res = await fetch("https://exp.host/--/api/v2/push/send", {
        method: "POST",
        headers,
        body: JSON.stringify(messages),
    });
    if (!res.ok) {
        const text = await res.text();
        firebase_functions_1.logger.error("Expo push failed", { status: res.status, text });
        return;
    }
    const result = await res.json();
    const errors = (result.data ?? []).filter((r) => r.status === "error");
    if (errors.length > 0) {
        firebase_functions_1.logger.error("Expo push ticket errors", { errors });
    }
    else {
        firebase_functions_1.logger.info("Expo push sent", { count: tokens.length, title });
    }
}
/** Percenként: lejárt batch-ek összefoglaló push küldése. */
exports.flushPushBatches = (0, scheduler_1.onSchedule)({
    schedule: "every 1 minutes",
    region: "europe-central2",
}, async () => {
    const now = admin.firestore.Timestamp.now();
    const pending = await db
        .collection("pushBatchQueue")
        .where("sent", "==", false)
        .where("sendAfter", "<=", now)
        .limit(20)
        .get();
    for (const batchSnap of pending.docs) {
        const batch = batchSnap.data();
        const { householdId, events, actorUids } = batch;
        if (!events?.length) {
            await batchSnap.ref.delete();
            continue;
        }
        const householdSnap = await db.doc(`households/${householdId}`).get();
        if (!householdSnap.exists) {
            await batchSnap.ref.delete();
            continue;
        }
        const memberIds = (householdSnap.data()?.memberIds ?? []);
        const recipientIds = memberIds.filter((uid) => !actorUids.includes(uid));
        if (recipientIds.length === 0) {
            await batchSnap.ref.delete();
            continue;
        }
        const tokensByLocale = new Map();
        for (const uid of recipientIds) {
            const userSnap = await db.doc(`users/${uid}`).get();
            if (!userSnap.exists)
                continue;
            const userData = userSnap.data();
            if (userData.notificationsEnabled === false)
                continue;
            const tokens = (userData.pushTokens ?? []);
            if (tokens.length === 0)
                continue;
            const locale = (0, summary_1.normalizeLocale)(userData.locale);
            const list = tokensByLocale.get(locale) ?? [];
            list.push(...tokens);
            tokensByLocale.set(locale, list);
        }
        if (tokensByLocale.size === 0) {
            firebase_functions_1.logger.warn("No push tokens for recipients", { householdId, recipientIds });
            await batchSnap.ref.delete();
            continue;
        }
        for (const [locale, tokens] of tokensByLocale) {
            const uniqueTokens = [...new Set(tokens)];
            const { title, body } = (0, summary_1.buildNotification)(locale, events);
            await sendExpoPush(uniqueTokens, title, body, {
                householdId,
                screen: "lists",
            });
        }
        await batchSnap.ref.delete();
    }
});
//# sourceMappingURL=index.js.map