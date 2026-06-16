import React, { useEffect, useState } from "react";
import {
  Modal,
  View,
  Text,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  Pressable,
} from "react-native";
import { Button, Input } from "./ui";
import { CatalogItem } from "../types";
import { formatItemNameInput, resolveItemInput } from "../lib/itemName";
import { useTranslation } from "../context/LocaleContext";
import { colors, spacing, radius } from "../theme";
import { useScaledStyleSheet } from "../theme/useScaledStyleSheet";

interface Props {
  visible: boolean;
  item: CatalogItem | null;
  onCancel: () => void;
  onSave: (data: { name: string }) => void;
}

export function CatalogEditModal({ visible, item, onCancel, onSave }: Props) {
  const { t } = useTranslation();
  const [name, setName] = useState("");

  useEffect(() => {
    if (visible && item) {
      setName(item.name);
    }
  }, [visible, item]);

  const save = () => {
    const { name: parsedName } = resolveItemInput(name);
    if (!parsedName) return;
    onSave({ name: parsedName });
  };

  const styles = useStyles();

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onCancel}>
      <View style={styles.backdrop}>
        <Pressable style={styles.backdropTap} onPress={onCancel} accessibilityLabel={t("common.close")} />
        <KeyboardAvoidingView
          behavior={Platform.OS === "ios" ? "padding" : undefined}
          style={styles.kav}
          pointerEvents="box-none"
        >
          <Pressable style={styles.sheet} onPress={() => {}}>
            <Text style={styles.title}>{t("catalog.editTitle")}</Text>
            <Input
              placeholder={t("catalog.namePlaceholder")}
              value={name}
              onChangeText={(text) => setName(formatItemNameInput(text))}
              autoFocus
              returnKeyType="done"
              onSubmitEditing={save}
              autoCapitalize="none"
              autoCorrect={false}
            />
            <View style={styles.row}>
              <Button title={t("common.cancel")} variant="secondary" style={{ flex: 1 }} onPress={onCancel} />
              <Button
                title={t("common.save")}
                style={{ flex: 1 }}
                disabled={!name.trim()}
                onPress={save}
              />
            </View>
          </Pressable>
        </KeyboardAvoidingView>
      </View>
    </Modal>
  );
}

function useStyles() {
  return useScaledStyleSheet((fs) => ({
    backdrop: {
      flex: 1,
      backgroundColor: "rgba(0,0,0,0.4)",
      justifyContent: "center",
      padding: spacing.xl,
    },
    backdropTap: {
      ...StyleSheet.absoluteFillObject,
      zIndex: 0,
    },
    kav: { width: "100%", zIndex: 1 },
    sheet: {
      backgroundColor: colors.surface,
      borderRadius: radius.lg,
      padding: spacing.lg,
      gap: spacing.md,
    },
    title: { fontSize: fs(18), fontWeight: "700", color: colors.text },
    row: { flexDirection: "row", gap: spacing.md },
  }));
}
