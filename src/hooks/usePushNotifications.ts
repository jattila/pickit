import { useEffect } from "react";
import { AppState, AppStateStatus } from "react-native";
import { useAuth } from "../context/AuthContext";
import { registerForPushNotifications } from "../lib/pushNotifications";

/** Push token regisztráció háztartás tagoknak (ha engedélyezve). */
export function usePushNotifications() {
  const { user, profile } = useAuth();

  useEffect(() => {
    const uid = user?.uid;
    const householdId = profile?.householdId;
    const enabled = profile?.notificationsEnabled !== false;

    if (!uid || !householdId || !enabled) return;

    const sync = () => {
      void registerForPushNotifications(uid);
    };

    sync();
    const sub = AppState.addEventListener("change", (state: AppStateStatus) => {
      if (state === "active") sync();
    });
    return () => sub.remove();
  }, [user?.uid, profile?.householdId, profile?.notificationsEnabled]);
}
