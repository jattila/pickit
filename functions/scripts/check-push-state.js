const admin = require("firebase-admin");

admin.initializeApp({ projectId: "pickit-402b5" });
const db = admin.firestore();

async function main() {
  const users = await db.collection("users").get();
  console.log("=== USERS pushTokens ===");
  for (const doc of users.docs) {
    const d = doc.data();
    console.log(doc.id, {
      displayName: d.displayName,
      householdId: d.householdId,
      notificationsEnabled: d.notificationsEnabled,
      pushTokens: d.pushTokens ?? [],
    });
  }

  const batches = await db.collection("pushBatchQueue").get();
  console.log("\n=== pushBatchQueue ===", batches.size);
  batches.docs.forEach((d) => console.log(d.id, JSON.stringify(d.data(), null, 2)));

  const households = await db.collection("households").limit(3).get();
  for (const h of households.docs) {
    const activity = await h.ref.collection("activity").orderBy("createdAt", "desc").limit(5).get();
    console.log(`\n=== activity ${h.id} (${activity.size} recent) ===`);
    activity.docs.forEach((d) => console.log(d.id, d.data()));
  }
}

main().catch(console.error);
