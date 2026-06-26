import React, { useState } from "react";
import {
  View,
  Text,
  Pressable,
  Alert,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Redirect, useRouter } from "expo-router";
import { useAuth } from "../src/context/AuthContext";
import { useTranslation } from "../src/context/LocaleContext";
import { Button, Input, PasswordInput, Title, Subtitle } from "../src/components/ui";
import { KeyboardAwareScrollView } from "../src/components/KeyboardAwareScrollView";
import { InputModal } from "../src/components/InputModal";
import { humanizeAuthError } from "../src/lib/authErrors";
import { colors, spacing, radius } from "../src/theme";
import { useScaledStyleSheet } from "../src/theme/useScaledStyleSheet";

type Mode = "quick" | "signin" | "signup";

export default function Login() {
  const { user, signInAnon, signInEmail, signUpEmail, resetPassword } = useAuth();
  const router = useRouter();
  const { t } = useTranslation();
  const [mode, setMode] = useState<Mode>("quick");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showReset, setShowReset] = useState(false);
  const [info, setInfo] = useState<string | null>(null);
  const styles = useStyles();

  if (user) {
    return <Redirect href="/(tabs)" />;
  }

  const handleReset = async (value: string) => {
    setShowReset(false);
    setError(null);
    setInfo(null);
    try {
      await resetPassword(value);
      setInfo(t("login.resetSent"));
    } catch (e: any) {
      setError(humanizeAuthError(e?.message ?? "", t));
    }
  };

  const submit = async () => {
    setError(null);
    setInfo(null);
    setLoading(true);
    try {
      if (mode === "quick") {
        if (!name.trim()) throw new Error(t("auth.enterName"));
        await signInAnon(name.trim());
      } else if (mode === "signin") {
        if (!email.trim() || !password) throw new Error(t("auth.enterEmailPassword"));
        await signInEmail(email, password);
      } else {
        if (!name.trim()) throw new Error(t("auth.enterName"));
        if (password.length < 6) throw new Error(t("auth.weakPassword"));
        await signUpEmail(name.trim(), email, password);
        Alert.alert(
          t("login.signupSuccessTitle"),
          t("login.signupSuccessBody", { email: email.trim() })
        );
      }
      router.replace("/(tabs)");
    } catch (e: any) {
      setError(humanizeAuthError(e?.message ?? "", t));
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.safe}>
      <KeyboardAwareScrollView contentContainerStyle={styles.content}>
          <View style={styles.logoRow}>
            <View style={styles.logo}>
              <Text style={styles.logoText}>🛒</Text>
            </View>
            <Title>PickIt</Title>
          </View>
          <Subtitle style={{ marginBottom: spacing.lg }}>{t("login.subtitle")}</Subtitle>

          <View style={styles.tabs}>
            <Tab label={t("login.tabQuick")} active={mode === "quick"} onPress={() => setMode("quick")} />
            <Tab label={t("login.tabSignIn")} active={mode === "signin"} onPress={() => setMode("signin")} />
            <Tab label={t("login.tabSignUp")} active={mode === "signup"} onPress={() => setMode("signup")} />
          </View>

          <View style={styles.form}>
            {(mode === "quick" || mode === "signup") && (
              <Input
                placeholder={t("login.namePlaceholder")}
                value={name}
                onChangeText={setName}
                autoCapitalize="words"
              />
            )}
            {(mode === "signin" || mode === "signup") && (
              <>
                <Input
                  placeholder={t("login.emailPlaceholder")}
                  value={email}
                  onChangeText={setEmail}
                  autoCapitalize="none"
                  keyboardType="email-address"
                />
                <PasswordInput
                  placeholder={t("login.passwordPlaceholder")}
                  value={password}
                  onChangeText={setPassword}
                  showPasswordLabel={t("common.showPassword")}
                  hidePasswordLabel={t("common.hidePassword")}
                />
              </>
            )}

            {error ? <Text style={styles.error}>{error}</Text> : null}
            {info ? <Text style={styles.info}>{info}</Text> : null}

            <Button
              title={
                mode === "quick"
                  ? t("login.start")
                  : mode === "signin"
                  ? t("login.signIn")
                  : t("login.createAccount")
              }
              onPress={submit}
              loading={loading}
            />

            {mode === "signin" && (
              <Pressable onPress={() => setShowReset(true)} style={{ alignSelf: "center" }}>
                <Text style={styles.link}>{t("login.forgotPassword")}</Text>
              </Pressable>
            )}

            {mode === "quick" && <Text style={styles.hint}>{t("login.quickHint")}</Text>}
          </View>
      </KeyboardAwareScrollView>

      <InputModal
        visible={showReset}
        title={t("login.resetTitle")}
        placeholder={t("login.resetEmailPlaceholder")}
        initialValue={email}
        confirmLabel={t("common.send")}
        onCancel={() => setShowReset(false)}
        onConfirm={handleReset}
      />
    </SafeAreaView>
  );
}

function Tab({
  label,
  active,
  onPress,
}: {
  label: string;
  active: boolean;
  onPress: () => void;
}) {
  const styles = useStyles();
  return (
    <Pressable onPress={onPress} style={[styles.tab, active && styles.tabActive]}>
      <Text style={[styles.tabText, active && styles.tabTextActive]}>{label}</Text>
    </Pressable>
  );
}

function useStyles() {
  return useScaledStyleSheet((fs) => ({
    safe: { flex: 1, backgroundColor: colors.bg },
    content: { padding: spacing.xl, flexGrow: 1, justifyContent: "center" },
    logoRow: { flexDirection: "row", alignItems: "center", gap: spacing.md, marginBottom: spacing.sm },
    logo: {
      width: 56,
      height: 56,
      borderRadius: radius.lg,
      backgroundColor: colors.primarySoft,
      alignItems: "center",
      justifyContent: "center",
    },
    logoText: { fontSize: fs(28) },
    tabs: {
      flexDirection: "row",
      backgroundColor: colors.surfaceAlt,
      borderRadius: radius.md,
      padding: 4,
      marginBottom: spacing.lg,
    },
    tab: {
      flex: 1,
      paddingVertical: spacing.sm,
      borderRadius: radius.sm,
      alignItems: "center",
    },
    tabActive: { backgroundColor: colors.surface },
    tabText: { fontSize: fs(13), fontWeight: "600", color: colors.textMuted },
    tabTextActive: { color: colors.text },
    form: { gap: spacing.md },
    error: { color: colors.danger, fontSize: fs(14) },
    info: { color: colors.primary, fontSize: fs(14) },
    link: { color: colors.primary, fontSize: fs(14), fontWeight: "600" },
    hint: { fontSize: fs(13), color: colors.textMuted, lineHeight: fs(19), textAlign: "center" },
  }));
}
