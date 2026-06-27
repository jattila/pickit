import * as admin from "firebase-admin";
import { onDocumentCreated } from "firebase-functions/v2/firestore";
import { onSchedule } from "firebase-functions/v2/scheduler";
import { logger } from "firebase-functions";
import {
  ActivityEvent,
  buildNotification,
  normalizeLocale,
} from "./summary";

admin.initializeApp();
admin.firestore().settings({ ignoreUndefinedProperties: true });

const db = admin.firestore();
const DEBOUNCE_MS = 3 * 60 * 1000;

interface PushBatchDoc {
  householdId: string;
  sendAfter: admin.firestore.Timestamp;
  sent: boolean;
  events: ActivityEvent[];
  actorUids: string[];
}

/** Egy activity esemény → összefoglaló sorba, 3 perc debounce. */
export const onHouseholdActivity = onDocumentCreated(
  {
    document: "households/{householdId}/activity/{activityId}",
    region: "europe-central2",
  },
  async (event) => {
    const householdId = event.params.householdId;
    const data = event.data?.data();
    if (!data) return;

    const activity: ActivityEvent = {
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
      const prev = snap.exists ? (snap.data() as PushBatchDoc) : null;
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
  }
);

async function sendExpoPush(
  tokens: string[],
  title: string,
  body: string,
  data: Record<string, string>
): Promise<void> {
  if (tokens.length === 0) return;

  const messages = tokens.map((to) => ({
    to,
    sound: "default" as const,
    title,
    body,
    data,
  }));

  const headers: Record<string, string> = {
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
    logger.error("Expo push failed", { status: res.status, text });
    return;
  }
  const result = await res.json();
  const errors = (result.data ?? []).filter((r: { status?: string }) => r.status === "error");
  if (errors.length > 0) {
    logger.error("Expo push ticket errors", { errors });
  } else {
    logger.info("Expo push sent", { count: tokens.length, title });
  }
}

/** Percenként: lejárt batch-ek összefoglaló push küldése. */
export const flushPushBatches = onSchedule(
  {
    schedule: "every 1 minutes",
    region: "europe-central2",
  },
  async () => {
  const now = admin.firestore.Timestamp.now();
  const pending = await db
    .collection("pushBatchQueue")
    .where("sent", "==", false)
    .where("sendAfter", "<=", now)
    .limit(20)
    .get();

  for (const batchSnap of pending.docs) {
    const batch = batchSnap.data() as PushBatchDoc;
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

    const memberIds = (householdSnap.data()?.memberIds ?? []) as string[];
    const suspended = (householdSnap.data()?.suspendedMemberIds ?? []) as string[];
    const recipientIds = memberIds.filter(
      (uid) => !actorUids.includes(uid) && !suspended.includes(uid)
    );
    if (recipientIds.length === 0) {
      await batchSnap.ref.delete();
      continue;
    }

    const tokensByLocale = new Map<string, string[]>();
    for (const uid of recipientIds) {
      const userSnap = await db.doc(`users/${uid}`).get();
      if (!userSnap.exists) continue;
      const userData = userSnap.data()!;
      if (userData.notificationsEnabled === false) continue;
      const tokens = (userData.pushTokens ?? []) as string[];
      if (tokens.length === 0) continue;
      const locale = normalizeLocale(userData.locale);
      const list = tokensByLocale.get(locale) ?? [];
      list.push(...tokens);
      tokensByLocale.set(locale, list);
    }

    if (tokensByLocale.size === 0) {
      logger.warn("No push tokens for recipients", { householdId, recipientIds });
      await batchSnap.ref.delete();
      continue;
    }

    for (const [locale, tokens] of tokensByLocale) {
      const uniqueTokens = [...new Set(tokens)];
      const { title, body } = buildNotification(locale as "hu" | "en" | "de", events);
      await sendExpoPush(uniqueTokens, title, body, {
        householdId,
        screen: "lists",
      });
    }

    await batchSnap.ref.delete();
  }
  }
);
