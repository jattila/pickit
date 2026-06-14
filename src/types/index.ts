import { Timestamp } from "firebase/firestore";

export type ID = string;

/** Egy család / háztartás, amelyhez a tagok és listák tartoznak. */
export interface Household {
  id: ID;
  name: string;
  inviteCode: string;
  memberIds: ID[];
  members: Record<ID, HouseholdMember>;
  createdAt?: Timestamp;
  createdBy: ID;
}

export interface HouseholdMember {
  uid: ID;
  displayName: string;
  joinedAt?: Timestamp;
}

/** Egy bevásárlólista a háztartáson belül. */
export interface ShoppingList {
  id: ID;
  householdId: ID;
  name: string;
  archived: boolean;
  createdAt?: Timestamp;
  createdBy: ID;
  itemCount: number;
  checkedCount: number;
}

/** Egy tétel a listán. */
export interface ListItem {
  id: ID;
  name: string;
  quantity?: string;
  category?: string;
  note?: string;
  checked: boolean;
  /** Ki és mikor jelölte be (valós idejű visszajelzéshez). */
  checkedBy?: ID | null;
  checkedByName?: string | null;
  checkedAt?: Timestamp | null;
  createdAt?: Timestamp;
  createdBy: ID;
  order: number;
}

/** Korábban használt tétel a háztartás katalógusában (újraválogatáshoz). */
export interface CatalogItem {
  id: ID;
  name: string;
  category?: string;
  defaultQuantity?: string;
  /** Hányszor használták – gyakoriság szerinti rendezéshez. */
  useCount: number;
  lastUsedAt?: Timestamp;
}
