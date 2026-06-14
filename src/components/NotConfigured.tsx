import React from "react";
import { View, Text, ScrollView, StyleSheet } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { colors, spacing, radius } from "../theme";

/**
 * Akkor jelenik meg, ha a Firebase nincs beállítva (.env hiányzik).
 * Lépésről lépésre elmagyarázza a teendőt.
 */
export function NotConfigured() {
  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.title}>PickIt beállítása</Text>
        <Text style={styles.lead}>
          Az alkalmazás működéséhez egy ingyenes Firebase projekt kell a valós
          idejű szinkronhoz és a családi megosztáshoz.
        </Text>

        {steps.map((s, i) => (
          <View key={i} style={styles.step}>
            <View style={styles.num}>
              <Text style={styles.numText}>{i + 1}</Text>
            </View>
            <Text style={styles.stepText}>{s}</Text>
          </View>
        ))}

        <View style={styles.codeBox}>
          <Text style={styles.code}>{ENV_TEMPLATE}</Text>
        </View>

        <Text style={styles.note}>
          A részletes lépéseket a projekt README.md fájljában találod. A .env
          mentése után indítsd újra a fejlesztői szervert.
        </Text>
      </ScrollView>
    </SafeAreaView>
  );
}

const steps = [
  "Hozz létre egy projektet a console.firebase.google.com oldalon.",
  "Engedélyezd az Authentication > Sign-in method alatt az Anonymous és az Email/Password módot.",
  "Hozz létre egy Firestore Database-t (production vagy test módban).",
  "A Project settings > General oldalon adj hozzá egy Web alkalmazást, és másold ki a configot.",
  "A projekt gyökerében hozz létre egy .env fájlt az alábbi tartalommal, kitöltve a saját értékeiddel:",
];

const ENV_TEMPLATE = `EXPO_PUBLIC_FIREBASE_API_KEY=...
EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN=...
EXPO_PUBLIC_FIREBASE_PROJECT_ID=...
EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET=...
EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=...
EXPO_PUBLIC_FIREBASE_APP_ID=...`;

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg },
  content: { padding: spacing.xl, gap: spacing.md },
  title: { fontSize: 28, fontWeight: "800", color: colors.text },
  lead: { fontSize: 15, color: colors.textMuted, lineHeight: 22, marginBottom: spacing.sm },
  step: { flexDirection: "row", gap: spacing.md, alignItems: "flex-start" },
  num: {
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: colors.primary,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 2,
  },
  numText: { color: colors.white, fontWeight: "800", fontSize: 13 },
  stepText: { flex: 1, fontSize: 15, color: colors.text, lineHeight: 22 },
  codeBox: {
    backgroundColor: "#0f172a",
    borderRadius: radius.md,
    padding: spacing.lg,
    marginTop: spacing.sm,
  },
  code: { color: "#e2e8f0", fontFamily: "Courier", fontSize: 12.5, lineHeight: 20 },
  note: { fontSize: 13, color: colors.textMuted, lineHeight: 20, marginTop: spacing.sm },
});
