import React, { useState } from "react";
import { View, Text, Pressable, ActivityIndicator } from "react-native";
import { useRouter } from "expo-router";
import { useAuth } from "../context/AuthContext";
import { useTranslation } from "../context/LocaleContext";
import { humanizeAuthError } from "../lib/authErrors";
import { colors, spacing, radius } from "../theme";
import { useScaledStyleSheet } from "../theme/useScaledStyleSheet";

export function VerifyEmailBanner() {
  const { requiresVerification, resendVerification, reloadUser } = useAuth();
  const router = useRouter();
  const { t } = useTranslation();
  const [dismissed, setDismissed] = useState(false);
  const [busy, setBusy] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const styles = useStyles();

  if (!requiresVerification || dismissed) return null;

  const resend = async () => {
    setBusy(true);
    setError(null);
    try {
      const verified = await reloadUser();
      if (verified) return;
      await resendVerification();
      setSent(true);
    } catch (e: any) {
      setError(humanizeAuthError(e?.message ?? "", t));
    } finally {
      setBusy(false);
    }
  };

  return (
    <Pressable style={styles.banner} onPress={() => router.push("/(tabs)/settings")}>
      <Text style={styles.emoji}>✉️</Text>
      <View style={{ flex: 1 }}>
        <Text style={styles.title}>{t("verifyBanner.title")}</Text>
        <Text style={styles.sub}>
          {error ? error : sent ? t("verifyBanner.resentSub") : t("verifyBanner.defaultSub")}
        </Text>
      </View>
      {busy ? (
        <ActivityIndicator color={colors.primaryDark} />
      ) : (
        <View style={styles.actions}>
          <Pressable onPress={resend} hitSlop={8}>
            <Text style={styles.action}>{t("verifyBanner.resend")}</Text>
          </Pressable>
          <Pressable onPress={() => setDismissed(true)} hitSlop={8}>
            <Text style={styles.dismiss}>✕</Text>
          </Pressable>
        </View>
      )}
    </Pressable>
  );
}

function useStyles() {
  return useScaledStyleSheet((fs) => ({
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
    emoji: { fontSize: fs(22) },
    title: { fontSize: fs(14), fontWeight: "700", color: "#8A5A1A" },
    sub: { fontSize: fs(12.5), color: "#8A5A1A", lineHeight: fs(17), marginTop: 1 },
    actions: { alignItems: "flex-end", gap: spacing.xs },
    action: { fontSize: fs(13), fontWeight: "700", color: colors.primaryDark },
    dismiss: { fontSize: fs(14), color: "#8A5A1A", paddingTop: 2 },
  }));
}
