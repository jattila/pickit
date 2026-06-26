import { useEffect, useRef, useState } from "react";
import {
  Dimensions,
  Keyboard,
  Platform,
  type KeyboardEvent,
  type ScaledSize,
} from "react-native";

/** Android finomhangolás. */
export const ANDROID_KEYBOARD_EXTRA = 5;

const RESIZE_THRESHOLD = 72;

export type KeyboardLayoutMode =
  /** Görgethető űrlap – rögzített magasság + alsó padding. */
  | "scroll"
  /** Lebegő alsó sáv – egyszer számol, gépelés közben nem ugrál. */
  | "overlay";

export interface KeyboardLayout {
  keyboardHeight: number;
  keyboardVisible: boolean;
  layoutLockHeight: number | undefined;
  windowResizedForKeyboard: boolean;
  androidResizeSupplement: number;
}

function readWindowHeight(): number {
  return Dimensions.get("window").height;
}

function resolveAndroidKeyboardHeight(event: KeyboardEvent, windowHeight: number): number {
  const { height: kbHeight, screenY } = event.endCoordinates;
  let offset = kbHeight;

  if (screenY > windowHeight * 0.35) {
    offset = Math.max(offset, windowHeight - screenY);
  }

  if (offset <= 0) return 0;
  const maxKeyboard = Math.round(windowHeight * 0.52);
  return Math.min(offset + ANDROID_KEYBOARD_EXTRA, maxKeyboard);
}

export function useKeyboardLayout(
  mode: KeyboardLayoutMode = "scroll",
  enabled = true
): KeyboardLayout {
  const restWindowHeight = useRef(readWindowHeight());
  const keyboardOpenRef = useRef(false);
  const overlayLockedRef = useRef(false);
  const [keyboardHeight, setKeyboardHeight] = useState(0);
  const [layoutLockHeight, setLayoutLockHeight] = useState<number | undefined>();
  const [windowResizedForKeyboard, setWindowResizedForKeyboard] = useState(false);
  const [androidResizeSupplement, setAndroidResizeSupplement] = useState(0);

  useEffect(() => {
    if (!enabled) {
      keyboardOpenRef.current = false;
      overlayLockedRef.current = false;
      setKeyboardHeight(0);
      setLayoutLockHeight(undefined);
      setWindowResizedForKeyboard(false);
      setAndroidResizeSupplement(0);
      return;
    }

    const syncRestHeight = (size?: ScaledSize) => {
      restWindowHeight.current = size?.height ?? readWindowHeight();
    };

    syncRestHeight();

    const applyAndroidShow = (event: KeyboardEvent) => {
      const locked = restWindowHeight.current;
      const kbHeight = resolveAndroidKeyboardHeight(event, locked);
      if (kbHeight <= 0) return;

      keyboardOpenRef.current = true;

      if (mode === "overlay") {
        if (overlayLockedRef.current) return;

        const currentHeight = readWindowHeight();
        const shrink = Math.max(0, locked - currentHeight);
        const resized = shrink >= RESIZE_THRESHOLD;

        overlayLockedRef.current = true;
        setLayoutLockHeight(undefined);
        setWindowResizedForKeyboard(resized);
        if (resized) {
          setKeyboardHeight(0);
          setAndroidResizeSupplement(Math.max(0, kbHeight - shrink));
        } else {
          setKeyboardHeight(kbHeight);
          setAndroidResizeSupplement(0);
        }
        return;
      }

      setWindowResizedForKeyboard(false);
      setAndroidResizeSupplement(0);
      setLayoutLockHeight(locked);
      setKeyboardHeight(kbHeight);
    };

    const onShow = (event: KeyboardEvent) => {
      if (Platform.OS === "android") {
        requestAnimationFrame(() => applyAndroidShow(event));
        return;
      }
      keyboardOpenRef.current = true;
      setLayoutLockHeight(undefined);
      setWindowResizedForKeyboard(false);
      setAndroidResizeSupplement(0);
      setKeyboardHeight(event.endCoordinates.height);
    };

    const onHide = () => {
      keyboardOpenRef.current = false;
      overlayLockedRef.current = false;
      setKeyboardHeight(0);
      setLayoutLockHeight(undefined);
      setWindowResizedForKeyboard(false);
      setAndroidResizeSupplement(0);
      requestAnimationFrame(() => syncRestHeight());
    };

    const showEvent = Platform.OS === "ios" ? "keyboardWillShow" : "keyboardDidShow";
    const hideEvent = Platform.OS === "ios" ? "keyboardWillHide" : "keyboardDidHide";

    const showSub = Keyboard.addListener(showEvent, onShow);
    const hideSub = Keyboard.addListener(hideEvent, onHide);

    let frameSub: ReturnType<typeof Keyboard.addListener> | undefined;
    if (Platform.OS === "android" && mode === "scroll") {
      frameSub = Keyboard.addListener("keyboardDidChangeFrame", (event) => {
        requestAnimationFrame(() => applyAndroidShow(event));
      });
    }

    const dimSub = Dimensions.addEventListener("change", ({ window }) => {
      if (!keyboardOpenRef.current) {
        syncRestHeight(window);
      }
    });

    return () => {
      showSub.remove();
      hideSub.remove();
      frameSub?.remove();
      dimSub.remove();
    };
  }, [mode, enabled]);

  const keyboardVisible =
    keyboardHeight > 0 || windowResizedForKeyboard || androidResizeSupplement > 0;

  return {
    keyboardHeight,
    keyboardVisible,
    layoutLockHeight,
    windowResizedForKeyboard,
    androidResizeSupplement,
  };
}
