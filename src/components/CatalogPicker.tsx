import React, { useEffect, useMemo, useState } from "react";
import {
  Modal,
  View,
  Text,
  StyleSheet,
  FlatList,
  Pressable,
  TextInput,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import {
  subscribeCatalog,
  addItemsFromCatalog,
  addItem,
} from "../lib/firestore";
import { CatalogItem } from "../types";
import { Button, EmptyState } from "./ui";
import { colors, spacing, radius } from "../theme";

interface Props {
  visible: boolean;
  householdId: string | null;
  listId: string;
  uid: string;
  existingNames: string[];
  onClose: () => void;
}

export function CatalogPicker({
  visible,
  householdId,
  listId,
  uid,
  existingNames,
  onClose,
}: Props) {
  const [catalog, setCatalog] = useState<CatalogItem[]>([]);
  const [selected, setSelected] = useState<Record<string, boolean>>({});
  const [search, setSearch] = useState("");

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
      .filter((c) => !onList.has(c.name.toLowerCase()))
      .filter((c) => (q ? c.name.toLowerCase().includes(q) : true));
  }, [catalog, search, existingNames]);

  const selectedItems = catalog.filter((c) => selected[c.id]);
  const count = selectedItems.length;

  const toggle = (id: string) =>
    setSelected((s) => ({ ...s, [id]: !s[id] }));

  const confirm = async () => {
    if (!householdId || count === 0) return;
    await addItemsFromCatalog(householdId, listId, uid, selectedItems);
    onClose();
  };

  const canQuickAdd =
    search.trim().length > 0 &&
    !filtered.some((c) => c.name.toLowerCase() === search.trim().toLowerCase());

  const quickAdd = async () => {
    if (!householdId) return;
    const name = search.trim();
    setSearch("");
    await addItem(householdId, listId, uid, { name });
  };

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose} presentationStyle="pageSheet">
      <SafeAreaView style={styles.safe}>
        <View style={styles.header}>
          <Text style={styles.title}>Korábbi tételek</Text>
          <Pressable onPress={onClose} hitSlop={12}>
            <Text style={styles.close}>Kész</Text>
          </Pressable>
        </View>

        <TextInput
          style={styles.search}
          placeholder="Keresés vagy új tétel…"
          placeholderTextColor={colors.textMuted}
          value={search}
          onChangeText={setSearch}
          autoCorrect={false}
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
                  ? "Még nincs korábbi tétel"
                  : "Nincs találat"
              }
              subtitle={
                catalog.length === 0
                  ? "Amint hozzáadsz tételeket a listáidhoz, itt megjelennek, hogy legközelebb gyorsan válogathass belőlük."
                  : undefined
              }
            />
          }
          renderItem={({ item }) => {
            const isSel = !!selected[item.id];
            return (
              <Pressable
                style={[styles.row, isSel && styles.rowSelected]}
                onPress={() => toggle(item.id)}
              >
                <View style={[styles.checkbox, isSel && styles.checkboxOn]}>
                  {isSel && <Text style={styles.checkmark}>✓</Text>}
                </View>
                <Text style={styles.rowName}>{item.name}</Text>
                {item.useCount > 1 ? (
                  <Text style={styles.useCount}>{item.useCount}×</Text>
                ) : null}
              </Pressable>
            );
          }}
        />

        <View style={styles.footer}>
          {canQuickAdd ? (
            <Button
              title={`„${search.trim()}" hozzáadása újként`}
              variant="secondary"
              onPress={quickAdd}
            />
          ) : null}
          <Button
            title={count > 0 ? `Hozzáadás (${count})` : "Válassz tételeket"}
            onPress={confirm}
            disabled={count === 0}
          />
        </View>
      </SafeAreaView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: spacing.lg,
  },
  title: { fontSize: 20, fontWeight: "800", color: colors.text },
  close: { fontSize: 16, fontWeight: "700", color: colors.primary },
  search: {
    marginHorizontal: spacing.lg,
    height: 48,
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    fontSize: 16,
    color: colors.text,
    borderWidth: 1,
    borderColor: colors.border,
  },
  listContent: { padding: spacing.lg, gap: spacing.sm },
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
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
  checkmark: { color: colors.white, fontSize: 14, fontWeight: "900" },
  rowName: { flex: 1, fontSize: 16, color: colors.text, fontWeight: "500" },
  useCount: { fontSize: 13, color: colors.textMuted, fontWeight: "600" },
  footer: {
    padding: spacing.lg,
    gap: spacing.sm,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    backgroundColor: colors.surface,
  },
});
