import { db } from "../config/firebase";
import {
  collection,
  doc,
  addDoc,
  setDoc,
  getDoc,
  getDocs,
  updateDoc,
  deleteDoc,
  onSnapshot,
  query,
  where,
  orderBy,
  serverTimestamp,
  increment,
  writeBatch,
  arrayUnion,
  arrayRemove,
  deleteField,
  Unsubscribe,
} from "firebase/firestore";
import {
  Household,
  ShoppingList,
  ListItem,
  CatalogItem,
  ID,
} from "../types";
import { normalizeItemName } from "./itemName";
import { clampFontScaleLevel } from "../theme/fontScale";

/* ----------------------------- segédfüggvények ---------------------------- */

function generateInviteCode(): string {
  // Könnyen kimondható kód, összetéveszthető karakterek nélkül.
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let code = "";
  for (let i = 0; i < 6; i++) {
    code += chars[Math.floor(Math.random() * chars.length)];
  }
  return code;
}

function normalizeName(name: string): string {
  return name.trim().replace(/\s+/g, " ");
}

/* ------------------------------- felhasználó ------------------------------ */

export interface UserProfile {
  uid: ID;
  displayName: string;
  householdId: ID | null;
  fontScaleLevel?: number;
}

export async function getUserProfile(uid: ID): Promise<UserProfile | null> {
  const snap = await getDoc(doc(db, "users", uid));
  if (!snap.exists()) return null;
  return { uid, ...(snap.data() as Omit<UserProfile, "uid">) };
}

export function subscribeUserProfile(
  uid: ID,
  cb: (profile: UserProfile | null) => void
): Unsubscribe {
  return onSnapshot(doc(db, "users", uid), (snap) => {
    if (!snap.exists()) {
      cb(null);
      return;
    }
    cb({ uid, ...(snap.data() as Omit<UserProfile, "uid">) });
  });
}

export async function ensureUserProfile(
  uid: ID,
  displayName: string
): Promise<void> {
  const ref = doc(db, "users", uid);
  const snap = await getDoc(ref);
  if (!snap.exists()) {
    await setDoc(ref, { displayName, householdId: null, fontScaleLevel: 0 });
  } else if (displayName) {
    await updateDoc(ref, { displayName });
  }
}

export async function updateUserFontScale(uid: ID, fontScaleLevel: number): Promise<void> {
  await updateDoc(doc(db, "users", uid), {
    fontScaleLevel: clampFontScaleLevel(fontScaleLevel),
  });
}

/* -------------------------------- háztartás ------------------------------- */

/** Egyedi meghívó kód foglalása az inviteCodes gyűjteményben. */
async function reserveInviteCode(): Promise<string> {
  for (let i = 0; i < 8; i++) {
    const code = generateInviteCode();
    const snap = await getDoc(doc(db, "inviteCodes", code));
    if (!snap.exists()) return code;
  }
  // Rendkívül valószínűtlen ütközés esetén hosszabb kód.
  return generateInviteCode() + generateInviteCode().slice(0, 2);
}

export async function createHousehold(
  uid: ID,
  displayName: string,
  householdName: string
): Promise<ID> {
  const inviteCode = await reserveInviteCode();
  const member = { uid, displayName, joinedAt: serverTimestamp() };
  const householdRef = doc(collection(db, "households"));

  // 1) Háztartás + saját profil atomikusan.
  const batch = writeBatch(db);
  batch.set(householdRef, {
    name: normalizeName(householdName),
    inviteCode,
    memberIds: [uid],
    members: { [uid]: member },
    createdBy: uid,
    createdAt: serverTimestamp(),
  });
  batch.set(
    doc(db, "users", uid),
    { displayName, householdId: householdRef.id },
    { merge: true }
  );
  await batch.commit();

  // 2) Meghívó kód → háztartás párosítás. A szabályok szerint ehhez a usernek
  //    már tagnak kell lennie, ezért a háztartás létrehozása UTÁN írjuk.
  await setDoc(doc(db, "inviteCodes", inviteCode), {
    householdId: householdRef.id,
    createdAt: serverTimestamp(),
  });

  return householdRef.id;
}

export async function joinHousehold(
  uid: ID,
  displayName: string,
  inviteCode: string
): Promise<ID> {
  const code = inviteCode.trim().toUpperCase();

  const codeSnap = await getDoc(doc(db, "inviteCodes", code));
  if (!codeSnap.exists()) {
    throw new Error("Nincs ilyen meghívó kód.");
  }
  const householdId = codeSnap.data().householdId as ID;
  if (!householdId) {
    throw new Error("Érvénytelen meghívó kód.");
  }

  const member = { uid, displayName, joinedAt: serverTimestamp() };

  // Felvesszük magunkat a háztartásba, és beállítjuk a profilunkat – atomikusan.
  const batch = writeBatch(db);
  batch.update(doc(db, "households", householdId), {
    [`members.${uid}`]: member,
    memberIds: arrayUnion(uid),
  });
  batch.set(
    doc(db, "users", uid),
    { displayName, householdId },
    { merge: true }
  );
  await batch.commit();

  return householdId;
}

export async function leaveHousehold(uid: ID, householdId: ID): Promise<void> {
  const batch = writeBatch(db);
  batch.update(doc(db, "households", householdId), {
    [`members.${uid}`]: deleteField(),
    memberIds: arrayRemove(uid),
  });
  batch.update(doc(db, "users", uid), { householdId: null });
  await batch.commit();
}

export function subscribeHousehold(
  householdId: ID,
  cb: (household: Household | null) => void
): Unsubscribe {
  return onSnapshot(
    doc(db, "households", householdId),
    (snap) => {
      if (!snap.exists()) {
        cb(null);
        return;
      }
      cb({ id: snap.id, ...(snap.data() as Omit<Household, "id">) });
    },
    // Pl. kilépés után már nincs olvasási jogunk – kezeljük csendben.
    () => cb(null)
  );
}

/* --------------------------------- listák -------------------------------- */

function listsCol(householdId: ID) {
  return collection(db, "households", householdId, "lists");
}

export function subscribeLists(
  householdId: ID,
  cb: (lists: ShoppingList[]) => void
): Unsubscribe {
  const q = query(listsCol(householdId), orderBy("createdAt", "desc"));
  return onSnapshot(q, (snap) => {
    const lists = snap.docs.map((d) => ({
      id: d.id,
      ...(d.data() as Omit<ShoppingList, "id">),
    }));
    cb(lists);
  });
}

export function subscribeList(
  householdId: ID,
  listId: ID,
  cb: (list: ShoppingList | null) => void
): Unsubscribe {
  return onSnapshot(doc(listsCol(householdId), listId), (snap) => {
    if (!snap.exists()) {
      cb(null);
      return;
    }
    cb({ id: snap.id, ...(snap.data() as Omit<ShoppingList, "id">) });
  });
}

export async function createList(
  householdId: ID,
  uid: ID,
  name: string
): Promise<ID> {
  const ref = await addDoc(listsCol(householdId), {
    householdId,
    name: normalizeName(name) || "Bevásárlólista",
    archived: false,
    createdBy: uid,
    createdAt: serverTimestamp(),
    itemCount: 0,
    checkedCount: 0,
  });
  return ref.id;
}

export async function renameList(
  householdId: ID,
  listId: ID,
  name: string
): Promise<void> {
  await updateDoc(doc(listsCol(householdId), listId), {
    name: normalizeName(name),
  });
}

export async function setListArchived(
  householdId: ID,
  listId: ID,
  archived: boolean
): Promise<void> {
  await updateDoc(doc(listsCol(householdId), listId), { archived });
}

export async function deleteList(
  householdId: ID,
  listId: ID
): Promise<void> {
  const itemsSnap = await getDocs(
    collection(listsCol(householdId), listId, "items")
  );
  const batch = writeBatch(db);
  itemsSnap.forEach((d) => batch.delete(d.ref));
  batch.delete(doc(listsCol(householdId), listId));
  await batch.commit();
}

/* --------------------------------- tételek ------------------------------- */

function itemsCol(householdId: ID, listId: ID) {
  return collection(db, "households", householdId, "lists", listId, "items");
}

function catalogCol(householdId: ID) {
  return collection(db, "households", householdId, "catalog");
}

/** Determinisztikus dokumentum-azonosító a névből, hogy ne legyen duplikátum. */
function catalogKey(name: string): string {
  return normalizeItemName(name)
    .toLowerCase()
    .replace(/[^a-z0-9áéíóöőúüű]+/gi, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80) || "item";
}

function catalogUpsertFields(data: {
  name: string;
  category?: string;
  defaultQuantity?: string;
}): Record<string, unknown> {
  const name = normalizeItemName(data.name);
  const payload: Record<string, unknown> = {
    name,
    useCount: increment(1),
    lastUsedAt: serverTimestamp(),
  };
  const category = data.category?.trim();
  const quantity = data.defaultQuantity?.trim();
  if (category) payload.category = category;
  if (quantity) payload.defaultQuantity = quantity;
  return payload;
}

export function subscribeItems(
  householdId: ID,
  listId: ID,
  cb: (items: ListItem[]) => void
): Unsubscribe {
  const q = query(itemsCol(householdId, listId), orderBy("order", "asc"));
  return onSnapshot(q, (snap) => {
    const items = snap.docs.map((d) => ({
      id: d.id,
      ...(d.data() as Omit<ListItem, "id">),
    }));
    cb(items);
  });
}

export interface NewItemInput {
  name: string;
  quantity?: string;
  category?: string;
  note?: string;
}

export async function addItem(
  householdId: ID,
  listId: ID,
  uid: ID,
  input: NewItemInput
): Promise<void> {
  const name = normalizeItemName(input.name);
  if (!name) return;

  const batch = writeBatch(db);
  const itemRef = doc(itemsCol(householdId, listId));
  batch.set(itemRef, {
    name,
    quantity: input.quantity?.trim() || "",
    category: input.category?.trim() || "",
    note: input.note?.trim() || "",
    checked: false,
    checkedBy: null,
    checkedByName: null,
    checkedAt: null,
    createdBy: uid,
    createdAt: serverTimestamp(),
    order: Date.now(),
  });
  batch.update(doc(listsCol(householdId), listId), { itemCount: increment(1) });
  batch.set(
    doc(catalogCol(householdId), catalogKey(name)),
    catalogUpsertFields({ name, category: input.category, defaultQuantity: input.quantity }),
    { merge: true }
  );
  await batch.commit();
}

export async function toggleItem(
  householdId: ID,
  listId: ID,
  item: ListItem,
  uid: ID,
  displayName: string
): Promise<void> {
  const checked = !item.checked;
  const batch = writeBatch(db);
  batch.update(doc(itemsCol(householdId, listId), item.id), {
    checked,
    checkedBy: checked ? uid : null,
    checkedByName: checked ? displayName : null,
    checkedAt: checked ? serverTimestamp() : null,
  });
  batch.update(doc(listsCol(householdId), listId), {
    checkedCount: increment(checked ? 1 : -1),
  });
  await batch.commit();
}

export async function updateItem(
  householdId: ID,
  listId: ID,
  item: ListItem,
  data: Partial<NewItemInput>
): Promise<void> {
  const newName =
    data.name !== undefined ? normalizeItemName(data.name) : item.name;
  const newQuantity =
    data.quantity !== undefined ? data.quantity.trim() : item.quantity ?? "";
  const newCategory =
    data.category !== undefined ? data.category.trim() : item.category ?? "";

  const payload: Record<string, unknown> = {};
  if (data.name !== undefined) payload.name = newName;
  if (data.quantity !== undefined) payload.quantity = newQuantity;
  if (data.category !== undefined) payload.category = newCategory;
  if (data.note !== undefined) payload.note = data.note.trim();

  const syncCatalog =
    (data.name !== undefined && newName !== item.name) ||
    (data.quantity !== undefined && newQuantity !== (item.quantity ?? "")) ||
    (data.category !== undefined && newCategory !== (item.category ?? ""));

  if (!syncCatalog) {
    if (Object.keys(payload).length === 0) return;
    await updateDoc(doc(itemsCol(householdId, listId), item.id), payload);
    return;
  }

  const batch = writeBatch(db);
  batch.update(doc(itemsCol(householdId, listId), item.id), payload);

  const catalogPayload: Record<string, unknown> = {
    name: newName,
    defaultQuantity: newQuantity,
  };
  if (newCategory) catalogPayload.category = newCategory;

  const catalogRef = doc(catalogCol(householdId), catalogKey(newName));
  const catalogSnap = await getDoc(catalogRef);
  if (catalogSnap.exists()) {
    batch.update(catalogRef, catalogPayload);
  } else {
    batch.set(catalogRef, { ...catalogPayload, useCount: 1 });
  }

  await batch.commit();
}

export async function deleteItem(
  householdId: ID,
  listId: ID,
  item: ListItem
): Promise<void> {
  const batch = writeBatch(db);
  batch.delete(doc(itemsCol(householdId, listId), item.id));
  batch.update(doc(listsCol(householdId), listId), {
    itemCount: increment(-1),
    checkedCount: increment(item.checked ? -1 : 0),
  });
  await batch.commit();
}

/** Bejelölt tételek eltávolítása (vásárlás vége). */
export async function clearCheckedItems(
  householdId: ID,
  listId: ID
): Promise<void> {
  const q = query(itemsCol(householdId, listId), where("checked", "==", true));
  const snap = await getDocs(q);
  if (snap.empty) return;
  const batch = writeBatch(db);
  snap.forEach((d) => batch.delete(d.ref));
  batch.update(doc(listsCol(householdId), listId), {
    itemCount: increment(-snap.size),
    checkedCount: increment(-snap.size),
  });
  await batch.commit();
}

/* -------------------------------- katalógus ------------------------------ */

export function subscribeCatalog(
  householdId: ID,
  cb: (items: CatalogItem[]) => void
): Unsubscribe {
  const q = query(catalogCol(householdId));
  return onSnapshot(
    q,
    (snap) => {
      const items = snap.docs
        .map((d) => ({
          id: d.id,
          ...(d.data() as Omit<CatalogItem, "id">),
        }))
        .sort((a, b) =>
          a.name.localeCompare(b.name, "hu", { sensitivity: "base" })
        );
      cb(items);
    },
    (err) => {
      console.warn("[PickIt] Katalógus betöltése sikertelen:", err.message);
      cb([]);
    }
  );
}

export async function upsertCatalogItem(
  householdId: ID,
  data: { name: string; category?: string; defaultQuantity?: string }
): Promise<void> {
  const name = normalizeItemName(data.name);
  if (!name) return;
  await setDoc(
    doc(catalogCol(householdId), catalogKey(name)),
    catalogUpsertFields(data),
    { merge: true }
  );
}

export async function deleteCatalogItem(
  householdId: ID,
  catalogId: ID
): Promise<void> {
  await deleteDoc(doc(catalogCol(householdId), catalogId));
}

export async function updateCatalogItem(
  householdId: ID,
  item: CatalogItem,
  data: { name: string; defaultQuantity?: string; category?: string }
): Promise<void> {
  const name = normalizeItemName(data.name);
  if (!name) return;

  const newKey = catalogKey(name);
  const payload = {
    name,
    defaultQuantity: (data.defaultQuantity ?? item.defaultQuantity ?? "").trim(),
    category: (data.category ?? item.category ?? "").trim(),
  };

  if (newKey === item.id) {
    await updateDoc(doc(catalogCol(householdId), item.id), payload);
    return;
  }

  const batch = writeBatch(db);
  batch.delete(doc(catalogCol(householdId), item.id));
  batch.set(doc(catalogCol(householdId), newKey), {
    ...payload,
    useCount: item.useCount,
    lastUsedAt: item.lastUsedAt ?? serverTimestamp(),
  });
  await batch.commit();
}

/** Több katalógustételt egyszerre hozzáad egy listához. */
export async function addItemsFromCatalog(
  householdId: ID,
  listId: ID,
  uid: ID,
  catalogItems: CatalogItem[]
): Promise<void> {
  if (catalogItems.length === 0) return;
  const batch = writeBatch(db);
  const base = Date.now();
  catalogItems.forEach((c, i) => {
    const itemRef = doc(itemsCol(householdId, listId));
    batch.set(itemRef, {
      name: c.name,
      quantity: c.defaultQuantity || "",
      category: c.category || "",
      note: "",
      checked: false,
      checkedBy: null,
      checkedByName: null,
      checkedAt: null,
      createdBy: uid,
      createdAt: serverTimestamp(),
      order: base + i,
    });
    const catRef = doc(catalogCol(householdId), c.id);
    batch.update(catRef, {
      useCount: increment(1),
      lastUsedAt: serverTimestamp(),
    });
  });
  batch.update(doc(listsCol(householdId), listId), {
    itemCount: increment(catalogItems.length),
  });
  await batch.commit();
}
