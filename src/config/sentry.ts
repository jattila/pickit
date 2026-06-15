import * as Sentry from "@sentry/react-native";
import Constants from "expo-constants";

const dsn = process.env.EXPO_PUBLIC_SENTRY_DSN;

function initSentry() {
  if (!dsn) {
    if (__DEV__ && process.env.NODE_ENV !== "test") {
      console.warn("[PickIt] EXPO_PUBLIC_SENTRY_DSN nincs beállítva – hibakövetés kikapcsolva.");
    }
    return;
  }

  Sentry.init({
    dsn,
    debug: process.env.EXPO_PUBLIC_SENTRY_DEBUG === "1",
    environment: __DEV__ ? "development" : "production",
    release: Constants.expoConfig?.version
      ? `pickit@${Constants.expoConfig.version}`
      : undefined,
    enableAutoSessionTracking: true,
    tracesSampleRate: __DEV__ ? 0 : 0.2,
  });
}

initSentry();

export { Sentry };
