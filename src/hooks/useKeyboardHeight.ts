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

export interface KeyboardLayout {
  keyboardHeight: number;
  keyboardVisible: boolean;
  /** Android: billentyűzetnyitás előtti ablakmagasság – dupla resize ellen. */
  layoutLockHeight: number | undefined;
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

/**
 * Billentyűzet-layout.
 * Android: rögzített konténermagasság + teljes billentyűzet-emelés (resize-től függetlenül).
 */
export function useKeyboardLayout(): KeyboardLayout {
  const restWindowHeight = useRef(readWindowHeight());
  const keyboardOpenRef = useRef(false);
  const [keyboardHeight, setKeyboardHeight] = useState(0);
  const [layoutLockHeight, setLayoutLockHeight] = useState<number | undefined>();

  useEffect(() => {
    const syncRestHeight = (size?: ScaledSize) => {
      restWindowHeight.current = size?.height ?? readWindowHeight();
    };

    const applyAndroidShow = (event: KeyboardEvent) => {
      const locked = restWindowHeight.current;
      const height = resolveAndroidKeyboardHeight(event, locked);
      if (height <= 0) return;

      keyboardOpenRef.current = true;
      setLayoutLockHeight(locked);
      setKeyboardHeight(height);
    };

    const onShow = (event: KeyboardEvent) => {
      if (Platform.OS === "android") {
        applyAndroidShow(event);
        return;
      }
      keyboardOpenRef.current = true;
      setLayoutLockHeight(undefined);
      setKeyboardHeight(event.endCoordinates.height);
    };

    const onHide = () => {
      keyboardOpenRef.current = false;
      setKeyboardHeight(0);
      setLayoutLockHeight(undefined);
      requestAnimationFrame(() => syncRestHeight());
    };

    const showEvent = Platform.OS === "ios" ? "keyboardWillShow" : "keyboardDidShow";
    const hideEvent = Platform.OS === "ios" ? "keyboardWillHide" : "keyboardDidHide";

    const showSub = Keyboard.addListener(showEvent, onShow);
    const hideSub = Keyboard.addListener(hideEvent, onHide);

    let frameSub: ReturnType<typeof Keyboard.addListener> | undefined;
    if (Platform.OS === "android") {
      frameSub = Keyboard.addListener("keyboardDidChangeFrame", applyAndroidShow);
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
  }, []);

  return {
    keyboardHeight,
    keyboardVisible: keyboardHeight > 0,
    layoutLockHeight,
  };
}
