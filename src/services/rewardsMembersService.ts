// Read-only rewards data for the Rewards page, through this app's API routes
// (Admin SDK on the server), so the Firestore rules stay closed to member lists.
import { callAdminApi } from "@/services/adminApi";

export async function fetchRewardsMembers(): Promise<RewardsMember[]> {
  const { members } = await callAdminApi<{ members: RewardsMember[] }>("/api/rewards/members");
  return members;
}

export async function fetchRewardsTransactions(uid: string): Promise<RewardsTransaction[]> {
  const { transactions } = await callAdminApi<{ transactions: RewardsTransaction[] }>(
    `/api/rewards/members/${encodeURIComponent(uid)}/transactions`,
  );
  return transactions;
}
