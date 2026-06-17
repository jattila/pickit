import { ListItem } from "../types";
import { itemNameKey } from "./itemName";

/** Van-e már bejelölt (megvett) tétel ugyanilyen névvel a listán. */
export function isAlreadyCheckedOnList(name: string, items: ListItem[]): boolean {
  const key = itemNameKey(name);
  return items.some((i) => i.checked && itemNameKey(i.name) === key);
}

/** Van-e már tétel ugyanilyen névvel a listán (bejelölt vagy sem). */
export function isAlreadyOnList(name: string, items: ListItem[]): boolean {
  const key = itemNameKey(name);
  return items.some((i) => itemNameKey(i.name) === key);
}

/** Kedvencek elöl, mindkét csoportban hozzáadás sorrendben (order). */
export function sortListItemsByFavorite(
  items: ListItem[],
  isFavorite: (item: ListItem) => boolean
): ListItem[] {
  return [...items].sort((a, b) => {
    const af = isFavorite(a) ? 1 : 0;
    const bf = isFavorite(b) ? 1 : 0;
    if (af !== bf) return bf - af;
    return a.order - b.order;
  });
}
