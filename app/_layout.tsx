import React from "react";
import { View, ActivityIndicator, StyleSheet } from "react-native";
import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { AuthProvider, useAuth } from "../src/context/AuthContext";
import { FontScaleProvider } from "../src/context/FontScaleContext";
import { NetworkProvider } from "../src/context/NetworkContext";
import { NotConfigured } from "../src/components/NotConfigured";
import { OfflineBanner } from "../src/components/OfflineBanner";
import { Sentry } from "../src/config/sentry";
import { colors } from "../src/theme";

function RootNavigator() {
  const { configured, initializing } = useAuth();

  if (!configured) {
    return <NotConfigured />;
  }

  if (initializing) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  return (
    <View style={styles.root}>
      <View style={styles.stack}>
        <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: colors.bg } }}>
          <Stack.Screen name="index" />
          <Stack.Screen name="login" />
          <Stack.Screen name="setup" />
          <Stack.Screen name="(tabs)" />
          <Stack.Screen name="list/[id]" />
        </Stack>
      </View>
      <OfflineBanner />
    </View>
  );
}

function RootLayout() {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <NetworkProvider>
          <AuthProvider>
            <FontScaleProvider>
              <StatusBar style="dark" />
              <RootNavigator />
            </FontScaleProvider>
          </AuthProvider>
        </NetworkProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}

export default Sentry.wrap(RootLayout);

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
  stack: {
    flex: 1,
  },
  center: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.bg,
  },
});
