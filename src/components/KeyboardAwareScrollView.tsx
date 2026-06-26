import React, { useEffect, useRef } from "react";
import {
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  ScrollViewProps,
  StyleProp,
  View,
  ViewStyle,
} from "react-native";
import { useKeyboardLayout } from "../hooks/useKeyboardHeight";
import { spacing } from "../theme";

function useAndroidKeyboardScroll(contentContainerStyle?: StyleProp<ViewStyle>) {
  const scrollRef = useRef<ScrollView>(null);
  const { keyboardHeight, keyboardVisible, layoutLockHeight } = useKeyboardLayout("scroll");
  const androidOpen = keyboardVisible && Platform.OS === "android";

  useEffect(() => {
    if (!androidOpen) return;
    const id = setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 50);
    return () => clearTimeout(id);
  }, [androidOpen, keyboardHeight]);

  return {
    scrollRef,
    layoutLockHeight,
    androidOpen,
    contentContainerStyle: [
      contentContainerStyle,
      androidOpen && {
        justifyContent: "flex-start" as const,
        paddingBottom: keyboardHeight + spacing.xl,
      },
    ],
  };
}

/** Teljes képernyős űrlapokhoz (bejelentkezés, setup). */
export function KeyboardAwareScrollView({
  children,
  style,
  contentContainerStyle,
  ...rest
}: ScrollViewProps) {
  const { scrollRef, layoutLockHeight, contentContainerStyle: mergedContent } =
    useAndroidKeyboardScroll(contentContainerStyle);

  return (
    <View style={[style, { flex: 1 }, layoutLockHeight != null && { height: layoutLockHeight }]}>
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        style={{ flex: 1 }}
      >
        <ScrollView
          ref={scrollRef}
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={mergedContent}
          {...rest}
        >
          {children}
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

/** Modális űrlapokhoz – a sheet a billentyűzet fölé görgethető. */
export function KeyboardAwareModalScroll({
  children,
  contentContainerStyle,
  ...rest
}: ScrollViewProps) {
  const { scrollRef, layoutLockHeight, androidOpen, contentContainerStyle: mergedContent } =
    useAndroidKeyboardScroll(contentContainerStyle);

  return (
    <View style={[{ flex: 1 }, layoutLockHeight != null && { height: layoutLockHeight }]}>
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        style={{ flex: 1 }}
      >
        <ScrollView
          ref={scrollRef}
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={[
            mergedContent,
            {
              flexGrow: 1,
              justifyContent: androidOpen ? ("flex-end" as const) : ("center" as const),
            },
          ]}
          {...rest}
        >
          {children}
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}
