import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  FlatList,
  Pressable,
  ActivityIndicator,
  Alert,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Redirect, useRouter } from "expo-router";
import { useAuth } from "../../src/context/AuthContext";
import {
  subscribeLists,
  createList,
  renameList,
  setListArchived,
  deleteList,
} from "../../src/lib/firestore";
import { ShoppingList } from "../../src/types";
import { Card, ProgressBar, EmptyState } from "../../src/components/ui";
import { InputModal } from "../../src/components/InputModal";
import { EditIconButton } from "../../src/components/EditIconButton";
import { VerifyEmailBanner } from "../../src/components/VerifyEmailBanner";
import { colors, spacing, radius, shadow } from "../../src/theme";
import { useScaledStyleSheet } from "../../src/theme/useScaledStyleSheet";
import { useTranslation } from "../../src/context/LocaleContext";
import { ScreenHeader } from "../../src/components/ScreenHeader";

export default function ListsScreen() {
  const { user, profile, household, displayName } = useAuth();
  const router = useRouter();
  const { t } = useTranslation();
  const [lists, setLists] = useState<ShoppingList[] | null>(null);
  const [showCreate, setShowCreate] = useState(false);
  const [renamingList, setRenamingList] = useState<ShoppingList | null>(null);
  const styles = useStyles();

  const householdId = profile?.householdId ?? null;

  useEffect(() => {
    if (!householdId) return;
    const unsub = subscribeLists(householdId, setLists);
    return unsub;
  }, [householdId]);

  if (profile && !householdId) {
    return <Redirect href="/setup" />;
  }

  const handleCreate = async (name: string) => {
    if (!householdId || !user) return;
    setShowCreate(false);
    const id = await createList(householdId, user.uid, name, displayName);
    router.push({ pathname: "/list/[id]", params: { id, name } });
  };

  const confirmDeleteList = (list: ShoppingList) => {
    Alert.alert(t("listDetail.confirmDeleteTitle"), t("listDetail.confirmDeleteBody"), [
      { text: t("common.cancel"), style: "cancel" },
      {
        text: t("common.delete"),
        style: "destructive",
        onPress: () => householdId && deleteList(householdId, list.id, { uid: user!.uid, name: displayName }),
      },
    ]);
  };

  const openListMenu = (list: ShoppingList) => {
    Alert.alert(list.name, undefined, [
      { text: t("listDetail.menuRename"), onPress: () => setRenamingList(list) },
      {
        text: t("listDetail.menuArchive"),
        onPress: () => householdId && setListArchived(householdId, list.id, true, { uid: user!.uid, name: displayName }),
      },
      {
        text: t("listDetail.menuDelete"),
        style: "destructive",
        onPress: () => confirmDeleteList(list),
      },
      { text: t("common.cancel"), style: "cancel" },
    ]);
  };

  const handleRename = async (newName: string) => {
    if (!householdId || !renamingList) return;
    const listId = renamingList.id;
    setRenamingList(null);
    try {
      await renameList(householdId, listId, newName, { uid: user!.uid, name: displayName });
    } catch (err) {
      Alert.alert(
        t("listDetail.renameFailed"),
        err instanceof Error ? err.message : t("common.unknownErrorOccurred")
      );
    }
  };

  const active = (lists ?? []).filter((l) => !l.archived);

  return (
    <SafeAreaView style={styles.safe} edges={["top"]}>
      <ScreenHeader
        eyebrow={household?.name ?? t("common.household")}
        title={t("lists.title")}
      />

      <VerifyEmailBanner />

      {lists === null ? (
        <View style={styles.center}>
          <ActivityIndicator color={colors.primary} />
        </View>
      ) : (
        <FlatList
          data={active}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.listContent}
          ListEmptyComponent={
            <EmptyState
              title={t("lists.emptyTitle")}
              subtitle={t("lists.emptySubtitle")}
            />
          }
          renderItem={({ item }) => (
            <ListRow
              list={item}
              onPress={() =>
                router.push({ pathname: "/list/[id]", params: { id: item.id, name: item.name } })
              }
              onEdit={() => setRenamingList(item)}
              onLongPress={() => openListMenu(item)}
            />
          )}
        />
      )}

      <Pressable style={styles.fab} onPress={() => setShowCreate(true)}>
        <Text style={styles.fabText}>＋</Text>
      </Pressable>

      <InputModal
        visible={showCreate}
        title={t("lists.newListTitle")}
        placeholder={t("lists.newListPlaceholder")}
        confirmLabel={t("common.create")}
        onCancel={() => setShowCreate(false)}
        onConfirm={handleCreate}
      />

      <InputModal
        visible={renamingList !== null}
        title={t("listDetail.renameTitle")}
        placeholder={t("listDetail.renamePlaceholder")}
        initialValue={renamingList?.name ?? ""}
        onCancel={() => setRenamingList(null)}
        onConfirm={handleRename}
      />
    </SafeAreaView>
  );
}

function ListRow({
  list,
  onPress,
  onEdit,
  onLongPress,
}: {
  list: ShoppingList;
  onPress: () => void;
  onEdit: () => void;
  onLongPress: () => void;
}) {
  const styles = useStyles();
  const { t } = useTranslation();
  const total = list.itemCount ?? 0;
  const done = list.checkedCount ?? 0;
  const progress = total > 0 ? done / total : 0;
  const allDone = total > 0 && done >= total;

  return (
    <Card style={styles.row}>
      <Pressable style={styles.rowMain} onPress={onPress} onLongPress={onLongPress}>
        <View style={styles.rowTop}>
          <Text style={styles.rowTitle} numberOfLines={1}>
            {list.name}
          </Text>
          <Text style={[styles.badge, allDone && styles.badgeDone]}>
            {done}/{total}
          </Text>
          <EditIconButton onPress={onEdit} />
        </View>
        <ProgressBar value={progress} />
        <Text style={styles.rowMeta}>
          {total === 0
            ? t("lists.emptyList")
            : allDone
            ? t("lists.allDone")
            : t("lists.itemsRemaining", { count: total - done })}
        </Text>
      </Pressable>
    </Card>
  );
}

function useStyles() {
  return useScaledStyleSheet((fs) => ({
    safe: { flex: 1, backgroundColor: colors.bg },
    center: { flex: 1, alignItems: "center", justifyContent: "center" },
    listContent: { padding: spacing.lg, gap: spacing.md, paddingBottom: 120 },
    row: { gap: spacing.sm },
    rowMain: { gap: spacing.sm },
    rowTop: {
      flexDirection: "row",
      alignItems: "flex-start",
      gap: spacing.xs,
    },
    rowTitle: { fontSize: fs(17), fontWeight: "700", color: colors.text, flex: 1, marginRight: spacing.sm },
    badge: {
      fontSize: fs(13),
      fontWeight: "700",
      color: colors.textMuted,
      backgroundColor: colors.surfaceAlt,
      paddingHorizontal: spacing.sm,
      paddingVertical: 2,
      borderRadius: radius.pill,
      overflow: "hidden",
    },
    badgeDone: { color: colors.white, backgroundColor: colors.primary },
    rowMeta: { fontSize: fs(13), color: colors.textMuted },
    fab: {
      position: "absolute",
      right: spacing.xl,
      bottom: spacing.xl,
      width: 60,
      height: 60,
      borderRadius: 30,
      backgroundColor: colors.primary,
      alignItems: "center",
      justifyContent: "center",
      ...shadow.card,
    },
    fabText: { color: colors.white, fontSize: fs(32), lineHeight: fs(36), fontWeight: "300" },
  }));
}
