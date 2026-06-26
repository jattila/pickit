import React, { useEffect, useState } from "react";
import {
  Modal,
  View,
  Text,
  StyleSheet,
  Pressable,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import { Button, Input } from "./ui";
import { useTranslation } from "../context/LocaleContext";
import { colors, spacing, radius } from "../theme";
import { useScaledStyleSheet } from "../theme/useScaledStyleSheet";

interface Props {
  visible: boolean;
  title: string;
  placeholder?: string;
  initialValue?: string;
  confirmLabel?: string;
  onCancel: () => void;
  onConfirm: (value: string) => void;
}

export function InputModal({
  visible,
  title,
  placeholder,
  initialValue = "",
  confirmLabel,
  onCancel,
  onConfirm,
}: Props) {
  const { t } = useTranslation();
  const [value, setValue] = useState(initialValue);
  const styles = useStyles();
  const confirm = confirmLabel ?? t("common.save");

  useEffect(() => {
    if (visible) setValue(initialValue);
  }, [visible, initialValue]);

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onCancel}>
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={styles.kavRoot}
      >
        <View style={styles.backdrop}>
          <Pressable style={StyleSheet.absoluteFill} onPress={onCancel} accessibilityLabel={t("common.close")} />
          <Pressable style={styles.sheet} onPress={(e) => e.stopPropagation()}>
            <Text style={styles.title}>{title}</Text>
            <Input
              placeholder={placeholder}
              value={value}
              onChangeText={setValue}
              autoFocus
              onSubmitEditing={() => value.trim() && onConfirm(value.trim())}
            />
            <View style={styles.row}>
              <Button title={t("common.cancel")} variant="secondary" style={{ flex: 1 }} onPress={onCancel} />
              <Button
                title={confirm}
                style={{ flex: 1 }}
                onPress={() => value.trim() && onConfirm(value.trim())}
              />
            </View>
          </Pressable>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

function useStyles() {
  return useScaledStyleSheet((fs) => ({
    kavRoot: { flex: 1 },
    backdrop: {
      flex: 1,
      backgroundColor: "rgba(0,0,0,0.4)",
      justifyContent: "center",
      padding: spacing.xl,
    },
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
