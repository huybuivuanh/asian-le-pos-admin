// The business this admin manages. All data lives under businesses/{businessId}/…
// in the shared asianlepos Firebase project. The id comes from the signed-in
// account's `businessId` custom claim (set by AuthProvider after sign-in).
import { collection, doc } from "firebase/firestore";
import { clientDb } from "./firebase-config";

let currentBusinessId: string | null = null;

export function setBusinessId(id: string | null) {
  currentBusinessId = id;
}

export function getBusinessId(): string | null {
  return currentBusinessId;
}

function requireBusinessId(): string {
  if (!currentBusinessId) throw new Error("No business selected. Sign out and sign in again.");
  return currentBusinessId;
}

/** A collection inside the current business, e.g. bizCol("tables"). */
export function bizCol(name: string) {
  return collection(clientDb, "businesses", requireBusinessId(), name);
}

/** A doc inside the current business, e.g. bizDoc("tables", id). */
export function bizDoc(name: string, id: string) {
  return doc(clientDb, "businesses", requireBusinessId(), name, id);
}

/** Admins only: the claims an account needs to use pos-admin. */
export function adminBusinessFromClaims(claims: Record<string, unknown>): string | null {
  const { businessId, role } = claims;
  return role === "admin" && typeof businessId === "string" && businessId ? businessId : null;
}
