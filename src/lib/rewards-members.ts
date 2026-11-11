// Pure helpers for the Rewards page (members list + points history).
import { matchesQuery } from "@/lib/list-utils";

/** 100 points = $5 off (same as the rewards functions). */
export const POINTS_PER_REWARD = 100;
export const REWARD_DOLLARS = 5;

/** Dollar value of a balance in whole rewards: 340 points → $15. */
export function pointsToDollars(points: number): number {
  return Math.floor(Math.max(0, points) / POINTS_PER_REWARD) * REWARD_DOLLARS;
}

export type MemberSort = "points_desc" | "joined_desc" | "joined_asc" | "name_asc";

export const DEFAULT_MEMBER_SORT: MemberSort = "joined_desc";

export const MEMBER_SORT_OPTIONS: { value: MemberSort; label: string }[] = [
  { value: "joined_desc", label: "Newest members" },
  { value: "joined_asc", label: "Oldest members" },
  { value: "points_desc", label: "Most points" },
  { value: "name_asc", label: "Name A–Z" },
];

/** Name or email contains the text, or the phone contains the typed digits. */
export function matchesMember(m: RewardsMember, q: string): boolean {
  if (!q.trim()) return true;
  if (matchesQuery(q, m.name, m.email)) return true;
  const digits = q.replace(/\D/g, "");
  return digits.length > 0 && m.phone.includes(digits);
}

export function sortMembers(list: RewardsMember[], sort: MemberSort): RewardsMember[] {
  const byName = (a: RewardsMember, b: RewardsMember) =>
    a.name.localeCompare(b.name, undefined, { sensitivity: "base" });
  const sorted = [...list];
  switch (sort) {
    case "points_desc":
      return sorted.sort((a, b) => b.points - a.points || byName(a, b));
    case "joined_desc":
      return sorted.sort((a, b) => (b.joinedAt ?? 0) - (a.joinedAt ?? 0));
    case "joined_asc":
      return sorted.sort((a, b) => (a.joinedAt ?? 0) - (b.joinedAt ?? 0));
    case "name_asc":
      return sorted.sort(byName);
  }
}

export type RewardsStats = {
  total: number;
  newThisMonth: number;
  /** The member with the highest balance, or null if nobody has points. */
  topMember: RewardsMember | null;
};

export function rewardsStats(members: RewardsMember[], now = new Date()): RewardsStats {
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).getTime();
  let newThisMonth = 0;
  let topMember: RewardsMember | null = null;
  for (const m of members) {
    if (m.joinedAt != null && m.joinedAt >= monthStart) newThisMonth++;
    if (m.points > 0 && (!topMember || m.points > topMember.points)) topMember = m;
  }
  return { total: members.length, newThisMonth, topMember };
}

/** Title + detail for a history row (same wording as the rewards app, plus the welcome bonus). */
export function describeTransaction(t: RewardsTransaction): { title: string; detail?: string } {
  switch (t.type) {
    case "earn":
      if (t.id.startsWith("welcome_")) return { title: "Welcome bonus", detail: "First order" };
      return {
        title: "Points earned",
        detail: t.subtotal != null ? `$${t.subtotal.toFixed(2)} order` : undefined,
      };
    case "redeem":
      return {
        title: "Reward used",
        detail: t.discount != null ? `$${t.discount} off` : undefined,
      };
    case "reverse":
      return {
        title: "Order cancelled",
        detail: t.points >= 0 ? "Points returned" : "Points removed",
      };
    default:
      return { title: "Points changed" };
  }
}
