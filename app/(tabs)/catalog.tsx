import React, { useEffect, useMemo, useState } from "react";
import {
  View,
  Text,
  FlatList,
  Pressable,
  TextInput,
  Alert,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useAuth } from "../../src/context/AuthContext";
import {
  subscribeCatalog,
  deleteCatalogItem,
  updateCatalogItem,
} from "../../src/lib/firestore";
import { CatalogItem } from "../../src/types";
import { EmptyState } from "../../src/components/ui";
import { EditIconButton } from "../../src/components/EditIconButton";
import { CatalogEditModal } from "../../src/components/CatalogEditModal";
import { colors, spacing, radius } from "../../src/theme";
import { useScaledStyleSheet } from "../../src/theme/useScaledStyleSheet";
import { useTranslation } from "../../src/context/LocaleContext";
import { ScreenHeader } from "../../src/components/ScreenHeader";

export default function CatalogScreen() {
  const { profile } = useAuth();
  const householdId = profile?.householdId ?? null;
  const [catalog, setCatalog] = useState<CatalogItem[]>([]);
  const [search, setSearch] = useState("");
  const [editingItem, setEditingItem] = useState<CatalogItem | null>(null);
  const { t } = useTranslation();
  const styles = useStyles();

  useEffect(() => {
    if (!householdId) return;
    const unsub = subscribeCatalog(householdId, setCatalog);
    return unsub;
  }, [householdId]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return q ? catalog.filter((c) => c.name.toLowerCase().includes(q)) : catalog;
  }, [catalog, search]);

  const remove = (item: CatalogItem) => {
    Alert.alert(item.name, t("catalog.deleteConfirm"), [
      { text: t("common.cancel"), style: "cancel" },
      {
        text: t("common.delete"),
        style: "destructive",
        onPress: () => householdId && deleteCatalogItem(householdId, item.id),
      },
    ]);
  };

  const saveEdit = async (data: { name: string; defaultQuantity: string }) => {
    if (!householdId || !editingItem) return;
    await updateCatalogItem(householdId, editingItem, data);
    setEditingItem(null);
  };

  return (
    <SafeAreaView style={styles.safe} edges={["top"]}>
      <ScreenHeader title={t("catalog.title")} />
      <Text style={styles.sub}>{t("catalog.subtitle")}</Text>

      <TextInput
        style={styles.search}
        placeholder={t("catalog.searchPlaceholder")}
        placeholderTextColor={colors.textMuted}
        value={search}
        onChangeText={setSearch}
      />

      <FlatList
        data={filtered}
        keyExtractor={(c) => c.id}
        contentContainerStyle={styles.listContent}
        ListEmptyComponent={
          <EmptyState
            title={catalog.length === 0 ? t("catalog.emptyTitle") : t("catalog.noResults")}
            subtitle={
              catalog.length === 0 ? t("catalog.emptySubtitle") : undefined
            }
          />
        }
        renderItem={({ item }) => (
          <View style={styles.row}>
            <View style={{ flex: 1 }}>
              <Text style={styles.name}>{item.name}</Text>
              {item.defaultQuantity ? (
                <Text style={styles.cat}>{item.defaultQuantity}</Text>
              ) : item.category ? (
                <Text style={styles.cat}>{item.category}</Text>
              ) : null}
            </View>
            <EditIconButton onPress={() => setEditingItem(item)} />
            <Pressable onPress={() => remove(item)} hitSlop={10} style={styles.del}>
              <Text style={styles.delText}>✕</Text>
            </Pressable>
          </View>
        )}
      />

      <CatalogEditModal
        visible={editingItem !== null}
        item={editingItem}
        onCancel={() => setEditingItem(null)}
        onSave={saveEdit}
      />
    </SafeAreaView>
  );
}

function useStyles() {
  return useScaledStyleSheet((fs) => ({
    safe: { flex: 1, backgroundColor: colors.bg },
    sub: {
      fontSize: fs(14),
      color: colors.textMuted,
      marginTop: 0,
      marginBottom: spacing.sm,
      lineHeight: fs(20),
      paddingHorizontal: spacing.lg,
    },
    search: {
      marginHorizontal: spacing.lg,
      marginTop: spacing.md,
      height: 48,
      backgroundColor: colors.surface,
      borderRadius: radius.md,
      paddingHorizontal: spacing.md,
      fontSize: fs(16),
      color: colors.text,
      borderWidth: 1,
      borderColor: colors.border,
    },
    listContent: { padding: spacing.lg, gap: spacing.sm, paddingBottom: 40 },
    row: {
      flexDirection: "row",
      alignItems: "center",
      gap: spacing.md,
      backgroundColor: colors.surface,
      borderRadius: radius.md,
      padding: spacing.md,
    },
    name: { fontSize: fs(16), color: colors.text, fontWeight: "500" },
    cat: { fontSize: fs(12), color: colors.textMuted, marginTop: 2 },
    del: { width: 30, height: 30, alignItems: "center", justifyContent: "center" },
    delText: { fontSize: fs(16), color: colors.textMuted },
  }));
}
