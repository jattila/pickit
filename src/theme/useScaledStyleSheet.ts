import { useMemo } from "react";
import { StyleSheet, type ImageStyle, type TextStyle, type ViewStyle } from "react-native";
import { useFontScale } from "../context/FontScaleContext";

type NamedStyles = Record<string, ViewStyle | TextStyle | ImageStyle>;

export function useScaledStyleSheet<T extends NamedStyles>(
  factory: (fs: (size: number) => number) => T
): T {
  const { scale } = useFontScale();
  // eslint-disable-next-line react-hooks/exhaustive-deps -- scale changes only with level
  return useMemo(() => StyleSheet.create(factory(scale)), [scale]);
}
