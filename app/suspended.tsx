import React from "react";
import { View, Text } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Redirect, useRouter } from "expo-router";
import { useAuth } from "../src/context/AuthContext";
import { useTranslation } from "../src/context/LocaleContext";
import { leaveHousehold } from "../src/lib/firestore";
import { isMemberSuspended } from "../src/lib/household";
import { Button, Title, Subtitle, Card } from "../src/components/ui";
import { colors, spacing } from "../src/theme";
import { useScaledStyleSheet } from "../src/theme/useScaledStyleSheet";

export default function SuspendedScreen() {
  const { user, profile, household, signOut } = useAuth();
  const router = useRouter();
  const { t } = useTranslation();
  const styles = useStyles();

  if (!user || !profile?.householdId) {
    return <Redirect href="/" />;
  }

  if (!isMemberSuspended(household, user.uid)) {
    return <Redirect href="/(tabs)" />;
  }

  const handleLeave = async () => {
    if (!user || !profile.householdId) return;
    await leaveHousehold(user.uid, profile.householdId);
    router.replace("/setup");
  };

  const handleSignOut = async () => {
    await signOut();
    router.replace("/login");
  };

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.content}>
        <Title>{t("suspended.title")}</Title>
        <Subtitle style={{ marginBottom: spacing.lg }}>{t("suspended.subtitle")}</Subtitle>

        <Card style={{ gap: spacing.md }}>
          <Text style={styles.note}>{t("suspended.note", { name: household?.name ?? "" })}</Text>
          <Button title={t("settings.leaveHousehold")} variant="secondary" onPress={handleLeave} />
          <Button title={t("settings.signOut")} variant="danger" onPress={handleSignOut} />
        </Card>
      </View>
    </SafeAreaView>
  );
}

function useStyles() {
  return useScaledStyleSheet((fs) => ({
    safe: { flex: 1, backgroundColor: colors.bg },
    content: { flex: 1, padding: spacing.xl, justifyContent: "center" },
    note: { fontSize: fs(14), color: colors.textMuted, lineHeight: fs(21) },
  }));
}
