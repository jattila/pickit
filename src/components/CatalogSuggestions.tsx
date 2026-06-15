import React, { useMemo } from "react";
import { View, Text, Pressable, ScrollView } from "react-native";
import { CatalogItem } from "../types";
import { itemNameKey } from "../lib/itemName";
import { colors, spacing } from "../theme";
import { useScaledStyleSheet } from "../theme/useScaledStyleSheet";

interface Props {
  query: string;
  catalog: CatalogItem[];
  existingNames: string[];
  onSelect: (item: CatalogItem) => void;
}

const MAX = 5;

export function CatalogSuggestions({ query, catalog, existingNames, onSelect }: Props) {
  const suggestions = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (q.length < 1) return [];
    const onList = new Set(existingNames);
    return catalog
      .filter((c) => !onList.has(itemNameKey(c.name)))
      .filter((c) => itemNameKey(c.name).includes(q))
      .slice(0, MAX);
  }, [query, catalog, existingNames]);

  const styles = useStyles();

  if (suggestions.length === 0) return null;

  return (
    <View style={styles.wrap}>
      <ScrollView
        keyboardShouldPersistTaps="always"
        nestedScrollEnabled
        showsVerticalScrollIndicator={suggestions.length > 3}
      >
        {suggestions.map((item) => (
          <Pressable
            key={item.id}
            style={({ pressed }) => [styles.row, pressed && styles.rowPressed]}
            onPress={() => onSelect(item)}
          >
            <Text style={styles.name} numberOfLines={1}>
              {item.name}
            </Text>
            {item.defaultQuantity ? (
              <Text style={styles.qty}>{item.defaultQuantity}</Text>
            ) : null}
          </Pressable>
        ))}
      </ScrollView>
    </View>
  );
}

function useStyles() {
  return useScaledStyleSheet((fs) => ({
    wrap: {
      maxHeight: 132,
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
      backgroundColor: colors.surface,
    },
    row: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      paddingVertical: spacing.sm,
      paddingHorizontal: spacing.md,
      gap: spacing.sm,
    },
    rowPressed: { backgroundColor: colors.primarySoft },
    name: { flex: 1, fontSize: fs(15), color: colors.text, fontWeight: "500" },
    qty: { fontSize: fs(13), color: colors.textMuted, fontWeight: "600" },
  }));
}
