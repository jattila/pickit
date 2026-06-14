import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Pressable,
  Alert,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Redirect, useRouter } from "expo-router";
import { useAuth } from "../src/context/AuthContext";
import { Button, Input, Title, Subtitle } from "../src/components/ui";
import { InputModal } from "../src/components/InputModal";
import { humanizeAuthError } from "../src/lib/authErrors";
import { colors, spacing, radius } from "../src/theme";

type Mode = "quick" | "signin" | "signup";

export default function Login() {
  const { user, signInAnon, signInEmail, signUpEmail, resetPassword } = useAuth();
  const router = useRouter();
  const [mode, setMode] = useState<Mode>("quick");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showReset, setShowReset] = useState(false);
  const [info, setInfo] = useState<string | null>(null);

  if (user) {
    return <Redirect href="/" />;
  }

  const handleReset = async (value: string) => {
    setShowReset(false);
    setError(null);
    setInfo(null);
    try {
      await resetPassword(value);
      setInfo("Elküldtük a jelszó-visszaállító e-mailt. Nézd meg a postaládád (a spam mappát is).");
    } catch (e: any) {
      setError(humanizeAuthError(e?.message ?? "Ismeretlen hiba"));
    }
  };

  const submit = async () => {
    setError(null);
    setLoading(true);
    try {
      if (mode === "quick") {
        if (!name.trim()) throw new Error("Add meg a neved.");
        await signInAnon(name.trim());
      } else if (mode === "signin") {
        if (!email.trim() || !password) throw new Error("Add meg az e-mailt és a jelszót.");
        await signInEmail(email, password);
      } else {
        if (!name.trim()) throw new Error("Add meg a neved.");
        if (password.length < 6) throw new Error("A jelszó legalább 6 karakter legyen.");
        await signUpEmail(name.trim(), email, password);
        Alert.alert(
          "Sikeres regisztráció",
          `Küldtünk egy megerősítő e-mailt a(z) ${email.trim()} címre. Ha nem találod, nézd meg a levélszemét (spam) mappát is.`
        );
      }
      router.replace("/");
    } catch (e: any) {
      setError(humanizeAuthError(e?.message ?? "Ismeretlen hiba"));
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
          <View style={styles.logoRow}>
            <View style={styles.logo}>
              <Text style={styles.logoText}>🛒</Text>
            </View>
            <Title>PickIt</Title>
          </View>
          <Subtitle style={{ marginBottom: spacing.lg }}>
            Közös bevásárlólista a családnak – valós időben szinkronizálva.
          </Subtitle>

          <View style={styles.tabs}>
            <Tab label="Gyors kezdés" active={mode === "quick"} onPress={() => setMode("quick")} />
            <Tab label="Belépés" active={mode === "signin"} onPress={() => setMode("signin")} />
            <Tab label="Regisztráció" active={mode === "signup"} onPress={() => setMode("signup")} />
          </View>

          <View style={styles.form}>
            {(mode === "quick" || mode === "signup") && (
              <Input
                placeholder="Neved (pl. Anna)"
                value={name}
                onChangeText={setName}
                autoCapitalize="words"
              />
            )}
            {(mode === "signin" || mode === "signup") && (
              <>
                <Input
                  placeholder="E-mail"
                  value={email}
                  onChangeText={setEmail}
                  autoCapitalize="none"
                  keyboardType="email-address"
                />
                <Input
                  placeholder="Jelszó"
                  value={password}
                  onChangeText={setPassword}
                  secureTextEntry
                />
              </>
            )}

            {error ? <Text style={styles.error}>{error}</Text> : null}
            {info ? <Text style={styles.info}>{info}</Text> : null}

            <Button
              title={
                mode === "quick"
                  ? "Kezdés"
                  : mode === "signin"
                  ? "Belépés"
                  : "Fiók létrehozása"
              }
              onPress={submit}
              loading={loading}
            />

            {mode === "signin" && (
              <Pressable onPress={() => setShowReset(true)} style={{ alignSelf: "center" }}>
                <Text style={styles.link}>Elfelejtett jelszó?</Text>
              </Pressable>
            )}

            {mode === "quick" && (
              <Text style={styles.hint}>
                A gyors kezdéshez nem kell e-mail. Később bármikor regisztrálhatsz,
                hogy más eszközről is elérd a listáidat.
              </Text>
            )}
          </View>
        </ScrollView>
      </KeyboardAvoidingView>

      <InputModal
        visible={showReset}
        title="Jelszó visszaállítása"
        placeholder="E-mail címed"
        initialValue={email}
        confirmLabel="Küldés"
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
  return (
    <Pressable
      onPress={onPress}
      style={[styles.tab, active && styles.tabActive]}
    >
      <Text style={[styles.tabText, active && styles.tabTextActive]}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
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
  logoText: { fontSize: 28 },
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
  tabText: { fontSize: 13, fontWeight: "600", color: colors.textMuted },
  tabTextActive: { color: colors.text },
  form: { gap: spacing.md },
  error: { color: colors.danger, fontSize: 14 },
  info: { color: colors.primary, fontSize: 14 },
  link: { color: colors.primary, fontSize: 14, fontWeight: "600" },
  hint: { fontSize: 13, color: colors.textMuted, lineHeight: 19, textAlign: "center" },
});
