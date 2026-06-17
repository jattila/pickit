import React, { useEffect, useMemo, useState } from "react";
import {
  View,
  Text,
  FlatList,
  Pressable,
  TextInput,
  Alert,
  ActivityIndicator,
  Platform,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useAuth } from "../../src/context/AuthContext";
import { useOfflineBannerInset } from "../../src/context/NetworkContext";
import { useKeyboardHeight } from "../../src/hooks/useKeyboardHeight";
import {
  subscribeItems,
  subscribeCatalog,
  subscribeList,
  addItem,
  toggleItem,
  updateItem,
  deleteItem,
  clearCheckedItems,
  deleteList,
  setListArchived,
  renameList,
  setCatalogFavorite,
} from "../../src/lib/firestore";
import { CatalogItem, ListItem, ShoppingList } from "../../src/types";
import { EmptyState, ProgressBar } from "../../src/components/ui";
import { InputModal } from "../../src/components/InputModal";
import { CatalogPicker } from "../../src/components/CatalogPicker";
import { CatalogSuggestions } from "../../src/components/CatalogSuggestions";
import { ItemEditModal } from "../../src/components/ItemEditModal";
import { EditIconButton } from "../../src/components/EditIconButton";
import { FavoriteButton } from "../../src/components/FavoriteButton";
import { HamburgerButton } from "../../src/components/HamburgerButton";
import { formatItemNameInput, itemNameKey, resolveItemInput } from "../../src/lib/itemName";
import { isAlreadyCheckedOnList, sortListItemsByFavorite } from "../../src/lib/listItems";
import { colors, spacing, radius, shadow } from "../../src/theme";
import { useScaledStyleSheet } from "../../src/theme/useScaledStyleSheet";
import { useTranslation } from "../../src/context/LocaleContext";

export default function ListDetail() {
  const { id, name } = useLocalSearchParams<{ id: string; name?: string }>();
  const router = useRouter();
  const { user, profile, displayName, household } = useAuth();
  const householdId = profile?.householdId ?? null;

  const [items, setItems] = useState<ListItem[] | null>(null);
  const [catalog, setCatalog] = useState<CatalogItem[]>([]);
  const [draft, setDraft] = useState("");
  const [qty, setQty] = useState("");
  const [showCatalog, setShowCatalog] = useState(false);
  const [editingItem, setEditingItem] = useState<ListItem | null>(null);
  const [listMeta, setListMeta] = useState<ShoppingList | null>(null);
  const [showRename, setShowRename] = useState(false);
  const insets = useSafeAreaInsets();
  const bannerInset = useOfflineBannerInset();
  const keyboardHeight = useKeyboardHeight();
  const topPadding = bannerInset > 0 ? bannerInset : insets.top;
  const bottomInset = Math.max(insets.bottom, spacing.lg);
  /** Alsó beviteli sáv + safe area – a lista ne fusson alá. */
  const listBottomPad = 64 + bottomInset;
  /** iOS: abszolút pozíció. Android: adjustResize / softwareKeyboardLayoutMode kezeli. */
  const addBarBottom = Platform.OS === "ios" ? keyboardHeight : 0;
  const listPadExtra = Platform.OS === "ios" ? keyboardHeight : 0;
  const styles = useStyles();
  const { t } = useTranslation();

  useEffect(() => {
    if (!householdId || !id) return;
    const unsub = subscribeItems(householdId, id, setItems);
    return unsub;
  }, [householdId, id]);

  useEffect(() => {
    if (!householdId || !id) return;
    const unsub = subscribeList(householdId, id, setListMeta);
    return unsub;
  }, [householdId, id]);

  const listName = listMeta?.name ?? name ?? t("listDetail.defaultName");

  useEffect(() => {
    if (!householdId) return;
    const unsub = subscribeCatalog(householdId, setCatalog);
    return unsub;
  }, [householdId]);

  const existingNames = useMemo(
    () => (items ?? []).map((i) => itemNameKey(i.name)),
    [items]
  );

  const checkedNames = useMemo(
    () => (items ?? []).filter((i) => i.checked).map((i) => itemNameKey(i.name)),
    [items]
  );

  const favoriteByName = useMemo(() => {
    const map = new Map<string, boolean>();
    for (const c of catalog) {
      map.set(itemNameKey(c.name), c.favorite === true);
    }
    return map;
  }, [catalog]);

  const handleToggleFavorite = (item: ListItem) => {
    if (!householdId) return;
    const key = itemNameKey(item.name);
    void setCatalogFavorite(householdId, item.name, !favoriteByName.get(key));
  };

  const { unchecked, checked } = useMemo(() => {
    const list = items ?? [];
    const isFav = (i: ListItem) => favoriteByName.get(itemNameKey(i.name)) === true;
    return {
      unchecked: sortListItemsByFavorite(
        list.filter((i) => !i.checked),
        isFav
      ),
      checked: sortListItemsByFavorite(
        list.filter((i) => i.checked),
        isFav
      ),
    };
  }, [items, favoriteByName]);

  const total = (items ?? []).length;
  const done = checked.length;
  const progress = total > 0 ? done / total : 0;

  const handleAdd = async (nameOverride?: string, quantityOverride?: string) => {
    if (!householdId || !user) return;
    const { name, quantity } = resolveItemInput(nameOverride ?? draft, quantityOverride ?? qty);
    if (!name) return;
    if (isAlreadyCheckedOnList(name, items ?? [])) {
      Alert.alert(t("listDetail.alreadyBoughtTitle"), t("listDetail.alreadyBoughtBody"));
      return;
    }
    setDraft("");
    setQty("");
    await addItem(householdId, id, user.uid, { name, quantity });
  };

  const handlePickSuggestion = (item: CatalogItem) => {
    void handleAdd(item.name);
  };

  const handleToggle = (item: ListItem) => {
    if (!householdId || !user) return;
    void toggleItem(householdId, id, item, user.uid, displayName);
  };

  const handleDelete = (item: ListItem) => {
    if (!householdId) return;
    void deleteItem(householdId, id, item);
  };

  const handleSaveEdit = async (data: { name: string; quantity: string }) => {
    if (!householdId || !editingItem) return;
    try {
      await updateItem(householdId, id, editingItem, data);
      setEditingItem(null);
    } catch (err) {
      Alert.alert(
        t("listDetail.saveFailed"),
        err instanceof Error ? err.message : t("common.unknownErrorOccurred")
      );
    }
  };

  const confirmClear = () => {
    if (done === 0) return;
    Alert.alert(t("listDetail.clearCheckedTitle"), t("listDetail.clearCheckedBody", { count: done }), [
      { text: t("common.cancel"), style: "cancel" },
      {
        text: t("common.delete"),
          style: "destructive",
          onPress: () => householdId && clearCheckedItems(householdId, id),
        },
      ]
    );
  };

  const handleRename = async (newName: string) => {
    if (!householdId || !id) return;
    setShowRename(false);
    try {
      await renameList(householdId, id, newName);
      router.setParams({ name: newName });
    } catch (err) {
      Alert.alert(
        t("listDetail.renameFailed"),
        err instanceof Error ? err.message : t("common.unknownErrorOccurred")
      );
    }
  };

  const openListMenu = () => {
    Alert.alert(listName, undefined, [
      { text: t("listDetail.menuRename"), onPress: () => setShowRename(true) },
      {
        text: t("listDetail.menuArchive"),
        onPress: () => householdId && setListArchived(householdId, id, true).then(() => router.back()),
      },
      {
        text: t("listDetail.menuDelete"),
        style: "destructive",
        onPress: () =>
          Alert.alert(t("listDetail.confirmDeleteTitle"), t("listDetail.confirmDeleteBody"), [
            { text: t("common.cancel"), style: "cancel" },
            {
              text: t("common.delete"),
              style: "destructive",
              onPress: () => householdId && deleteList(householdId, id).then(() => router.back()),
            },
          ]),
      },
      { text: t("common.cancel"), style: "cancel" },
    ]);
  };

  return (
    <View style={[styles.safe, { paddingTop: topPadding }]}>
      <View style={styles.flex}>
        <View style={styles.header}>
          <HamburgerButton />
          <Pressable onPress={() => router.back()} hitSlop={12} style={styles.backBtn}>
            <Text style={styles.backText}>‹</Text>
          </Pressable>
          <View style={{ flex: 1 }}>
            <Text style={styles.h1} numberOfLines={1}>
              {listName}
            </Text>
            <Text style={styles.sub}>
              {total === 0 ? t("listDetail.empty") : t("listDetail.progress", { done, total })}
            </Text>
          </View>
          <Pressable onPress={openListMenu} hitSlop={12} style={styles.menuBtn}>
            <Text style={styles.menuText}>⋯</Text>
          </Pressable>
        </View>

        {total > 0 && (
          <View style={styles.progressWrap}>
            <ProgressBar value={progress} />
          </View>
        )}

        {items === null ? (
          <View style={styles.center}>
            <ActivityIndicator color={colors.primary} />
          </View>
        ) : (
          <FlatList
            style={styles.flex}
            data={unchecked}
            keyExtractor={(i) => i.id}
            contentContainerStyle={[styles.listContent, { paddingBottom: listBottomPad + listPadExtra }]}
            keyboardShouldPersistTaps="handled"
            keyboardDismissMode="on-drag"
            ListEmptyComponent={
              checked.length === 0 ? (
                <EmptyState
                  title={t("listDetail.emptyTitle")}
                  subtitle={t("listDetail.emptySubtitle")}
                />
              ) : null
            }
            renderItem={({ item }) => (
              <ItemRow
                item={item}
                favorite={favoriteByName.get(itemNameKey(item.name)) === true}
                onToggle={() => handleToggle(item)}
                onToggleFavorite={() => handleToggleFavorite(item)}
                onEdit={() => setEditingItem(item)}
                onDelete={() => handleDelete(item)}
              />
            )}
            ListFooterComponent={
              checked.length > 0 ? (
                <View style={styles.checkedSection}>
                  <View style={styles.checkedHeader}>
                    <Text style={styles.checkedTitle}>
                      {t("listDetail.boughtSection", { count: done })}
                    </Text>
                    <Pressable onPress={confirmClear} hitSlop={8}>
                      <Text style={styles.clearText}>{t("listDetail.clearBought")}</Text>
                    </Pressable>
                  </View>
                  {checked.map((item) => (
                    <ItemRow
                      key={item.id}
                      item={item}
                      favorite={favoriteByName.get(itemNameKey(item.name)) === true}
                      onToggle={() => handleToggle(item)}
                      onToggleFavorite={() => handleToggleFavorite(item)}
                      onEdit={() => setEditingItem(item)}
                      onDelete={() => handleDelete(item)}
                    />
                  ))}
                </View>
              ) : null
            }
          />
        )}
      </View>

      <View
        style={[
          styles.addBarWrap,
          {
            bottom: addBarBottom,
            paddingBottom: keyboardHeight > 0 ? spacing.sm : bottomInset,
          },
        ]}
      >
        <CatalogSuggestions
          query={draft}
          catalog={catalog}
          existingNames={existingNames}
          onSelect={handlePickSuggestion}
        />
        <View style={styles.addBar}>
          <Pressable style={styles.catalogBtn} onPress={() => setShowCatalog(true)}>
            <Text style={styles.catalogBtnText}>🗂️</Text>
          </Pressable>
          <TextInput
            style={styles.addInput}
            placeholder={t("listDetail.newItemPlaceholder")}
            placeholderTextColor={colors.textMuted}
            value={draft}
            onChangeText={(text) => setDraft(formatItemNameInput(text))}
            onSubmitEditing={() => handleAdd()}
            returnKeyType="done"
            blurOnSubmit={false}
            autoCapitalize="none"
            autoCorrect={false}
          />
          <TextInput
            style={styles.qtyInput}
            placeholder={t("listDetail.qtyPlaceholder")}
            placeholderTextColor={colors.textMuted}
            value={qty}
            onChangeText={setQty}
            onSubmitEditing={() => handleAdd()}
          />
          <Pressable
            style={[styles.addBtn, !draft.trim() && styles.addBtnDisabled]}
            onPress={() => handleAdd()}
            disabled={!draft.trim()}
          >
            <Text style={styles.addBtnText}>＋</Text>
          </Pressable>
        </View>
      </View>

      <CatalogPicker
        visible={showCatalog}
        householdId={householdId}
        listId={id}
        uid={user?.uid ?? ""}
        existingNames={existingNames}
        checkedNames={checkedNames}
        onClose={() => setShowCatalog(false)}
      />

      <ItemEditModal
        visible={editingItem !== null}
        item={editingItem}
        onCancel={() => setEditingItem(null)}
        onSave={handleSaveEdit}
      />

      <InputModal
        visible={showRename}
        title={t("listDetail.renameTitle")}
        placeholder={t("listDetail.renamePlaceholder")}
        initialValue={listName}
        onCancel={() => setShowRename(false)}
        onConfirm={handleRename}
      />
    </View>
  );
}

function ItemRow({
  item,
  favorite,
  onToggle,
  onToggleFavorite,
  onEdit,
  onDelete,
}: {
  item: ListItem;
  favorite: boolean;
  onToggle: () => void;
  onToggleFavorite: () => void;
  onEdit: () => void;
  onDelete: () => void;
}) {
  const styles = useStyles();
  const { t } = useTranslation();
  return (
    <View style={styles.item}>
      <Pressable
        style={styles.itemMain}
        onPress={onToggle}
        onLongPress={() =>
          Alert.alert(item.name, undefined, [
            { text: t("common.edit"), onPress: onEdit },
            { text: t("common.delete"), style: "destructive", onPress: onDelete },
            { text: t("common.cancel"), style: "cancel" },
          ])
        }
      >
        <View style={[styles.checkbox, item.checked && styles.checkboxOn]}>
          {item.checked && <Text style={styles.checkmark}>✓</Text>}
        </View>
        <View style={{ flex: 1 }}>
          <Text style={[styles.itemName, item.checked && styles.itemNameChecked]}>
            {item.name}
            {item.quantity ? <Text style={styles.itemQty}>  {item.quantity}</Text> : null}
          </Text>
          {item.checked && item.checkedByName ? (
            <Text style={styles.checkedBy}>
              {t("listDetail.checkedBy", { name: item.checkedByName })}
            </Text>
          ) : null}
        </View>
      </Pressable>
      <FavoriteButton favorite={favorite} onPress={onToggleFavorite} />
      <EditIconButton onPress={onEdit} />
    </View>
  );
}

function useStyles() {
  return useScaledStyleSheet((fs) => ({
    safe: { flex: 1, backgroundColor: colors.bg },
    flex: { flex: 1 },
    header: {
      flexDirection: "row",
      alignItems: "center",
      paddingHorizontal: spacing.md,
      paddingVertical: spacing.sm,
      gap: spacing.xs,
    },
    backBtn: { width: 36, height: 36, alignItems: "center", justifyContent: "center" },
    backText: { fontSize: fs(34), color: colors.text, lineHeight: fs(36) },
    h1: { fontSize: fs(20), fontWeight: "800", color: colors.text },
    sub: { fontSize: fs(13), color: colors.textMuted },
    menuBtn: { width: 36, height: 36, alignItems: "center", justifyContent: "center" },
    menuText: { fontSize: fs(26), color: colors.text, fontWeight: "700" },
    progressWrap: { paddingHorizontal: spacing.lg, paddingBottom: spacing.sm },
    center: { flex: 1, alignItems: "center", justifyContent: "center" },
    listContent: { padding: spacing.lg, gap: spacing.sm, paddingBottom: 24 },
    item: {
      flexDirection: "row",
      alignItems: "center",
      backgroundColor: colors.surface,
      borderRadius: radius.md,
      paddingRight: spacing.sm,
      gap: spacing.xs,
      ...shadow.card,
    },
    itemMain: {
      flex: 1,
      flexDirection: "row",
      alignItems: "center",
      padding: spacing.md,
      paddingRight: 0,
      gap: spacing.md,
    },
    checkbox: {
      width: 26,
      height: 26,
      borderRadius: 13,
      borderWidth: 2,
      borderColor: colors.border,
      alignItems: "center",
      justifyContent: "center",
    },
    checkboxOn: { backgroundColor: colors.primary, borderColor: colors.primary },
    checkmark: { color: colors.white, fontSize: fs(15), fontWeight: "900" },
    itemName: { fontSize: fs(16), color: colors.text, fontWeight: "500" },
    itemNameChecked: { color: colors.checked, textDecorationLine: "line-through" },
    itemQty: { color: colors.textMuted, fontWeight: "400" },
    checkedBy: { fontSize: fs(12), color: colors.accent, marginTop: 2, fontWeight: "600" },
    checkedSection: { marginTop: spacing.lg, gap: spacing.sm },
    checkedHeader: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
      marginBottom: spacing.xs,
    },
    checkedTitle: { fontSize: fs(14), fontWeight: "700", color: colors.textMuted },
    clearText: { fontSize: fs(14), color: colors.danger, fontWeight: "600" },
    addBarWrap: {
      position: "absolute",
      left: 0,
      right: 0,
      backgroundColor: colors.surface,
      borderTopWidth: 1,
      borderTopColor: colors.border,
    },
    addBar: {
      flexDirection: "row",
      alignItems: "center",
      gap: spacing.sm,
      paddingHorizontal: spacing.md,
      paddingTop: spacing.sm,
    },
    catalogBtn: {
      width: 48,
      height: 48,
      borderRadius: radius.md,
      backgroundColor: colors.surfaceAlt,
      alignItems: "center",
      justifyContent: "center",
    },
    catalogBtnText: { fontSize: fs(20) },
    addInput: {
      flex: 1,
      height: 48,
      backgroundColor: colors.surfaceAlt,
      borderRadius: radius.md,
      paddingHorizontal: spacing.md,
      fontSize: fs(16),
      color: colors.text,
    },
    qtyInput: {
      width: 56,
      height: 48,
      backgroundColor: colors.surfaceAlt,
      borderRadius: radius.md,
      paddingHorizontal: spacing.sm,
      fontSize: fs(15),
      color: colors.text,
      textAlign: "center",
    },
    addBtn: {
      width: 48,
      height: 48,
      borderRadius: radius.md,
      backgroundColor: colors.primary,
      alignItems: "center",
      justifyContent: "center",
    },
    addBtnDisabled: { opacity: 0.4 },
    addBtnText: { color: colors.white, fontSize: fs(28), lineHeight: fs(30), fontWeight: "300" },
  }));
}
