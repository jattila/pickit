import { useEffect } from "react";
import { router, type Href } from "expo-router";
import * as Notifications from "expo-notifications";

function navigateFromNotification(response: Notifications.NotificationResponse | null) {
  if (!response) return;
  const data = response.notification.request.content.data;
  const url = data?.url;
  if (typeof url === "string" && url.startsWith("/")) {
    router.push(url as Href);
  }
}

/** Push értesítés megnyitásakor navigál az appban (ne az Expo Go dev felületre). */
export function useNotificationNavigation() {
  useEffect(() => {
    const sub = Notifications.addNotificationResponseReceivedListener(navigateFromNotification);
    void Notifications.getLastNotificationResponseAsync().then(navigateFromNotification);
    return () => sub.remove();
  }, []);
}
