import React, { type ReactNode } from "react";
import { View, Text, StyleSheet } from "react-native";
import { HamburgerButton } from "./HamburgerButton";
import { useFontScale } from "../context/FontScaleContext";
import { colors, spacing } from "../theme";

interface Props {
  title: string;
  eyebrow?: string;
  subtitle?: string;
  right?: ReactNode;
}

export function ScreenHeader({ title, eyebrow, subtitle, right }: Props) {
  const { scale: fs } = useFontScale();

  return (
    <View style={styles.row}>
      <HamburgerButton />
      <View style={styles.textWrap}>
        {eyebrow ? (
          <Text style={[styles.eyebrow, { fontSize: fs(13) }]} numberOfLines={1}>
            {eyebrow}
          </Text>
        ) : null}
        <Text style={[styles.title, { fontSize: fs(28) }]} numberOfLines={1}>
          {title}
        </Text>
        {subtitle ? (
          <Text style={[styles.subtitle, { fontSize: fs(13) }]} numberOfLines={1}>
            {subtitle}
          </Text>
        ) : null}
      </View>
      {right ? <View style={styles.right}>{right}</View> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
    paddingBottom: spacing.sm,
  },
  textWrap: { flex: 1, minWidth: 0 },
  eyebrow: {
    fontWeight: "700",
    color: colors.primary,
    textTransform: "uppercase",
    marginBottom: 2,
  },
  title: { fontWeight: "800", color: colors.text },
  subtitle: { color: colors.textMuted, marginTop: 2 },
  right: { marginLeft: spacing.xs },
});
