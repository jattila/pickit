import React from "react";
import { Pressable, Text, StyleSheet } from "react-native";
import { useFontScale } from "../context/FontScaleContext";

/** Apró, halvány szerkesztés gomb – kiegészíti a hosszú nyomásos menüt. */
export function EditIconButton({ onPress }: { onPress: () => void }) {
  const { scale: fs } = useFontScale();
  return (
    <Pressable
      onPress={onPress}
      hitSlop={8}
      style={({ pressed }) => [styles.btn, pressed && styles.pressed]}
      accessibilityLabel="Szerkesztés"
    >
      <Text style={[styles.icon, { fontSize: fs(13) }]}>✏️</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  btn: {
    width: 28,
    height: 28,
    alignItems: "center",
    justifyContent: "center",
  },
  pressed: { opacity: 0.5 },
  icon: { opacity: 0.32 },
});
