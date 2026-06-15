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
import { ListItem } from "../types";
import { formatItemNameInput } from "../lib/itemName";
import { colors, spacing, radius } from "../theme";
import { useScaledStyleSheet } from "../theme/useScaledStyleSheet";

interface Props {
  visible: boolean;
  item: ListItem | null;
  onCancel: () => void;
  onSave: (data: { name: string; quantity: string }) => void;
}

export function ItemEditModal({ visible, item, onCancel, onSave }: Props) {
  const [name, setName] = useState("");
  const [quantity, setQuantity] = useState("");

  useEffect(() => {
    if (visible && item) {
      setName(item.name);
      setQuantity(item.quantity ?? "");
    }
  }, [visible, item]);

  const save = () => {
    const trimmed = name.trim();
    if (!trimmed) return;
    onSave({ name: trimmed, quantity: quantity.trim() });
  };

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
            <Text style={styles.title}>Tétel szerkesztése</Text>
            <Input
              placeholder="Név"
              value={name}
              onChangeText={(text) => setName(formatItemNameInput(text))}
              autoFocus
              returnKeyType="next"
              autoCapitalize="none"
              autoCorrect={false}
            />
            <Input
              placeholder="Mennyiség (pl. 2 db, 1 kg)"
              value={quantity}
              onChangeText={setQuantity}
              returnKeyType="done"
              onSubmitEditing={save}
            />
            <View style={styles.row}>
              <Button title="Mégse" variant="secondary" style={{ flex: 1 }} onPress={onCancel} />
              <Button
                title="Mentés"
                style={{ flex: 1 }}
                disabled={!name.trim()}
                onPress={save}
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
