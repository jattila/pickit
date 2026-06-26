import { collection, addDoc, serverTimestamp } from "firebase/firestore";
import { db } from "../config/firebase";
import { ID } from "../types";

export type PushActivityType =
  | "list_created"
  | "list_renamed"
  | "list_archived"
  | "list_deleted"
  | "item_added"
  | "items_added"
  | "item_checked"
  | "item_unchecked"
  | "item_deleted"
  | "items_cleared";

export interface PushActivityPayload {
  type: PushActivityType;
  listName: string;
  itemName?: string;
  count?: number;
}

/** Összefoglaló push értesítéshez – nem blokkolja a fő műveletet hiba esetén. */
export async function logPushActivity(
  householdId: ID,
  actorUid: ID,
  actorName: string,
  payload: PushActivityPayload
): Promise<void> {
  try {
    await addDoc(collection(db, "households", householdId, "activity"), {
      ...payload,
      actorUid,
      actorName: actorName.trim() || "Valaki",
      createdAt: serverTimestamp(),
    });
  } catch (err) {
    console.warn("[PickIt] Push activity log failed:", err);
  }
}
