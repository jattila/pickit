import { Platform } from "react-native";
import { initializeApp, getApps, getApp, FirebaseApp } from "firebase/app";
import {
  initializeAuth,
  getAuth,
  // @ts-ignore - getReactNativePersistence nincs mindig a típusokban, de létezik
  getReactNativePersistence,
  Auth,
} from "firebase/auth";
import {
  initializeFirestore,
  getFirestore,
  persistentLocalCache,
  persistentSingleTabManager,
  Firestore,
} from "firebase/firestore";
import AsyncStorage from "@react-native-async-storage/async-storage";

/**
 * A Firebase konfiguráció a .env fájlból (EXPO_PUBLIC_ előtaggal) érkezik.
 * Lásd a .env.example fájlt és a README-t.
 */
const firebaseConfig = {
  apiKey: process.env.EXPO_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.EXPO_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.EXPO_PUBLIC_FIREBASE_APP_ID,
};

export const isFirebaseConfigured = Boolean(
  firebaseConfig.apiKey && firebaseConfig.projectId && firebaseConfig.appId
);

let app: FirebaseApp;
let auth: Auth;
let db: Firestore;

if (isFirebaseConfigured) {
  app = getApps().length ? getApp() : initializeApp(firebaseConfig);

  try {
    auth = initializeAuth(app, {
      persistence: getReactNativePersistence(AsyncStorage),
    });
  } catch {
    // Ha már inicializálva lett (pl. Fast Refresh), essünk vissza a getAuth-ra
    auth = getAuth(app);
  }

  try {
    db = initializeFirestore(app, {
      localCache: persistentLocalCache({
        tabManager: persistentSingleTabManager({}),
      }),
      // RN-en a WebSocket instabil lehet; long polling megbízhatóbb.
      ...(Platform.OS !== "web" ? { experimentalForceLongPolling: true } : {}),
    });
  } catch {
    // Fast Refresh után a Firestore már inicializálva lehet.
    db = getFirestore(app);
  }
}

export { app, auth, db };
