import React, { useState } from "react";
import { View, Text, StyleSheet, Pressable, ActivityIndicator } from "react-native";
import { useRouter } from "expo-router";
import { useAuth } from "../context/AuthContext";
import { humanizeAuthError } from "../lib/authErrors";
import { colors, spacing, radius } from "../theme";

/**
 * Emlékeztető sáv a meg nem erősített e-mailes fiókoknak.
 * Anonim (vendég) és már megerősített fióknál nem jelenik meg.
 */
export function VerifyEmailBanner() {
  const { requiresVerification, resendVerification, reloadUser } = useAuth();
  const router = useRouter();
  const [dismissed, setDismissed] = useState(false);
  const [busy, setBusy] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!requiresVerification || dismissed) return null;

  const resend = async () => {
    setBusy(true);
    setError(null);
    try {
      // Hátha időközben megerősítette egy másik eszközön.
      const verified = await reloadUser();
      if (verified) return;
      await resendVerification();
      setSent(true);
    } catch (e: any) {
      setError(humanizeAuthError(e?.message ?? "Ismeretlen hiba"));
    } finally {
      setBusy(false);
    }
  };

  return (
    <Pressable style={styles.banner} onPress={() => router.push("/(tabs)/settings")}>
      <Text style={styles.emoji}>✉️</Text>
      <View style={{ flex: 1 }}>
        <Text style={styles.title}>Erősítsd meg az e-mail címed</Text>
        <Text style={styles.sub}>
          {error
            ? error
            : sent
            ? "Elküldtük újra. Nézd meg a postaládád (a spam mappát is)."
            : "A jelszó-visszaállításhoz és a megosztáshoz szükséges."}
        </Text>
      </View>
      {busy ? (
        <ActivityIndicator color={colors.primaryDark} />
      ) : (
        <View style={styles.actions}>
          <Pressable onPress={resend} hitSlop={8}>
            <Text style={styles.action}>Újraküldés</Text>
          </Pressable>
          <Pressable onPress={() => setDismissed(true)} hitSlop={8}>
            <Text style={styles.dismiss}>✕</Text>
          </Pressable>
        </View>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  banner: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
    backgroundColor: "#FDEBD3",
    borderRadius: radius.md,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    marginHorizontal: spacing.lg,
    marginBottom: spacing.sm,
  },
  emoji: { fontSize: 22 },
  title: { fontSize: 14, fontWeight: "700", color: "#8A5A1A" },
  sub: { fontSize: 12.5, color: "#8A5A1A", lineHeight: 17, marginTop: 1 },
  actions: { alignItems: "flex-end", gap: spacing.xs },
  action: { fontSize: 13, fontWeight: "700", color: colors.primaryDark },
  dismiss: { fontSize: 14, color: "#8A5A1A", paddingTop: 2 },
});
