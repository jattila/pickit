import { Platform } from "react-native";
import * as Device from "expo-device";
import * as Notifications from "expo-notifications";
import Constants from "expo-constants";
import { arrayRemove, arrayUnion, doc, updateDoc } from "firebase/firestore";
import { db } from "../config/firebase";
import { ID } from "../types";

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

export async function requestPushPermissions(): Promise<boolean> {
  if (!Device.isDevice) return false;

  const { status: existing } = await Notifications.getPermissionsAsync();
  let status = existing;
  if (existing !== "granted") {
    const req = await Notifications.requestPermissionsAsync();
    status = req.status;
  }
  return status === "granted";
}

export async function getExpoPushToken(): Promise<string | null> {
  if (!Device.isDevice) return null;

  const projectId =
    Constants.expoConfig?.extra?.eas?.projectId ??
    Constants.easConfig?.projectId;
  if (!projectId) {
    console.warn("[PickIt] EAS projectId hiányzik – push token nem kérhető.");
    return null;
  }

  const token = await Notifications.getExpoPushTokenAsync({ projectId });
  return token.data;
}

export async function savePushToken(uid: ID, token: string): Promise<void> {
  await updateDoc(doc(db, "users", uid), {
    pushTokens: arrayUnion(token),
  });
}

export async function removePushToken(uid: ID, token: string): Promise<void> {
  await updateDoc(doc(db, "users", uid), {
    pushTokens: arrayRemove(token),
  });
}

export async function clearPushTokens(uid: ID): Promise<void> {
  await updateDoc(doc(db, "users", uid), { pushTokens: [] });
}

export async function setNotificationsEnabled(uid: ID, enabled: boolean): Promise<void> {
  await updateDoc(doc(db, "users", uid), { notificationsEnabled: enabled });
}

export async function registerForPushNotifications(uid: ID): Promise<boolean> {
  if (Platform.OS === "web") return false;

  const granted = await requestPushPermissions();
  if (!granted) return false;

  const token = await getExpoPushToken();
  if (!token) return false;

  await savePushToken(uid, token);
  return true;
}
