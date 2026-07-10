import { usePushNotifications } from "../hooks/usePushNotifications";
import { useNotificationNavigation } from "../hooks/useNotificationNavigation";

export function PushNotificationRegistrar() {
  usePushNotifications();
  useNotificationNavigation();
  return null;
}
