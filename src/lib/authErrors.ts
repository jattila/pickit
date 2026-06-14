/** Firebase Auth hibakódok felhasználóbarát magyar üzenetekké alakítása. */
export function humanizeAuthError(msg: string): string {
  if (
    msg.includes("auth/invalid-credential") ||
    msg.includes("auth/wrong-password")
  )
    return "Hibás e-mail vagy jelszó.";
  if (
    msg.includes("auth/email-already-in-use") ||
    msg.includes("auth/credential-already-in-use")
  )
    return "Ez az e-mail már egy másik fiókhoz tartozik. Próbálj belépni vele.";
  if (msg.includes("auth/invalid-email")) return "Érvénytelen e-mail cím.";
  if (msg.includes("auth/weak-password"))
    return "A jelszó legalább 6 karakter legyen.";
  if (msg.includes("auth/user-not-found"))
    return "Nincs ilyen e-mailes fiók.";
  if (msg.includes("auth/too-many-requests"))
    return "Túl sok próbálkozás. Próbáld újra később.";
  if (msg.includes("auth/requires-recent-login"))
    return "Biztonsági okból jelentkezz be újra, majd próbáld meg ismét.";
  if (msg.includes("auth/network-request-failed"))
    return "Hálózati hiba. Ellenőrizd a kapcsolatot.";
  return msg.replace("Firebase: ", "");
}
