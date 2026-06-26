import { useEffect, useRef } from "react";
import { useAuth } from "../context/AuthContext";
import { registerForPushNotifications } from "../lib/pushNotifications";

/** Push token regisztráció háztartás tagoknak (ha engedélyezve). */
export function usePushNotifications() {
  const { user, profile } = useAuth();
  const registeredRef = useRef(false);

  useEffect(() => {
    const uid = user?.uid;
    const householdId = profile?.householdId;
    const enabled = profile?.notificationsEnabled !== false;

    if (!uid || !householdId || !enabled) {
      registeredRef.current = false;
      return;
    }

    if (registeredRef.current) return;

    void registerForPushNotifications(uid).then((ok) => {
      registeredRef.current = ok;
    });
  }, [user?.uid, profile?.householdId, profile?.notificationsEnabled]);
}
