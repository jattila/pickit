import React, { useEffect, useMemo, useState } from "react";
import {
  Modal,
  View,
  Text,
  FlatList,
  Pressable,
  TextInput,
  Alert,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import {
  subscribeCatalog,
  addItemsFromCatalog,
  addItem,
  deleteCatalogItem,
  updateCatalogItem,
  setCatalogFavorite,
} from "../lib/firestore";
import { CatalogItem } from "../types";
import { Button, EmptyState } from "./ui";
import { EditIconButton } from "./EditIconButton";
import { FavoriteButton } from "./FavoriteButton";
import { CatalogEditModal } from "./CatalogEditModal";
import { formatItemNameInput, itemNameKey, resolveItemInput } from "../lib/itemName";
import { colors, spacing, radius } from "../theme";
import { useScaledStyleSheet } from "../theme/useScaledStyleSheet";
import { useTranslation } from "../context/LocaleContext";

interface Props {
  visible: boolean;
  householdId: string | null;
  listId: string;
  uid: string;
  existingNames: string[];
  /** Bejelölt tételek nevei – gyors hozzáadásnál külön üzenethez. */
  checkedNames: string[];
  onClose: () => void;
}

export function CatalogPicker({
  visible,
  householdId,
  listId,
  uid,
  existingNames,
  checkedNames,
  onClose,
}: Props) {
  const [catalog, setCatalog] = useState<CatalogItem[]>([]);
  const [selected, setSelected] = useState<Record<string, boolean>>({});
  const [search, setSearch] = useState("");
  const [editingItem, setEditingItem] = useState<CatalogItem | null>(null);
  const { t } = useTranslation();
  const styles = useStyles();

  useEffect(() => {
    if (!visible || !householdId) return;
    setSelected({});
    setSearch("");
    const unsub = subscribeCatalog(householdId, setCatalog);
    return unsub;
  }, [visible, householdId]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    const onList = new Set(existingNames);
    return catalog
      .filter((c) => !onList.has(itemNameKey(c.name)))
      .filter((c) => (q ? itemNameKey(c.name).includes(q) : true));
  }, [catalog, search, existingNames]);

  const searchKey = itemNameKey(search);

  const canQuickAdd =
    search.trim().length > 0 &&
    !existingNames.includes(searchKey) &&
    !filtered.some((c) => itemNameKey(c.name) === searchKey);

  const quickAdd = async () => {
    if (!householdId) return;
    const { name, quantity } = resolveItemInput(search.trim());
    if (!name) return;
    if (checkedNames.includes(itemNameKey(name))) {
      Alert.alert(t("listDetail.alreadyBoughtTitle"), t("listDetail.alreadyBoughtBody"));
      return;
    }
    if (existingNames.includes(itemNameKey(name))) {
      Alert.alert(t("catalog.alreadyOnListTitle"), t("catalog.alreadyOnListBody"));
      return;
    }
    setSearch("");
    await addItem(householdId, listId, uid, { name, quantity });
  };

  const selectedItems = catalog.filter((c) => selected[c.id]);
  const count = selectedItems.length;

  const toggle = (id: string) =>
    setSelected((s) => ({ ...s, [id]: !s[id] }));

  const confirm = async () => {
    if (!householdId || count === 0) return;
    await addItemsFromCatalog(householdId, listId, uid, selectedItems);
    onClose();
  };

  const saveEdit = async (data: { name: string }) => {
    if (!householdId || !editingItem) return;
    try {
      await updateCatalogItem(householdId, editingItem, data);
      setEditingItem(null);
    } catch (err) {
      Alert.alert(
        t("common.error"),
        err instanceof Error ? err.message : t("common.unknownErrorOccurred")
      );
    }
  };

  const toggleFavorite = (item: CatalogItem) => {
    if (!householdId) return;
    void setCatalogFavorite(householdId, item.name, !item.favorite);
  };

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

  const openItemMenu = (item: CatalogItem) => {
    Alert.alert(item.name, undefined, [
      { text: t("common.edit"), onPress: () => setEditingItem(item) },
      { text: t("common.delete"), style: "destructive", onPress: () => remove(item) },
      { text: t("common.cancel"), style: "cancel" },
    ]);
  };

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose} presentationStyle="pageSheet">
      <SafeAreaView style={styles.safe}>
        <View style={styles.header}>
          <Text style={styles.title}>{t("catalog.pickerTitle")}</Text>
          <Pressable onPress={onClose} hitSlop={12}>
            <Text style={styles.close}>{t("catalog.pickerDone")}</Text>
          </Pressable>
        </View>

        <TextInput
          style={styles.search}
          placeholder={t("catalog.pickerSearch")}
          placeholderTextColor={colors.textMuted}
          value={search}
          onChangeText={(text) => setSearch(formatItemNameInput(text))}
          autoCorrect={false}
          autoCapitalize="none"
        />

        <FlatList
          data={filtered}
          keyExtractor={(c) => c.id}
          contentContainerStyle={styles.listContent}
          keyboardShouldPersistTaps="handled"
          ListEmptyComponent={
            <EmptyState
              title={
                catalog.length === 0
                  ? t("catalog.pickerEmptyTitle")
                  : t("catalog.noResults")
              }
              subtitle={
                catalog.length === 0 ? t("catalog.pickerEmptySubtitle") : undefined
              }
            />
          }
          renderItem={({ item }) => {
            const isSel = !!selected[item.id];
            return (
              <View style={[styles.row, isSel && styles.rowSelected]}>
                <Pressable
                  style={styles.rowMain}
                  onPress={() => toggle(item.id)}
                  onLongPress={() => openItemMenu(item)}
                >
                  <View style={[styles.checkbox, isSel && styles.checkboxOn]}>
                    {isSel && <Text style={styles.checkmark}>✓</Text>}
                  </View>
                  <Text style={styles.rowName}>{item.name}</Text>
                </Pressable>
                <FavoriteButton
                  favorite={item.favorite === true}
                  onPress={() => toggleFavorite(item)}
                />
                <EditIconButton onPress={() => setEditingItem(item)} />
              </View>
            );
          }}
        />

        <View style={styles.footer}>
          {canQuickAdd ? (
            <Button
              title={t("catalog.pickerQuickAdd", { name: search.trim() })}
              variant="secondary"
              onPress={quickAdd}
            />
          ) : null}
          <Button
            title={count > 0 ? t("catalog.pickerAddCount", { count }) : t("catalog.pickerSelect")}
            onPress={confirm}
            disabled={count === 0}
          />
        </View>
      </SafeAreaView>

      <CatalogEditModal
        visible={editingItem !== null}
        item={editingItem}
        onCancel={() => setEditingItem(null)}
        onSave={saveEdit}
      />
    </Modal>
  );
}

function useStyles() {
  return useScaledStyleSheet((fs) => ({
    safe: { flex: 1, backgroundColor: colors.bg },
    header: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
      padding: spacing.lg,
    },
    title: { fontSize: fs(20), fontWeight: "800", color: colors.text },
    close: { fontSize: fs(16), fontWeight: "700", color: colors.primary },
    search: {
      marginHorizontal: spacing.lg,
      height: 48,
      backgroundColor: colors.surface,
      borderRadius: radius.md,
      paddingHorizontal: spacing.md,
      fontSize: fs(16),
      color: colors.text,
      borderWidth: 1,
      borderColor: colors.border,
    },
    listContent: { padding: spacing.lg, gap: spacing.sm },
    row: {
      flexDirection: "row",
      alignItems: "center",
      gap: spacing.sm,
      backgroundColor: colors.surface,
      borderRadius: radius.md,
      paddingRight: spacing.sm,
      borderWidth: 1,
      borderColor: colors.border,
    },
    rowMain: {
      flex: 1,
      flexDirection: "row",
      alignItems: "center",
      gap: spacing.md,
      padding: spacing.md,
      paddingRight: 0,
    },
    rowSelected: { borderColor: colors.primary, backgroundColor: colors.primarySoft },
    checkbox: {
      width: 24,
      height: 24,
      borderRadius: 12,
      borderWidth: 2,
      borderColor: colors.border,
      alignItems: "center",
      justifyContent: "center",
    },
    checkboxOn: { backgroundColor: colors.primary, borderColor: colors.primary },
    checkmark: { color: colors.white, fontSize: fs(14), fontWeight: "900" },
    rowName: { flex: 1, fontSize: fs(16), color: colors.text, fontWeight: "500" },
    footer: {
      padding: spacing.lg,
      gap: spacing.sm,
      borderTopWidth: 1,
      borderTopColor: colors.border,
      backgroundColor: colors.surface,
    },
  }));
}
