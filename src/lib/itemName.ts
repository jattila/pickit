/** Bevásárlótétel név: trim, szóközök, kezdőbetű kisbetű. */
export function normalizeItemName(name: string): string {
  const trimmed = name.trim().replace(/\s+/g, " ");
  if (!trimmed) return trimmed;
  return trimmed.charAt(0).toLocaleLowerCase("hu") + trimmed.slice(1);
}

/** Beíráskor a kezdő karakter kisbetűsítése. */
export function formatItemNameInput(text: string): string {
  if (!text) return text;
  return text.charAt(0).toLocaleLowerCase("hu") + text.slice(1);
}
