import React, { useState, useMemo, useEffect } from "react";
import {
  View,
  Text,
  ScrollView,
  Pressable,
  Share,
  Alert,
  Switch,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import * as Clipboard from "expo-clipboard";
import { Redirect, useRouter } from "expo-router";
import { useAuth } from "../../src/context/AuthContext";
import { leaveHousehold, setMemberSuspended, getUserProfile } from "../../src/lib/firestore";
import {
  isHouseholdAdmin,
  duplicateMemberNameKeys,
  normalizeMemberName,
  memberEmailLabel,
} from "../../src/lib/household";
import {
  clearPushTokens,
  registerForPushNotifications,
  setNotificationsEnabled,
} from "../../src/lib/pushNotifications";
import { Card, Button } from "../../src/components/ui";
import { LinkAccountModal } from "../../src/components/LinkAccountModal";
import { humanizeAuthError } from "../../src/lib/authErrors";
import { useFontScale } from "../../src/context/FontScaleContext";
import { useTranslation } from "../../src/context/LocaleContext";
import { ScreenHeader } from "../../src/components/ScreenHeader";
import { AppLocale } from "../../src/i18n/types";
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
  const { t, locale, setLocale, supportedLocales, localeLabel } = useTranslation();
  const styles = useStyles();

  const notificationsOn = profile?.notificationsEnabled !== false;

  const handleNotificationsToggle = async (value: boolean) => {
    if (!user) return;
    await setNotificationsEnabled(user.uid, value);
    if (value) {
      const ok = await registerForPushNotifications(user.uid);
      if (!ok) {
        Alert.alert(t("common.error"), t("settings.pushNotificationsDenied"));
        await setNotificationsEnabled(user.uid, false);
      }
    } else {
      await clearPushTokens(user.uid);
    }
  };

  if (profile && !profile.householdId) {
    return <Redirect href="/setup" />;
  }

  const handleResend = async () => {
    try {
      await resendVerification();
      Alert.alert(t("common.sent"), t("settings.resendSuccess"));
    } catch (e: any) {
      Alert.alert(t("common.error"), humanizeAuthError(e?.message ?? "", t));
    }
  };

  const handleRefreshVerify = async () => {
    const verified = await reloadUser();
    if (verified) {
      Alert.alert(t("common.done"), t("settings.verifiedSuccess"));
    } else {
      Alert.alert(t("settings.notVerifiedYet"), t("settings.notVerifiedHint"));
    }
  };

  const code = household?.inviteCode ?? "";
  const members = useMemo(
    () => (household ? Object.values(household.members ?? {}) : []),
    [household?.members]
  );
  const isAdmin = isHouseholdAdmin(household, user?.uid);
  const isSuspended = (uid: string) => (household?.suspendedMemberIds ?? []).includes(uid);
  const duplicateNames = useMemo(() => duplicateMemberNameKeys(members), [members]);
  const [coMemberEmails, setCoMemberEmails] = useState<Record<string, string>>({});

  // Duplikált neveknél a többi tag e-mailje a profilból (ha még nincs a tagrekordban).
  useEffect(() => {
    if (duplicateNames.size === 0 || !user?.uid) {
      setCoMemberEmails({});
      return;
    }
    let cancelled = false;
    void (async () => {
      const toFetch = members.filter(
        (m) =>
          duplicateNames.has(normalizeMemberName(m.displayName || "?")) &&
          m.uid !== user.uid &&
          !m.email?.trim()
      );
      if (toFetch.length === 0) {
        if (!cancelled) setCoMemberEmails({});
        return;
      }
      const pairs = (
        await Promise.all(
          toFetch.map(async (m) => {
            try {
              const p = await getUserProfile(m.uid);
              const e = p?.email?.trim();
              return e ? ([m.uid, e] as const) : null;
            } catch {
              return null;
            }
          })
        )
      ).filter((x): x is readonly [string, string] => x !== null);
      if (!cancelled) setCoMemberEmails(Object.fromEntries(pairs));
    })();
    return () => {
      cancelled = true;
    };
  }, [members, duplicateNames, user?.uid]);

  const confirmToggleSuspend = (memberUid: string, memberName: string, suspended: boolean) => {
    if (!user || !household) return;
    Alert.alert(
      suspended ? t("settings.reactivateMemberTitle") : t("settings.suspendMemberTitle"),
      suspended
        ? t("settings.reactivateMemberBody", { name: memberName })
        : t("settings.suspendMemberBody", { name: memberName }),
      [
        { text: t("common.cancel"), style: "cancel" },
        {
          text: suspended ? t("settings.reactivateMember") : t("settings.suspendMember"),
          style: suspended ? "default" : "destructive",
          onPress: async () => {
            try {
              await setMemberSuspended(household.id, user.uid, memberUid, !suspended);
            } catch (e: any) {
              Alert.alert(t("common.error"), e?.message ?? t("common.unknownError"));
            }
          },
        },
      ]
    );
  };

  const shareCode = async () => {
    try {
      await Share.share({
        message: t("settings.shareMessage", { name: household?.name ?? "", code }),
      });
    } catch {
      // megosztás megszakítva
    }
  };

  const copyCode = async () => {
    await Clipboard.setStringAsync(code);
    Alert.alert(t("common.copied"), t("settings.copySuccess"));
  };

  const confirmLeave = () => {
    Alert.alert(t("settings.leaveTitle"), t("settings.leaveBody"), [
      { text: t("common.cancel"), style: "cancel" },
      {
        text: t("settings.leaveConfirm"),
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
    Alert.alert(t("settings.signOutTitle"), t("settings.signOutBody"), [
      { text: t("common.cancel"), style: "cancel" },
      {
        text: t("settings.signOut"),
        style: "destructive",
        onPress: async () => {
          try {
            await signOut();
            router.replace("/login");
          } catch (e: any) {
            Alert.alert(t("common.error"), humanizeAuthError(e?.message ?? "", t));
          }
        },
      },
    ]);
  };

  return (
    <SafeAreaView style={styles.safe} edges={["top"]}>
      <ScreenHeader title={t("settings.title")} />
      <ScrollView contentContainerStyle={styles.content}>
        <Card style={{ gap: spacing.sm }}>
          <Text style={styles.label}>{t("settings.signedInAs")}</Text>
          <Text style={styles.value}>{displayName}</Text>

          {isAnonymous ? (
            <>
              <View style={styles.statusRow}>
                <View style={[styles.dot, { backgroundColor: colors.accent }]} />
                <Text style={styles.note}>{t("settings.guestNote")}</Text>
              </View>
              <Button title={t("settings.createEmailAccount")} onPress={() => setShowLink(true)} />
            </>
          ) : (
            <>
              {email ? <Text style={styles.email}>{email}</Text> : null}
              {emailVerified ? (
                <View style={styles.statusRow}>
                  <View style={[styles.dot, { backgroundColor: colors.primary }]} />
                  <Text style={styles.note}>{t("settings.emailVerified")}</Text>
                </View>
              ) : (
                <>
                  <View style={styles.statusRow}>
                    <View style={[styles.dot, { backgroundColor: colors.accent }]} />
                    <Text style={styles.note}>{t("settings.emailNotVerified")}</Text>
                  </View>
                  {verificationError ? (
                    <Text style={styles.errorNote}>
                      {t("settings.resendFailed", { error: verificationError })}
                    </Text>
                  ) : null}
                  <View style={styles.btnRow}>
                    <Button
                      title={t("settings.resend")}
                      variant="secondary"
                      style={{ flex: 1 }}
                      onPress={handleResend}
                    />
                    <Button
                      title={t("settings.refresh")}
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
          <Text style={styles.label}>{t("settings.fontSize")}</Text>
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
          <Text style={styles.note}>{t("settings.fontSizeNote")}</Text>
        </Card>

        <Card style={{ gap: spacing.sm }}>
          <Text style={styles.label}>{t("language.title")}</Text>
          <View style={styles.langRow}>
            {supportedLocales.map((loc: AppLocale) => (
              <Pressable
                key={loc}
                onPress={() => setLocale(loc)}
                style={[styles.langBtn, locale === loc && styles.langBtnActive]}
              >
                <Text style={[styles.langBtnText, locale === loc && styles.langBtnTextActive]}>
                  {localeLabel(loc)}
                </Text>
              </Pressable>
            ))}
          </View>
          <Text style={styles.note}>{t("language.note")}</Text>
        </Card>

        <Card style={{ gap: spacing.sm }}>
          <View style={styles.switchRow}>
            <Text style={styles.label}>{t("settings.pushNotifications")}</Text>
            <Switch
              value={notificationsOn}
              onValueChange={handleNotificationsToggle}
              trackColor={{ false: colors.border, true: colors.primarySoft }}
              thumbColor={notificationsOn ? colors.primary : colors.surface}
            />
          </View>
          <Text style={styles.note}>{t("settings.pushNotificationsHint")}</Text>
        </Card>

        <Card style={{ gap: spacing.sm }}>
          <Text style={styles.label}>{t("settings.family")}</Text>
          <Text style={styles.value}>{household?.name}</Text>

          <Text style={[styles.label, { marginTop: spacing.md }]}>{t("settings.inviteCode")}</Text>
          {requiresVerification ? (
            <>
              <View style={styles.codeBoxLocked}>
                <Text style={styles.codeLocked}>• • • • • •</Text>
              </View>
              <Text style={styles.errorNote}>{t("settings.inviteVerifyRequired")}</Text>
            </>
          ) : (
            <>
              <Pressable onPress={copyCode} style={styles.codeBox}>
                <Text style={styles.code}>{code}</Text>
                <Text style={styles.copyHint}>{t("settings.tapToCopy")}</Text>
              </Pressable>
              <Button title={t("settings.shareInvite")} onPress={shareCode} />
              <Text style={styles.note}>{t("settings.inviteNote")}</Text>
            </>
          )}
        </Card>

        <Card style={{ gap: spacing.sm }}>
          <Text style={styles.label}>{t("settings.members", { count: members.length })}</Text>
          {members.map((m) => {
            const suspended = isSuspended(m.uid);
            const showEmail = duplicateNames.has(normalizeMemberName(m.displayName || "?"));
            const memberEmail = memberEmailLabel(m, user?.uid, email, coMemberEmails);
            return (
              <View key={m.uid} style={styles.member}>
                <View style={styles.avatar}>
                  <Text style={styles.avatarText}>
                    {(m.displayName ?? "?").charAt(0).toUpperCase()}
                  </Text>
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.memberName}>
                    {m.displayName}
                    {showEmail && memberEmail ? (
                      <Text style={styles.memberEmail}> ({memberEmail})</Text>
                    ) : null}
                    {m.uid === user?.uid ? (
                      <Text style={styles.memberYou}> ({t("common.you")})</Text>
                    ) : null}
                  </Text>
                  {suspended ? (
                    <Text style={styles.memberSuspended}>{t("settings.memberSuspended")}</Text>
                  ) : null}
                </View>
                {isAdmin && m.uid !== user?.uid ? (
                  <Pressable
                    onPress={() => confirmToggleSuspend(m.uid, m.displayName, suspended)}
                    hitSlop={8}
                  >
                    <Text style={[styles.memberAction, suspended && styles.memberActionActive]}>
                      {suspended ? t("settings.reactivateMember") : t("settings.suspendMember")}
                    </Text>
                  </Pressable>
                ) : null}
              </View>
            );
          })}
          {isAdmin ? <Text style={styles.note}>{t("settings.suspendHint")}</Text> : null}
        </Card>

        <Card style={{ gap: spacing.sm, marginTop: spacing.md }}>
          <Text style={styles.label}>{t("settings.accountActions")}</Text>
          <Button title={t("settings.leaveHousehold")} variant="secondary" onPress={confirmLeave} />
          <Button title={t("settings.signOut")} variant="danger" onPress={confirmSignOut} />
        </Card>
      </ScrollView>

      <LinkAccountModal
        visible={showLink}
        onClose={() => setShowLink(false)}
        onLinked={() => {
          setShowLink(false);
          Alert.alert(t("settings.linkAccountSuccessTitle"), t("settings.linkAccountSuccessBody"));
        }}
      />
    </SafeAreaView>
  );
}

function useStyles() {
  return useScaledStyleSheet((fs) => ({
    safe: { flex: 1, backgroundColor: colors.bg },
  content: { padding: spacing.lg, gap: spacing.md, paddingBottom: 140, paddingTop: spacing.xs },
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
    langRow: { flexDirection: "row", gap: spacing.sm },
    langBtn: {
      flex: 1,
      paddingVertical: spacing.sm,
      paddingHorizontal: spacing.xs,
      borderRadius: radius.md,
      backgroundColor: colors.surfaceAlt,
      alignItems: "center",
    },
    langBtnActive: { backgroundColor: colors.primarySoft },
    langBtnText: { fontSize: fs(13), fontWeight: "600", color: colors.textMuted },
    langBtnTextActive: { color: colors.primaryDark, fontWeight: "700" },
    switchRow: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      gap: spacing.md,
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
    memberEmail: { fontSize: fs(14), color: colors.textMuted, fontWeight: "400" },
    memberYou: { fontSize: fs(14), color: colors.textMuted, fontWeight: "500" },
    memberSuspended: { fontSize: fs(12), color: colors.accent, fontWeight: "600", marginTop: 2 },
    memberAction: { fontSize: fs(13), fontWeight: "700", color: colors.danger },
    memberActionActive: { color: colors.primary },
  }));
}
