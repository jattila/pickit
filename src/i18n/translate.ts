import { hu } from "./locales/hu";
import { en } from "./locales/en";
import { de } from "./locales/de";
import { AppLocale, DEFAULT_LOCALE } from "./types";

export type TranslationTree = typeof hu;

const dictionaries: Record<AppLocale, TranslationTree> = { hu, en, de };

function getPath(obj: Record<string, unknown>, path: string): string | undefined {
  const parts = path.split(".");
  let cur: unknown = obj;
  for (const part of parts) {
    if (cur == null || typeof cur !== "object") return undefined;
    cur = (cur as Record<string, unknown>)[part];
  }
  return typeof cur === "string" ? cur : undefined;
}

export function translate(
  locale: AppLocale,
  key: string,
  params?: Record<string, string | number>
): string {
  let text =
    getPath(dictionaries[locale] as unknown as Record<string, unknown>, key) ??
    getPath(dictionaries[DEFAULT_LOCALE] as unknown as Record<string, unknown>, key) ??
    key;

  if (params) {
    for (const [k, v] of Object.entries(params)) {
      text = text.replace(new RegExp(`{{${k}}}`, "g"), String(v));
    }
  }
  return text;
}
