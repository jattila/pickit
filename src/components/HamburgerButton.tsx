import React from "react";
import { Pressable, Text, StyleSheet } from "react-native";
import { useMenu } from "../context/MenuContext";
import { useFontScale } from "../context/FontScaleContext";
import { useTranslation } from "../context/LocaleContext";
import { colors, spacing, radius } from "../theme";

export function HamburgerButton() {
  const { toggleMenu } = useMenu();
  const { scale: fs } = useFontScale();
  const { t } = useTranslation();

  return (
    <Pressable
      onPress={toggleMenu}
      hitSlop={10}
      style={({ pressed }) => [styles.btn, pressed && styles.pressed]}
      accessibilityLabel={t("menu.open")}
      accessibilityRole="button"
    >
      <Text style={[styles.icon, { fontSize: fs(22) }]}>☰</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  btn: {
    width: 40,
    height: 40,
    borderRadius: radius.sm,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.surfaceAlt,
  },
  pressed: { opacity: 0.7 },
  icon: { color: colors.text, fontWeight: "700", lineHeight: 24 },
});
