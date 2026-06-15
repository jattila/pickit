import React from "react";
import { View, Text } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useNetwork } from "../context/NetworkContext";
import { colors, spacing, radius } from "../theme";
import { useScaledStyleSheet } from "../theme/useScaledStyleSheet";

/**
 * Offline állapot jelzése – overlay a képernyő tetején, nem zsugorítja a tartalmat.
 * A képernyők a useOfflineBannerInset() hookkal igazíthatók.
 */
export function OfflineBanner() {
  const { isOffline } = useNetwork();
  const insets = useSafeAreaInsets();
  const styles = useStyles();

  if (!isOffline) return null;

  return (
    <View
      style={[styles.wrap, { paddingTop: insets.top + spacing.xs }]}
      pointerEvents="none"
    >
      <View style={styles.banner}>
        <Text style={styles.emoji}>📡</Text>
        <View style={{ flex: 1 }}>
          <Text style={styles.title}>Offline mód</Text>
          <Text style={styles.sub}>
            A listák a telefonon maradnak. Szinkronizálás, amint van internet.
          </Text>
        </View>
      </View>
    </View>
  );
}

function useStyles() {
  return useScaledStyleSheet((fs) => ({
    wrap: {
      position: "absolute",
      top: 0,
      left: 0,
      right: 0,
      zIndex: 100,
    },
    banner: {
      flexDirection: "row",
      alignItems: "center",
      gap: spacing.md,
      backgroundColor: "#E8EEF5",
      borderRadius: radius.md,
      paddingVertical: spacing.md,
      paddingHorizontal: spacing.lg,
      marginHorizontal: spacing.lg,
      marginBottom: spacing.sm,
    },
    emoji: { fontSize: fs(22) },
    title: { fontSize: fs(14), fontWeight: "700", color: "#3D4F66" },
    sub: { fontSize: fs(12.5), color: "#3D4F66", lineHeight: fs(17), marginTop: 1 },
  }));
}
