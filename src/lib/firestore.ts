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
    await setDoc(ref, { displayName, householdId: null });
  } else if (displayName) {
    await updateDoc(ref, { displayName });
  }
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
  const name = normalizeName(input.name);
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
  await batch.commit();

  // Katalógus frissítése (újraválogatáshoz). Ne blokkolja a hozzáadást.
  void upsertCatalogItem(householdId, { name, category: input.category, defaultQuantity: input.quantity });
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
  itemId: ID,
  data: Partial<NewItemInput>
): Promise<void> {
  const payload: Record<string, unknown> = {};
  if (data.name !== undefined) payload.name = normalizeName(data.name);
  if (data.quantity !== undefined) payload.quantity = data.quantity.trim();
  if (data.category !== undefined) payload.category = data.category.trim();
  if (data.note !== undefined) payload.note = data.note.trim();
  await updateDoc(doc(itemsCol(householdId, listId), itemId), payload);
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

function catalogCol(householdId: ID) {
  return collection(db, "households", householdId, "catalog");
}

export function subscribeCatalog(
  householdId: ID,
  cb: (items: CatalogItem[]) => void
): Unsubscribe {
  const q = query(catalogCol(householdId), orderBy("useCount", "desc"));
  return onSnapshot(q, (snap) => {
    const items = snap.docs.map((d) => ({
      id: d.id,
      ...(d.data() as Omit<CatalogItem, "id">),
    }));
    cb(items);
  });
}

/** Determinisztikus dokumentum-azonosító a névből, hogy ne legyen duplikátum. */
function catalogKey(name: string): string {
  return normalizeName(name)
    .toLowerCase()
    .replace(/[^a-z0-9áéíóöőúüű]+/gi, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80) || "item";
}

export async function upsertCatalogItem(
  householdId: ID,
  data: { name: string; category?: string; defaultQuantity?: string }
): Promise<void> {
  const name = normalizeName(data.name);
  if (!name) return;
  const ref = doc(catalogCol(householdId), catalogKey(name));
  const snap = await getDoc(ref);
  if (snap.exists()) {
    await updateDoc(ref, {
      useCount: increment(1),
      lastUsedAt: serverTimestamp(),
      ...(data.category ? { category: data.category.trim() } : {}),
      ...(data.defaultQuantity ? { defaultQuantity: data.defaultQuantity.trim() } : {}),
    });
  } else {
    await setDoc(ref, {
      name,
      category: data.category?.trim() || "",
      defaultQuantity: data.defaultQuantity?.trim() || "",
      useCount: 1,
      lastUsedAt: serverTimestamp(),
    });
  }
}

export async function deleteCatalogItem(
  householdId: ID,
  catalogId: ID
): Promise<void> {
  await deleteDoc(doc(catalogCol(householdId), catalogId));
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
