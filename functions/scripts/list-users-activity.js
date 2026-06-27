/**
 * Felhasználók, e-mail címek és tevékenységeik listázása (Admin SDK).
 *
 * Futtatás (Firebase projekt admin jogosultság kell):
 *   cd functions && node scripts/list-users-activity.js
 *   cd functions && node scripts/list-users-activity.js --limit 50
 *   cd functions && node scripts/list-users-activity.js --json
 *
 * Hitelesítés (egyik):
 *   unset GOOGLE_APPLICATION_CREDENTIALS
 *   gcloud auth application-default login --project pickit-402b5
 *
 * Vagy service account kulcs:
 *   export GOOGLE_APPLICATION_CREDENTIALS="$HOME/pickit-admin-key.json"
 */
const fs = require("fs");
const admin = require("firebase-admin");

const PROJECT_ID = process.env.FIREBASE_PROJECT_ID || "pickit-402b5";

function ensureCredentials() {
  const credPath = process.env.GOOGLE_APPLICATION_CREDENTIALS;
  if (credPath && !fs.existsSync(credPath)) {
    console.error(`HIBA: GOOGLE_APPLICATION_CREDENTIALS érvénytelen fájlra mutat:\n  ${credPath}\n`);
    console.error(`Megoldás A – ADC (ajánlott):
  unset GOOGLE_APPLICATION_CREDENTIALS
  gcloud auth application-default login --project ${PROJECT_ID}
  (A böngészőben fogadd el az ÖSSZES kért jogosultságot. Ha nem megy: --no-browser)

Megoldás B – service account kulcs:
  1. Firebase Console → Project settings → Service accounts → Generate new private key
  2. Mentés: ${credPath}
  3. export GOOGLE_APPLICATION_CREDENTIALS="${credPath}"
`);
    process.exit(1);
  }
  if (!credPath) {
    const adc = `${process.env.HOME}/.config/gcloud/application_default_credentials.json`;
    if (!fs.existsSync(adc)) {
      console.error(`HIBA: Nincs hitelesítés beállítva.\n`);
      console.error(`Futtasd:
  unset GOOGLE_APPLICATION_CREDENTIALS
  gcloud auth application-default login --project ${PROJECT_ID}
`);
      process.exit(1);
    }
  }
}

function parseArgs(argv) {
  const args = { limit: 20, json: false };
  for (let i = 2; i < argv.length; i++) {
    const a = argv[i];
    if (a === "--json") args.json = true;
    else if (a === "--limit" && argv[i + 1]) {
      args.limit = Math.max(1, parseInt(argv[++i], 10) || 20);
    } else if (a === "--help" || a === "-h") {
      args.help = true;
    }
  }
  return args;
}

function formatDate(ts) {
  if (!ts) return "—";
  const d = typeof ts.toDate === "function" ? ts.toDate() : new Date(ts);
  return Number.isNaN(d.getTime()) ? "—" : d.toISOString();
}

async function loadAuthUsers() {
  const map = new Map();
  let pageToken;
  do {
    const res = await admin.auth().listUsers(1000, pageToken);
    for (const u of res.users) {
      map.set(u.uid, {
        email: u.email ?? null,
        displayName: u.displayName ?? null,
        disabled: u.disabled,
        lastSignIn: u.metadata.lastSignInTime ?? null,
      });
    }
    pageToken = res.pageToken;
  } while (pageToken);
  return map;
}

async function loadActivitiesForUser(db, householdId, uid, limit) {
  const snap = await db
    .collection("households")
    .doc(householdId)
    .collection("activity")
    .where("actorUid", "==", uid)
    .get();

  return snap.docs
    .map((d) => {
      const data = d.data();
      return {
        id: d.id,
        type: data.type,
        listName: data.listName,
        itemName: data.itemName ?? null,
        count: data.count ?? null,
        actorName: data.actorName,
        createdAt: formatDate(data.createdAt),
      };
    })
    .sort((a, b) => (a.createdAt < b.createdAt ? 1 : a.createdAt > b.createdAt ? -1 : 0))
    .slice(0, limit);
}

async function main() {
  const args = parseArgs(process.argv);
  if (args.help) {
    console.log(`Usage: node scripts/list-users-activity.js [--limit N] [--json]

  --limit N   Max. tevékenység / felhasználó (alapértelmezés: 20)
  --json      JSON kimenet
`);
    process.exit(0);
  }

  ensureCredentials();
  admin.initializeApp({ projectId: PROJECT_ID });
  const db = admin.firestore();

  const [authUsers, userSnap, householdSnap] = await Promise.all([
    loadAuthUsers(),
    db.collection("users").get(),
    db.collection("households").get(),
  ]);

  const householdsById = new Map();
  for (const doc of householdSnap.docs) {
    householdsById.set(doc.id, doc.data());
  }

  const rows = [];

  for (const doc of userSnap.docs) {
    const profile = doc.data();
    const uid = doc.id;
    const auth = authUsers.get(uid) ?? {};
    const householdId = profile.householdId ?? null;
    const household = householdId ? householdsById.get(householdId) : null;
    const memberEmail = household?.members?.[uid]?.email?.trim() || null;

    const email = profile.email?.trim() || memberEmail || auth.email || null;

    let activities = [];
    if (householdId) {
      activities = await loadActivitiesForUser(db, householdId, uid, args.limit);
    }

    rows.push({
      uid,
      displayName: profile.displayName ?? auth.displayName ?? "—",
      email: email ?? "—",
      householdId,
      householdName: household?.name ?? null,
      authDisabled: auth.disabled ?? false,
      lastSignIn: auth.lastSignIn ?? null,
      activityCount: activities.length,
      activities,
    });
  }

  rows.sort((a, b) => (a.displayName || "").localeCompare(b.displayName || "", "hu"));

  if (args.json) {
    console.log(JSON.stringify(rows, null, 2));
    return;
  }

  console.log(`PickIt – felhasználók és tevékenységek (${rows.length} user, project: ${PROJECT_ID})\n`);

  for (const row of rows) {
    console.log("=".repeat(60));
    console.log(`${row.displayName}  (${row.uid})`);
    console.log(`  E-mail:     ${row.email}`);
    console.log(`  Család:     ${row.householdName ?? "—"}  [${row.householdId ?? "nincs"}]`);
    if (row.lastSignIn) console.log(`  Utolsó login: ${row.lastSignIn}`);
    if (row.authDisabled) console.log(`  ⚠ Auth fiók letiltva`);

    if (!row.householdId) {
      console.log("  Tevékenység: (nincs család)\n");
      continue;
    }

    if (row.activities.length === 0) {
      console.log("  Tevékenység: (nincs naplózott esemény)\n");
      continue;
    }

    console.log(`  Tevékenység (utolsó ${row.activities.length}):`);
    for (const a of row.activities) {
      const extra = a.itemName ? ` – ${a.itemName}` : a.count != null ? ` (${a.count})` : "";
      console.log(`    ${a.createdAt}  ${a.type}  «${a.listName}»${extra}`);
    }
    console.log("");
  }

  const withEmail = rows.filter((r) => r.email && r.email !== "—").length;
  const withActivity = rows.filter((r) => r.activities.length > 0).length;
  console.log("=".repeat(60));
  console.log(`Összesen: ${rows.length} user, ${withEmail} email-lel, ${withActivity} tevékenységgel`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
