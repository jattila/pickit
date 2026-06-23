import { useEffect, useState } from "react";
import { Dimensions, Keyboard, Platform, type KeyboardEvent } from "react-native";

/**
 * Billentyűzet magassága (px). A alsó beviteli sáv pozicionálásához.
 */
export function useKeyboardHeight(): number {
  const [height, setHeight] = useState(0);

  useEffect(() => {
    const onShow = (event: KeyboardEvent) => {
      const { height: kbHeight, screenY } = event.endCoordinates;
      if (Platform.OS === "android") {
        const windowHeight = Dimensions.get("window").height;
        setHeight(Math.max(0, windowHeight - screenY));
        return;
      }
      setHeight(kbHeight);
    };
    const onHide = () => setHeight(0);

    const showEvent = Platform.OS === "ios" ? "keyboardWillShow" : "keyboardDidShow";
    const hideEvent = Platform.OS === "ios" ? "keyboardWillHide" : "keyboardDidHide";

    const showSub = Keyboard.addListener(showEvent, onShow);
    const hideSub = Keyboard.addListener(hideEvent, onHide);

    return () => {
      showSub.remove();
      hideSub.remove();
    };
  }, []);

  return height;
}
