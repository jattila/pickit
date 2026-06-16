import React from "react";
import { Pressable, Text, StyleSheet } from "react-native";
import { useFontScale } from "../context/FontScaleContext";
import { useTranslation } from "../context/LocaleContext";
import { colors } from "../theme";

interface Props {
  favorite: boolean;
  onPress: () => void;
}

export function FavoriteButton({ favorite, onPress }: Props) {
  const { scale: fs } = useFontScale();
  const { t } = useTranslation();
  return (
    <Pressable
      onPress={onPress}
      hitSlop={8}
      style={({ pressed }) => [styles.btn, pressed && styles.pressed]}
      accessibilityLabel={favorite ? t("favorite.remove") : t("favorite.add")}
    >
      <Text
        style={[
          styles.icon,
          { fontSize: fs(18) },
          favorite ? styles.iconOn : styles.iconOff,
        ]}
      >
        {favorite ? "★" : "☆"}
      </Text>
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
  icon: { lineHeight: 20 },
  iconOn: { color: colors.accent },
  iconOff: { color: colors.textMuted, opacity: 0.45 },
});
