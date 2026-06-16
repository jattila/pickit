/** Bevásárlótétel név: trim, szóközök, kezdőbetű kisbetű. */
export function normalizeItemName(name: string): string {
  const trimmed = name.trim().replace(/\s+/g, " ");
  if (!trimmed) return trimmed;
  return trimmed.charAt(0).toLocaleLowerCase("hu") + trimmed.slice(1);
}

/** Összehasonlításhoz: normalizált név kisbetűsen. */
export function itemNameKey(name: string): string {
  return normalizeItemName(name).toLowerCase();
}

/** Beíráskor a kezdő karakter kisbetűsítése. */
export function formatItemNameInput(text: string): string {
  if (!text) return text;
  return text.charAt(0).toLocaleLowerCase("hu") + text.slice(1);
}

function formatCountQuantity(count: string, unit: string): string {
  const normalizedUnit = unit.replace(/\.$/i, "").toLowerCase().startsWith("darab")
    ? "darab"
    : "db";
  return `${count} ${normalizedUnit}`;
}

/** „fokhagyma 4 db” → { name: „fokhagyma”, quantity: „4 db” } */
export function parseItemNameAndQuantity(input: string): { name: string; quantity: string } {
  const trimmed = input.trim().replace(/\s+/g, " ");
  if (!trimmed) return { name: "", quantity: "" };

  const suffixMatch = trimmed.match(/^(.+?)\s+(\d+(?:[.,]\d+)?)\s*(db\.?|darab(?:ot)?)\.?$/iu);
  if (suffixMatch) {
    return {
      name: normalizeItemName(suffixMatch[1]),
      quantity: formatCountQuantity(suffixMatch[2], suffixMatch[3]),
    };
  }

  const prefixMatch = trimmed.match(/^(\d+(?:[.,]\d+)?)\s*(db\.?|darab(?:ot)?)\.?\s+(.+)$/iu);
  if (prefixMatch) {
    return {
      name: normalizeItemName(prefixMatch[3]),
      quantity: formatCountQuantity(prefixMatch[1], prefixMatch[2]),
    };
  }

  const leadingCountMatch = trimmed.match(/^(\d+(?:[.,]\d+)?)\s+(.+)$/u);
  if (leadingCountMatch) {
    return {
      name: normalizeItemName(leadingCountMatch[2]),
      quantity: `${leadingCountMatch[1]} db`,
    };
  }

  return { name: normalizeItemName(trimmed), quantity: "" };
}

/** Ha van külön mennyiség mező, az elsőbbséget élvez; különben a névből bontjuk ki. */
export function resolveItemInput(
  nameInput: string,
  quantityInput?: string
): { name: string; quantity: string } {
  const explicitQty = quantityInput?.trim() ?? "";
  if (explicitQty) {
    return { name: normalizeItemName(nameInput), quantity: explicitQty };
  }
  return parseItemNameAndQuantity(nameInput);
}
