/** Firebase Auth hibakódok felhasználóbarát üzenetekké alakítása. */
export function humanizeAuthError(
  msg: string,
  t: (key: string) => string
): string {
  if (
    msg.includes("auth/invalid-credential") ||
    msg.includes("auth/wrong-password")
  )
    return t("auth.invalidCredential");
  if (
    msg.includes("auth/email-already-in-use") ||
    msg.includes("auth/credential-already-in-use")
  )
    return t("auth.emailInUse");
  if (msg.includes("auth/invalid-email")) return t("auth.invalidEmail");
  if (msg.includes("auth/weak-password")) return t("auth.weakPassword");
  if (msg.includes("auth/user-not-found")) return t("auth.userNotFound");
  if (msg.includes("auth/too-many-requests")) return t("auth.tooManyRequests");
  if (msg.includes("auth/requires-recent-login"))
    return t("auth.requiresRecentLogin");
  if (msg.includes("auth/network-request-failed")) return t("auth.networkError");
  return msg.replace("Firebase: ", "");
}
