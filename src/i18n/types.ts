export type AppLocale = "hu" | "en" | "de";

export const DEFAULT_LOCALE: AppLocale = "hu";

export const SUPPORTED_LOCALES: AppLocale[] = ["hu", "en", "de"];

export const LOCALE_LABELS: Record<AppLocale, string> = {
  hu: "Magyar",
  en: "English",
  de: "Deutsch",
};

export function normalizeLocale(value: unknown): AppLocale {
  if (value === "en" || value === "de" || value === "hu") return value;
  return DEFAULT_LOCALE;
}
