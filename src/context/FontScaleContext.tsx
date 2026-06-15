import React, {
  createContext,
  useCallback,
  useContext,
  useMemo,
  type ReactNode,
} from "react";
import { useAuth } from "./AuthContext";
import { updateUserFontScale } from "../lib/firestore";
import {
  clampFontScaleLevel,
  fontScaleLabel,
  MAX_FONT_SCALE_LEVEL,
  MIN_FONT_SCALE_LEVEL,
  scaleFontSize,
} from "../theme/fontScale";

interface FontScaleContextValue {
  level: number;
  label: string;
  scale: (size: number) => number;
  increase: () => Promise<void>;
  decrease: () => Promise<void>;
  canIncrease: boolean;
  canDecrease: boolean;
}

const defaultValue: FontScaleContextValue = {
  level: 0,
  label: "Normál",
  scale: (size) => size,
  increase: async () => {},
  decrease: async () => {},
  canIncrease: true,
  canDecrease: true,
};

const FontScaleContext = createContext<FontScaleContextValue>(defaultValue);

export function FontScaleProvider({ children }: { children: ReactNode }) {
  const { user, profile } = useAuth();
  const level = clampFontScaleLevel(profile?.fontScaleLevel ?? 0);

  const persist = useCallback(
    async (nextLevel: number) => {
      if (!user) return;
      await updateUserFontScale(user.uid, nextLevel);
    },
    [user]
  );

  const increase = useCallback(async () => {
    if (level >= MAX_FONT_SCALE_LEVEL) return;
    await persist(level + 1);
  }, [level, persist]);

  const decrease = useCallback(async () => {
    if (level <= MIN_FONT_SCALE_LEVEL) return;
    await persist(level - 1);
  }, [level, persist]);

  const value = useMemo<FontScaleContextValue>(
    () => ({
      level,
      label: fontScaleLabel(level),
      scale: (size: number) => scaleFontSize(size, level),
      increase,
      decrease,
      canIncrease: level < MAX_FONT_SCALE_LEVEL,
      canDecrease: level > MIN_FONT_SCALE_LEVEL,
    }),
    [level, increase, decrease]
  );

  return (
    <FontScaleContext.Provider value={value}>{children}</FontScaleContext.Provider>
  );
}

export function useFontScale(): FontScaleContextValue {
  return useContext(FontScaleContext);
}
