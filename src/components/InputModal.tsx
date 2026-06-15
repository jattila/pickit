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
  confirmLabel = "Mentés",
  onCancel,
  onConfirm,
}: Props) {
  const [value, setValue] = useState(initialValue);

  useEffect(() => {
    if (visible) setValue(initialValue);
  }, [visible, initialValue]);

  const styles = useStyles();

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onCancel}>
      <View style={styles.backdrop}>
        <Pressable style={StyleSheet.absoluteFill} onPress={onCancel} accessibilityLabel="Bezárás" />
        <KeyboardAvoidingView
          behavior={Platform.OS === "ios" ? "padding" : undefined}
          style={styles.kav}
        >
          <View style={styles.sheet}>
            <Text style={styles.title}>{title}</Text>
            <Input
              placeholder={placeholder}
              value={value}
              onChangeText={setValue}
              autoFocus
              onSubmitEditing={() => value.trim() && onConfirm(value.trim())}
            />
            <View style={styles.row}>
              <Button title="Mégse" variant="secondary" style={{ flex: 1 }} onPress={onCancel} />
              <Button
                title={confirmLabel}
                style={{ flex: 1 }}
                onPress={() => value.trim() && onConfirm(value.trim())}
              />
            </View>
          </View>
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
    kav: { width: "100%" },
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
