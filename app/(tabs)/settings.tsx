import React, { useState } from "react";
import {
  View,
  Text,
  ScrollView,
  Pressable,
  Share,
  Alert,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import * as Clipboard from "expo-clipboard";
import { Redirect, useRouter } from "expo-router";
import { useAuth } from "../../src/context/AuthContext";
import { leaveHousehold } from "../../src/lib/firestore";
import { Card, Button } from "../../src/components/ui";
import { LinkAccountModal } from "../../src/components/LinkAccountModal";
import { humanizeAuthError } from "../../src/lib/authErrors";
import { useFontScale } from "../../src/context/FontScaleContext";
import { useScaledStyleSheet } from "../../src/theme/useScaledStyleSheet";
import { colors, spacing, radius } from "../../src/theme";

export default function SettingsScreen() {
  const {
    user,
    profile,
    household,
    displayName,
    isAnonymous,
    emailVerified,
    email,
    requiresVerification,
    verificationError,
    resendVerification,
    reloadUser,
    signOut,
  } = useAuth();
  const router = useRouter();
  const [showLink, setShowLink] = useState(false);
  const { label: fontScaleLabel, increase, decrease, canIncrease, canDecrease } =
    useFontScale();
  const styles = useStyles();

  if (profile && !profile.householdId) {
    return <Redirect href="/setup" />;
  }

  const handleResend = async () => {
    try {
      await resendVerification();
      Alert.alert("Elküldve", "Megerősítő e-mailt küldtünk. Nézd meg a postaládád (a spam mappát is).");
    } catch (e: any) {
      Alert.alert("Hiba", humanizeAuthError(e?.message ?? "Nem sikerült elküldeni."));
    }
  };

  const handleRefreshVerify = async () => {
    const verified = await reloadUser();
    if (verified) {
      Alert.alert("Kész", "Az e-mail címed megerősítve.");
    } else {
      Alert.alert(
        "Még nincs megerősítve",
        "Kattints a levélben lévő linkre, majd próbáld újra."
      );
    }
  };

  const code = household?.inviteCode ?? "";
  const members = household ? Object.values(household.members ?? {}) : [];

  const shareCode = async () => {
    try {
      await Share.share({
        message: `Csatlakozz a(z) "${household?.name}" bevásárlólistához a PickIt appban! Meghívó kód: ${code}`,
      });
    } catch {
      // megosztás megszakítva
    }
  };

  const copyCode = async () => {
    await Clipboard.setStringAsync(code);
    Alert.alert("Másolva", "A meghívó kód a vágólapra került.");
  };

  const confirmLeave = () => {
    Alert.alert(
      "Kilépés a családból",
      "Biztosan kilépsz? A közös listákat nem fogod látni, amíg újra nem csatlakozol.",
      [
        { text: "Mégse", style: "cancel" },
        {
          text: "Kilépés",
          style: "destructive",
          onPress: async () => {
            if (!user || !household) return;
            await leaveHousehold(user.uid, household.id);
            router.replace("/setup");
          },
        },
      ]
    );
  };

  const confirmSignOut = () => {
    Alert.alert("Kijelentkezés", "Biztosan kijelentkezel?", [
      { text: "Mégse", style: "cancel" },
      {
        text: "Kijelentkezés",
        style: "destructive",
        onPress: async () => {
          try {
            await signOut();
            router.replace("/login");
          } catch (e: any) {
            Alert.alert("Hiba", humanizeAuthError(e?.message ?? "Nem sikerült kijelentkezni."));
          }
        },
      },
    ]);
  };

  return (
    <SafeAreaView style={styles.safe} edges={["top"]}>
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.h1}>Beállítások</Text>

        <Card style={{ gap: spacing.sm }}>
          <Text style={styles.label}>Bejelentkezve mint</Text>
          <Text style={styles.value}>{displayName}</Text>

          {isAnonymous ? (
            <>
              <View style={styles.statusRow}>
                <View style={[styles.dot, { backgroundColor: colors.accent }]} />
                <Text style={styles.note}>
                  Vendég fiók – csak ezen az eszközön. Hozz létre fiókot, hogy más
                  eszközről is elérd a listáid (az adataid megmaradnak).
                </Text>
              </View>
              <Button title="Fiók létrehozása e-maillel" onPress={() => setShowLink(true)} />
            </>
          ) : (
            <>
              {email ? <Text style={styles.email}>{email}</Text> : null}
              {emailVerified ? (
                <View style={styles.statusRow}>
                  <View style={[styles.dot, { backgroundColor: colors.primary }]} />
                  <Text style={styles.note}>E-mail megerősítve ✓</Text>
                </View>
              ) : (
                <>
                  <View style={styles.statusRow}>
                    <View style={[styles.dot, { backgroundColor: colors.accent }]} />
                    <Text style={styles.note}>
                      Az e-mail címed még nincs megerősítve. Nézd meg a postaládád
                      (a spam mappát is).
                    </Text>
                  </View>
                  {verificationError ? (
                    <Text style={styles.errorNote}>
                      A megerősítő levél küldése nem sikerült: {verificationError}
                    </Text>
                  ) : null}
                  <View style={styles.btnRow}>
                    <Button
                      title="Újraküldés"
                      variant="secondary"
                      style={{ flex: 1 }}
                      onPress={handleResend}
                    />
                    <Button
                      title="Frissítés"
                      variant="secondary"
                      style={{ flex: 1 }}
                      onPress={handleRefreshVerify}
                    />
                  </View>
                </>
              )}
            </>
          )}
        </Card>

        <Card style={{ gap: spacing.sm }}>
          <Text style={styles.label}>Betűméret</Text>
          <View style={styles.fontScaleRow}>
            <Pressable
              onPress={decrease}
              disabled={!canDecrease}
              style={[styles.fontScaleBtn, !canDecrease && styles.fontScaleBtnDisabled]}
            >
              <Text style={styles.fontScaleBtnText}>A−</Text>
            </Pressable>
            <Text style={styles.fontScaleValue}>{fontScaleLabel}</Text>
            <Pressable
              onPress={increase}
              disabled={!canIncrease}
              style={[styles.fontScaleBtn, !canIncrease && styles.fontScaleBtnDisabled]}
            >
              <Text style={styles.fontScaleBtnText}>A+</Text>
            </Pressable>
          </View>
          <Text style={styles.note}>
            A beállítás csak neked vonatkozik, és minden eszközön szinkronban marad.
          </Text>
        </Card>

        <Card style={{ gap: spacing.sm }}>
          <Text style={styles.label}>Család</Text>
          <Text style={styles.value}>{household?.name}</Text>

          <Text style={[styles.label, { marginTop: spacing.md }]}>Meghívó kód</Text>
          {requiresVerification ? (
            <>
              <View style={styles.codeBoxLocked}>
                <Text style={styles.codeLocked}>• • • • • •</Text>
              </View>
              <Text style={styles.errorNote}>
                A meghívó kód megosztásához előbb erősítsd meg az e-mail címed.
              </Text>
            </>
          ) : (
            <>
              <Pressable onPress={copyCode} style={styles.codeBox}>
                <Text style={styles.code}>{code}</Text>
                <Text style={styles.copyHint}>koppints a másoláshoz</Text>
              </Pressable>
              <Button title="Meghívó megosztása" onPress={shareCode} />
              <Text style={styles.note}>
                Oszd meg ezt a kódot a családtagjaiddal. Ha beírják a „Csatlakozás"
                képernyőn, máris közösen használhatjátok a listákat – valós időben.
              </Text>
            </>
          )}
        </Card>

        <Card style={{ gap: spacing.sm }}>
          <Text style={styles.label}>Tagok ({members.length})</Text>
          {members.map((m) => (
            <View key={m.uid} style={styles.member}>
              <View style={styles.avatar}>
                <Text style={styles.avatarText}>
                  {(m.displayName ?? "?").charAt(0).toUpperCase()}
                </Text>
              </View>
              <Text style={styles.memberName}>
                {m.displayName}
                {m.uid === user?.uid ? "  (te)" : ""}
              </Text>
            </View>
          ))}
        </Card>

        <Card style={{ gap: spacing.sm, marginTop: spacing.md }}>
          <Text style={styles.label}>Fiók műveletek</Text>
          <Button title="Kilépés a családból" variant="secondary" onPress={confirmLeave} />
          <Button title="Kijelentkezés" variant="danger" onPress={confirmSignOut} />
        </Card>
      </ScrollView>

      <LinkAccountModal
        visible={showLink}
        onClose={() => setShowLink(false)}
        onLinked={() => {
          setShowLink(false);
          Alert.alert(
            "Fiók létrehozva",
            "Mostantól az e-mailedddel is be tudsz lépni. Küldtünk egy megerősítő levelet – ha nem találod, nézd meg a levélszemét (spam) mappát is."
          );
        }}
      />
    </SafeAreaView>
  );
}

function useStyles() {
  return useScaledStyleSheet((fs) => ({
    safe: { flex: 1, backgroundColor: colors.bg },
    content: { padding: spacing.lg, gap: spacing.md, paddingBottom: 140 },
    h1: { fontSize: fs(28), fontWeight: "800", color: colors.text, marginBottom: spacing.xs },
    label: {
      fontSize: fs(13),
      fontWeight: "700",
      color: colors.textMuted,
      textTransform: "uppercase",
    },
    value: { fontSize: fs(18), fontWeight: "700", color: colors.text },
    email: { fontSize: fs(15), color: colors.text },
    note: { fontSize: fs(13), color: colors.textMuted, lineHeight: fs(19), flex: 1 },
    errorNote: { fontSize: fs(13), color: colors.danger, lineHeight: fs(19) },
    statusRow: { flexDirection: "row", alignItems: "flex-start", gap: spacing.sm },
    dot: { width: 8, height: 8, borderRadius: 4, marginTop: 6 },
    btnRow: { flexDirection: "row", gap: spacing.sm },
    fontScaleRow: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      gap: spacing.lg,
    },
    fontScaleBtn: {
      width: 52,
      height: 52,
      borderRadius: radius.md,
      backgroundColor: colors.surfaceAlt,
      alignItems: "center",
      justifyContent: "center",
    },
    fontScaleBtnDisabled: { opacity: 0.35 },
    fontScaleBtnText: { fontSize: fs(20), fontWeight: "800", color: colors.text },
    fontScaleValue: {
      fontSize: fs(16),
      fontWeight: "700",
      color: colors.text,
      minWidth: 120,
      textAlign: "center",
    },
    codeBox: {
      backgroundColor: colors.primarySoft,
      borderRadius: radius.md,
      paddingVertical: spacing.md,
      alignItems: "center",
    },
    code: { fontSize: fs(30), fontWeight: "800", color: colors.primaryDark, letterSpacing: 4 },
    copyHint: { fontSize: fs(12), color: colors.primary, marginTop: 2 },
    codeBoxLocked: {
      backgroundColor: colors.surfaceAlt,
      borderRadius: radius.md,
      paddingVertical: spacing.md,
      alignItems: "center",
    },
    codeLocked: { fontSize: fs(28), fontWeight: "800", color: colors.checked, letterSpacing: 6 },
    member: { flexDirection: "row", alignItems: "center", gap: spacing.md },
    avatar: {
      width: 36,
      height: 36,
      borderRadius: 18,
      backgroundColor: colors.primary,
      alignItems: "center",
      justifyContent: "center",
    },
    avatarText: { color: colors.white, fontWeight: "800", fontSize: fs(16) },
    memberName: { fontSize: fs(16), color: colors.text, fontWeight: "500" },
  }));
}
