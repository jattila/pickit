import React, { useState } from "react";
import {
  View,
  Text,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Pressable,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { useAuth } from "../src/context/AuthContext";
import { useTranslation } from "../src/context/LocaleContext";
import { Button, Input, Title, Subtitle, Card } from "../src/components/ui";
import { createHousehold, joinHousehold } from "../src/lib/firestore";
import { colors, spacing, radius } from "../src/theme";
import { useScaledStyleSheet } from "../src/theme/useScaledStyleSheet";

type Mode = "create" | "join";

export default function Setup() {
  const { user, displayName, requiresVerification, signOut } = useAuth();
  const router = useRouter();
  const { t } = useTranslation();
  const [mode, setMode] = useState<Mode>("create");
  const [householdName, setHouseholdName] = useState("");
  const [code, setCode] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const styles = useStyles();

  const submit = async () => {
    if (!user) return;
    setError(null);
    setLoading(true);
    try {
      if (mode === "create") {
        if (!householdName.trim()) throw new Error(t("setup.errHouseholdName"));
        await createHousehold(user.uid, displayName, householdName.trim());
      } else {
        if (requiresVerification) throw new Error(t("setup.errVerifyRequired"));
        if (!code.trim()) throw new Error(t("setup.errInviteCode"));
        await joinHousehold(user.uid, displayName, code.trim());
      }
      router.replace("/(tabs)");
    } catch (e: any) {
      setError(e?.message ?? t("common.unknownError"));
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.safe}>
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        style={{ flex: 1 }}
      >
        <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
          <Title>{t("setup.greeting", { name: displayName })}</Title>
          <Subtitle style={{ marginBottom: spacing.lg }}>{t("setup.subtitle")}</Subtitle>

          <View style={styles.tabs}>
            <Pressable
              style={[styles.tab, mode === "create" && styles.tabActive]}
              onPress={() => setMode("create")}
            >
              <Text style={[styles.tabText, mode === "create" && styles.tabTextActive]}>
                {t("setup.tabCreate")}
              </Text>
            </Pressable>
            <Pressable
              style={[styles.tab, mode === "join" && styles.tabActive]}
              onPress={() => setMode("join")}
            >
              <Text style={[styles.tabText, mode === "join" && styles.tabTextActive]}>
                {t("setup.tabJoin")}
              </Text>
            </Pressable>
          </View>

          <Card style={{ gap: spacing.md }}>
            {mode === "create" ? (
              <>
                <Text style={styles.label}>{t("setup.householdNameLabel")}</Text>
                <Input
                  placeholder={t("setup.householdNamePlaceholder")}
                  value={householdName}
                  onChangeText={setHouseholdName}
                  autoCapitalize="words"
                />
              </>
            ) : (
              <>
                <Text style={styles.label}>{t("setup.inviteCodeLabel")}</Text>
                <Input
                  placeholder={t("setup.inviteCodePlaceholder")}
                  value={code}
                  onChangeText={(v) => setCode(v.toUpperCase())}
                  autoCapitalize="characters"
                  autoCorrect={false}
                />
                <Text style={styles.hint}>{t("setup.inviteHint")}</Text>
                {requiresVerification ? (
                  <Text style={styles.warn}>{t("setup.verifyWarn")}</Text>
                ) : null}
              </>
            )}

            {error ? <Text style={styles.error}>{error}</Text> : null}

            <Button
              title={mode === "create" ? t("setup.createHousehold") : t("setup.join")}
              onPress={submit}
              loading={loading}
              disabled={mode === "join" && requiresVerification}
            />
          </Card>

          <Button
            title={t("setup.signOut")}
            variant="secondary"
            style={{ marginTop: spacing.xl }}
            onPress={async () => {
              await signOut();
              router.replace("/login");
            }}
          />
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

function useStyles() {
  return useScaledStyleSheet((fs) => ({
    safe: { flex: 1, backgroundColor: colors.bg },
    content: { padding: spacing.xl, flexGrow: 1, justifyContent: "center" },
    tabs: {
      flexDirection: "row",
      backgroundColor: colors.surfaceAlt,
      borderRadius: radius.md,
      padding: 4,
      marginBottom: spacing.lg,
    },
    tab: { flex: 1, paddingVertical: spacing.sm, borderRadius: radius.sm, alignItems: "center" },
    tabActive: { backgroundColor: colors.surface },
    tabText: { fontSize: fs(14), fontWeight: "600", color: colors.textMuted },
    tabTextActive: { color: colors.text },
    label: { fontSize: fs(14), fontWeight: "600", color: colors.text },
    hint: { fontSize: fs(13), color: colors.textMuted, lineHeight: fs(19) },
    warn: { fontSize: fs(13), color: "#8A5A1A", lineHeight: fs(19), fontWeight: "600" },
    error: { color: colors.danger, fontSize: fs(14) },
  }));
}
