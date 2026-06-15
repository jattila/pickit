import React from "react";
import {
  View,
  Text,
  Image,
  Modal,
  Pressable,
  StyleSheet,
  ScrollView,
} from "react-native";
import { useRouter, usePathname } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useAuth } from "../context/AuthContext";
import { useMenu } from "../context/MenuContext";
import { useTranslation } from "../context/LocaleContext";
import { useFontScale } from "../context/FontScaleContext";
import { colors, spacing, radius, shadow } from "../theme";

type MenuRoute = "/(tabs)" | "/(tabs)/catalog" | "/(tabs)/settings";

const ITEMS: { href: MenuRoute; emoji: string; labelKey: string }[] = [
  { href: "/(tabs)", emoji: "📝", labelKey: "tabs.lists" },
  { href: "/(tabs)/catalog", emoji: "🗂️", labelKey: "tabs.catalog" },
  { href: "/(tabs)/settings", emoji: "⚙️", labelKey: "tabs.settings" },
];

function isActive(pathname: string, href: MenuRoute): boolean {
  if (href === "/(tabs)/catalog") return pathname.includes("catalog");
  if (href === "/(tabs)/settings") return pathname.includes("settings");
  return !pathname.includes("catalog") && !pathname.includes("settings");
}

export function SideMenu() {
  const { open, closeMenu } = useMenu();
  const router = useRouter();
  const pathname = usePathname();
  const insets = useSafeAreaInsets();
  const { user, displayName, household } = useAuth();
  const { t } = useTranslation();
  const { scale: fs } = useFontScale();

  if (!user) return null;

  const navigate = (href: MenuRoute) => {
    closeMenu();
    router.push(href);
  };

  return (
    <Modal visible={open} transparent animationType="fade" onRequestClose={closeMenu}>
      <View style={styles.root}>
        <Pressable style={styles.backdrop} onPress={closeMenu} accessibilityLabel={t("menu.close")} />
        <View
          style={[
            styles.panel,
            { paddingTop: insets.top + spacing.md, paddingBottom: insets.bottom + spacing.md },
          ]}
        >
          <View style={styles.brand}>
            <Image source={require("../../assets/icon.png")} style={styles.logo} accessibilityLabel="PickIt" />
            <View style={styles.brandText}>
              <Text style={[styles.appName, { fontSize: fs(22) }]}>PickIt</Text>
              <Text style={[styles.userName, { fontSize: fs(14) }]} numberOfLines={1}>
                {displayName}
              </Text>
              {household?.name ? (
                <Text style={[styles.household, { fontSize: fs(12) }]} numberOfLines={1}>
                  {household.name}
                </Text>
              ) : null}
            </View>
            <Pressable onPress={closeMenu} hitSlop={12} style={styles.closeBtn}>
              <Text style={[styles.closeText, { fontSize: fs(20) }]}>✕</Text>
            </Pressable>
          </View>

          <Text style={[styles.sectionLabel, { fontSize: fs(11) }]}>{t("menu.navigation")}</Text>

          <ScrollView contentContainerStyle={styles.items}>
            {ITEMS.map((item) => {
              const active = isActive(pathname, item.href);
              return (
                <Pressable
                  key={item.href}
                  onPress={() => navigate(item.href)}
                  style={[styles.item, active && styles.itemActive]}
                >
                  <Text style={[styles.itemEmoji, { fontSize: fs(20) }]}>{item.emoji}</Text>
                  <Text
                    style={[
                      styles.itemLabel,
                      { fontSize: fs(16) },
                      active && styles.itemLabelActive,
                    ]}
                  >
                    {t(item.labelKey)}
                  </Text>
                </Pressable>
              );
            })}
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

const PANEL_WIDTH = 280;

const styles = StyleSheet.create({
  root: { flex: 1, flexDirection: "row" },
  backdrop: { flex: 1, backgroundColor: "rgba(0,0,0,0.4)" },
  panel: {
    width: PANEL_WIDTH,
    backgroundColor: colors.surface,
    paddingHorizontal: spacing.lg,
    ...shadow.card,
  },
  brand: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
    marginBottom: spacing.lg,
  },
  brandText: { flex: 1, minWidth: 0 },
  logo: {
    width: 40,
    height: 40,
    borderRadius: radius.sm,
  },
  appName: { fontWeight: "800", color: colors.text },
  userName: { color: colors.text, fontWeight: "600", marginTop: 2 },
  household: { color: colors.textMuted, marginTop: 2 },
  closeBtn: { padding: spacing.xs },
  closeText: { color: colors.textMuted },
  sectionLabel: {
    color: colors.textMuted,
    fontWeight: "700",
    textTransform: "uppercase",
    letterSpacing: 0.6,
    marginBottom: spacing.sm,
  },
  items: { gap: spacing.xs },
  item: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.md,
    borderRadius: radius.md,
  },
  itemActive: { backgroundColor: colors.primarySoft },
  itemEmoji: { width: 28, textAlign: "center" },
  itemLabel: { color: colors.text, fontWeight: "600" },
  itemLabelActive: { color: colors.primaryDark, fontWeight: "700" },
});
