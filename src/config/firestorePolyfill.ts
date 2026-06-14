import { Platform } from "react-native";

/**
 * IndexedDB polyfill Firestore offline cache-hez React Native-en.
 * expo-sqlite (v16) + WebSQL adapter + indexeddbshim → Firebase persistentLocalCache.
 * Importálni kell MINDEN firebase/firestore import ELŐTT (lásd a gyökér index.js-t).
 */
if (Platform.OS !== "web") {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const ExpoSQLite = require("expo-sqlite");
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { createWebSQLWrapper } = require("expo-sqlite-legacy-adapter");
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const setGlobalVarsModule = require("indexeddbshim/dist/indexeddbshim-noninvasive.js");

  const WebSQLWrapper = createWebSQLWrapper(ExpoSQLite);
  const setGlobalVars =
    setGlobalVarsModule.default ?? setGlobalVarsModule;

  const globalObj = globalThis as typeof globalThis & {
    localStorage?: Storage;
    indexedDB?: IDBFactory;
    window?: typeof globalThis;
  };

  // Firebase és indexeddbshim a window/global indexedDB-t keresi.
  if (!globalObj.window) {
    // @ts-expect-error RN-ben nincs teljes Window objektum
    globalObj.window = globalObj;
  }

  if (!globalObj.localStorage) {
    const store: Record<string, string> = {};
    globalObj.localStorage = {
      get length() {
        return Object.keys(store).length;
      },
      key: (index: number) => Object.keys(store)[index] ?? null,
      getItem: (key: string) => store[key] ?? null,
      setItem: (key: string, value: string) => {
        store[key] = value;
      },
      removeItem: (key: string) => {
        delete store[key];
      },
      clear: () => {
        for (const key of Object.keys(store)) delete store[key];
      },
    } as Storage;
  }

  setGlobalVars(globalObj, {
    checkOrigin: false,
    win: { openDatabase: WebSQLWrapper.openDatabase.bind(WebSQLWrapper) },
  });
}
