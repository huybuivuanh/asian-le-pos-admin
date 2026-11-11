// Helpers for the read-only rewards routes. Points are only ever changed by the
// rewards Cloud Functions; these routes never write.
import type { DocumentData } from "firebase-admin/firestore";

/** Firestore Timestamp (Admin SDK) → epoch millis, or null. */
export function toMillis(value: unknown): number | null {
  return value && typeof (value as { toMillis?: unknown }).toMillis === "function"
    ? (value as { toMillis: () => number }).toMillis()
    : null;
}

export function mapMember(id: string, data: DocumentData): RewardsMember {
  return {
    id,
    name: typeof data.name === "string" ? data.name : "",
    email: typeof data.email === "string" ? data.email : "",
    phone: typeof data.phone === "string" ? data.phone : "",
    points: typeof data.points === "number" ? data.points : 0,
    joinedAt: toMillis(data.createdAt),
  };
}

export function mapTransaction(id: string, data: DocumentData): RewardsTransaction {
  return {
    id,
    type: data.type as RewardsTransactionType,
    points: typeof data.points === "number" ? data.points : 0,
    orderId: typeof data.orderId === "string" ? data.orderId : "",
    createdAt: toMillis(data.createdAt),
    ...(typeof data.subtotal === "number" ? { subtotal: data.subtotal } : {}),
    ...(typeof data.discount === "number" ? { discount: data.discount } : {}),
  };
}
