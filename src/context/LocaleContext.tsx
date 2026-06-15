import React, {
  createContext,
  useCallback,
  useContext,
  useMemo,
  type ReactNode,
} from "react";
import { useAuth } from "./AuthContext";
import { updateUserLocale } from "../lib/firestore";
import { translate } from "../i18n/translate";
import {
  AppLocale,
  DEFAULT_LOCALE,
  LOCALE_LABELS,
  SUPPORTED_LOCALES,
  normalizeLocale,
} from "../i18n/types";

interface LocaleContextValue {
  locale: AppLocale;
  t: (key: string, params?: Record<string, string | number>) => string;
  setLocale: (locale: AppLocale) => Promise<void>;
  supportedLocales: AppLocale[];
  localeLabel: (locale: AppLocale) => string;
}

const defaultValue: LocaleContextValue = {
  locale: DEFAULT_LOCALE,
  t: (key, params) => translate(DEFAULT_LOCALE, key, params),
  setLocale: async () => {},
  supportedLocales: SUPPORTED_LOCALES,
  localeLabel: (l) => LOCALE_LABELS[l],
};

const LocaleContext = createContext<LocaleContextValue>(defaultValue);

export function LocaleProvider({ children }: { children: ReactNode }) {
  const { user, profile } = useAuth();
  const locale = normalizeLocale(profile?.locale);

  const setLocale = useCallback(
    async (next: AppLocale) => {
      if (!user || next === locale) return;
      await updateUserLocale(user.uid, next);
    },
    [user, locale]
  );

  const value = useMemo<LocaleContextValue>(
    () => ({
      locale,
      t: (key, params) => translate(locale, key, params),
      setLocale,
      supportedLocales: SUPPORTED_LOCALES,
      localeLabel: (l) => LOCALE_LABELS[l],
    }),
    [locale, setLocale]
  );

  return <LocaleContext.Provider value={value}>{children}</LocaleContext.Provider>;
}

export function useLocale(): LocaleContextValue {
  return useContext(LocaleContext);
}

/** Shortcut for translations. */
export function useTranslation() {
  const { t, locale, setLocale, supportedLocales, localeLabel } = useLocale();
  return { t, locale, setLocale, supportedLocales, localeLabel };
}
