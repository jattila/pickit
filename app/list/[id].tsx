import React, { useEffect, useMemo, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
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
  addItem,
  toggleItem,
  updateItem,
  deleteItem,
  clearCheckedItems,
  deleteList,
  setListArchived,
} from "../../src/lib/firestore";
import { CatalogItem, ListItem } from "../../src/types";
import { EmptyState, ProgressBar } from "../../src/components/ui";
import { CatalogPicker } from "../../src/components/CatalogPicker";
import { CatalogSuggestions } from "../../src/components/CatalogSuggestions";
import { ItemEditModal } from "../../src/components/ItemEditModal";
import { EditIconButton } from "../../src/components/EditIconButton";
import { formatItemNameInput } from "../../src/lib/itemName";
import { colors, spacing, radius, shadow } from "../../src/theme";

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

  useEffect(() => {
    if (!householdId || !id) return;
    const unsub = subscribeItems(householdId, id, setItems);
    return unsub;
  }, [householdId, id]);

  useEffect(() => {
    if (!householdId) return;
    const unsub = subscribeCatalog(householdId, setCatalog);
    return unsub;
  }, [householdId]);

  const existingNames = useMemo(
    () => (items ?? []).map((i) => i.name.toLowerCase()),
    [items]
  );

  const { unchecked, checked } = useMemo(() => {
    const list = items ?? [];
    return {
      unchecked: list.filter((i) => !i.checked),
      checked: list.filter((i) => i.checked),
    };
  }, [items]);

  const total = (items ?? []).length;
  const done = checked.length;
  const progress = total > 0 ? done / total : 0;

  const handleAdd = async (nameOverride?: string, quantityOverride?: string) => {
    if (!householdId || !user) return;
    const name = (nameOverride ?? draft).trim();
    const quantity = (quantityOverride ?? qty).trim();
    if (!name) return;
    setDraft("");
    setQty("");
    await addItem(householdId, id, user.uid, { name, quantity });
  };

  const handlePickSuggestion = (item: CatalogItem) => {
    void handleAdd(item.name, item.defaultQuantity ?? "");
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
        "Mentés sikertelen",
        err instanceof Error ? err.message : "Ismeretlen hiba történt."
      );
    }
  };

  const confirmClear = () => {
    if (done === 0) return;
    Alert.alert(
      "Bejelöltek törlése",
      `Eltávolítod a ${done} megvásárolt tételt a listáról?`,
      [
        { text: "Mégse", style: "cancel" },
        {
          text: "Törlés",
          style: "destructive",
          onPress: () => householdId && clearCheckedItems(householdId, id),
        },
      ]
    );
  };

  const openListMenu = () => {
    Alert.alert(name || "Lista", undefined, [
      {
        text: "Lista archiválása",
        onPress: () => householdId && setListArchived(householdId, id, true).then(() => router.back()),
      },
      {
        text: "Lista törlése",
        style: "destructive",
        onPress: () =>
          Alert.alert("Biztosan törlöd?", "A lista és minden tétele véglegesen törlődik.", [
            { text: "Mégse", style: "cancel" },
            {
              text: "Törlés",
              style: "destructive",
              onPress: () => householdId && deleteList(householdId, id).then(() => router.back()),
            },
          ]),
      },
      { text: "Mégse", style: "cancel" },
    ]);
  };

  return (
    <View style={[styles.safe, { paddingTop: topPadding }]}>
      <View style={styles.flex}>
        <View style={styles.header}>
          <Pressable onPress={() => router.back()} hitSlop={12} style={styles.backBtn}>
            <Text style={styles.backText}>‹</Text>
          </Pressable>
          <View style={{ flex: 1 }}>
            <Text style={styles.h1} numberOfLines={1}>
              {name || "Bevásárlólista"}
            </Text>
            <Text style={styles.sub}>
              {total === 0 ? "Üres" : `${done}/${total} megvan`}
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
                  title="Üres a lista"
                  subtitle="Írd be lent az első tételt, vagy válogass a korábban használtakból."
                />
              ) : null
            }
            renderItem={({ item }) => (
              <ItemRow
                item={item}
                onToggle={() => handleToggle(item)}
                onEdit={() => setEditingItem(item)}
                onDelete={() => handleDelete(item)}
              />
            )}
            ListFooterComponent={
              checked.length > 0 ? (
                <View style={styles.checkedSection}>
                  <View style={styles.checkedHeader}>
                    <Text style={styles.checkedTitle}>Megvásárolva ({done})</Text>
                    <Pressable onPress={confirmClear} hitSlop={8}>
                      <Text style={styles.clearText}>Törlés</Text>
                    </Pressable>
                  </View>
                  {checked.map((item) => (
                    <ItemRow
                      key={item.id}
                      item={item}
                      onToggle={() => handleToggle(item)}
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
            placeholder="Új tétel…"
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
            placeholder="db"
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
        onClose={() => setShowCatalog(false)}
      />

      <ItemEditModal
        visible={editingItem !== null}
        item={editingItem}
        onCancel={() => setEditingItem(null)}
        onSave={handleSaveEdit}
      />
    </View>
  );
}

function ItemRow({
  item,
  onToggle,
  onEdit,
  onDelete,
}: {
  item: ListItem;
  onToggle: () => void;
  onEdit: () => void;
  onDelete: () => void;
}) {
  return (
    <View style={styles.item}>
      <Pressable
        style={styles.itemMain}
        onPress={onToggle}
        onLongPress={() =>
          Alert.alert(item.name, undefined, [
            { text: "Szerkesztés", onPress: onEdit },
            { text: "Törlés", style: "destructive", onPress: onDelete },
            { text: "Mégse", style: "cancel" },
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
            <Text style={styles.checkedBy}>{item.checkedByName} bejelölte</Text>
          ) : null}
        </View>
      </Pressable>
      <EditIconButton onPress={onEdit} />
    </View>
  );
}

const styles = StyleSheet.create({
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
  backText: { fontSize: 34, color: colors.text, lineHeight: 36 },
  h1: { fontSize: 20, fontWeight: "800", color: colors.text },
  sub: { fontSize: 13, color: colors.textMuted },
  menuBtn: { width: 36, height: 36, alignItems: "center", justifyContent: "center" },
  menuText: { fontSize: 26, color: colors.text, fontWeight: "700" },
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
  checkmark: { color: colors.white, fontSize: 15, fontWeight: "900" },
  itemName: { fontSize: 16, color: colors.text, fontWeight: "500" },
  itemNameChecked: { color: colors.checked, textDecorationLine: "line-through" },
  itemQty: { color: colors.textMuted, fontWeight: "400" },
  checkedBy: { fontSize: 12, color: colors.accent, marginTop: 2, fontWeight: "600" },
  checkedSection: { marginTop: spacing.lg, gap: spacing.sm },
  checkedHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: spacing.xs,
  },
  checkedTitle: { fontSize: 14, fontWeight: "700", color: colors.textMuted },
  clearText: { fontSize: 14, color: colors.danger, fontWeight: "600" },
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
  catalogBtnText: { fontSize: 20 },
  addInput: {
    flex: 1,
    height: 48,
    backgroundColor: colors.surfaceAlt,
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    fontSize: 16,
    color: colors.text,
  },
  qtyInput: {
    width: 56,
    height: 48,
    backgroundColor: colors.surfaceAlt,
    borderRadius: radius.md,
    paddingHorizontal: spacing.sm,
    fontSize: 15,
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
  addBtnText: { color: colors.white, fontSize: 28, lineHeight: 30, fontWeight: "300" },
});
