import { Household, ID, HouseholdMember } from "../types";

export function isHouseholdAdmin(household: Household | null, uid: ID | undefined): boolean {
  return !!household && !!uid && household.createdBy === uid;
}

export function isMemberSuspended(household: Household | null, uid: ID | undefined): boolean {
  if (!household || !uid) return false;
  return (household.suspendedMemberIds ?? []).includes(uid);
}

export function isActiveMember(household: Household | null, uid: ID | undefined): boolean {
  if (!household || !uid) return false;
  return household.memberIds.includes(uid) && !isMemberSuspended(household, uid);
}

export function normalizeMemberName(name: string): string {
  return name.trim().toLocaleLowerCase("hu");
}

/** Azon nevek, amelyekből egynél több tag van a családban. */
export function duplicateMemberNameKeys(members: HouseholdMember[]): Set<string> {
  const counts = new Map<string, number>();
  for (const m of members) {
    const key = normalizeMemberName(m.displayName || "?");
    counts.set(key, (counts.get(key) ?? 0) + 1);
  }
  return new Set(
    [...counts.entries()].filter(([, count]) => count > 1).map(([key]) => key)
  );
}

export function memberEmailLabel(
  member: HouseholdMember,
  selfUid: ID | undefined,
  selfEmail: string | null | undefined,
  coMemberEmails?: Record<ID, string>
): string | null {
  const stored = member.email?.trim();
  if (stored) return stored;
  const fromProfile = coMemberEmails?.[member.uid]?.trim();
  if (fromProfile) return fromProfile;
  if (member.uid === selfUid && selfEmail?.trim()) return selfEmail.trim();
  return null;
}
