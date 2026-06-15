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
