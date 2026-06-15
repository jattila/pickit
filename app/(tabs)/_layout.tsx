import React from "react";
import { Text } from "react-native";
import { Redirect, Tabs } from "expo-router";
import { useAuth } from "../../src/context/AuthContext";
import { useFontScale } from "../../src/context/FontScaleContext";
import { colors } from "../../src/theme";

function TabIcon({ emoji, focused }: { emoji: string; focused: boolean }) {
  const { scale: fs } = useFontScale();
  return <Text style={{ fontSize: fs(22), opacity: focused ? 1 : 0.5 }}>{emoji}</Text>;
}

export default function TabsLayout() {
  const { user } = useAuth();
  const { scale: fs } = useFontScale();

  if (!user) {
    return <Redirect href="/login" />;
  }

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.textMuted,
        tabBarStyle: {
          backgroundColor: colors.surface,
          borderTopColor: colors.border,
          height: 88,
          paddingTop: 8,
        },
        tabBarLabelStyle: { fontSize: fs(12), fontWeight: "600" },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: "Listák",
          tabBarIcon: ({ focused }) => <TabIcon emoji="📝" focused={focused} />,
        }}
      />
      <Tabs.Screen
        name="catalog"
        options={{
          title: "Katalógus",
          tabBarIcon: ({ focused }) => <TabIcon emoji="🗂️" focused={focused} />,
        }}
      />
      <Tabs.Screen
        name="settings"
        options={{
          title: "Beállítások",
          tabBarIcon: ({ focused }) => <TabIcon emoji="⚙️" focused={focused} />,
        }}
      />
    </Tabs>
  );
}
