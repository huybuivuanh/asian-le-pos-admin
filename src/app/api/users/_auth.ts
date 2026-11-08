// Shared checks for the user-management API routes. These routes use the Admin SDK
// (which skips security rules), so they must check the caller themselves.
import { NextResponse } from "next/server";
import { getAdminAuth } from "@/lib/firebase-admin";

/** Roles an admin can give. Customers (rewards accounts) have none. */
export const STAFF_ROLES = ["admin", "staff"] as const;
export type StaffRole = (typeof STAFF_ROLES)[number];

export class HttpError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message);
  }
}

export type Caller = { uid: string; businessId: string };

/**
 * The caller must send `Authorization: Bearer <Firebase ID token>` of an admin
 * ({ role: "admin", businessId }). Returns the admin's uid and business — the business
 * always comes from the verified token, never from the request body.
 */
export async function requireAdmin(req: Request): Promise<Caller> {
  const header = req.headers.get("authorization") ?? "";
  const token = header.startsWith("Bearer ") ? header.slice(7) : "";
  if (!token) throw new HttpError(401, "Sign in first.");

  let decoded;
  try {
    // true = also reject tokens of deleted / signed-out accounts.
    decoded = await getAdminAuth().verifyIdToken(token, true);
  } catch {
    throw new HttpError(401, "Your session expired. Sign in again.");
  }
  if (decoded.role !== "admin" || typeof decoded.businessId !== "string" || !decoded.businessId) {
    throw new HttpError(403, "Only admins can manage users.");
  }
  return { uid: decoded.uid, businessId: decoded.businessId };
}

export function requireRole(role: unknown): StaffRole {
  if (typeof role !== "string" || !STAFF_ROLES.includes(role as StaffRole)) {
    throw new HttpError(400, `Role must be one of: ${STAFF_ROLES.join(", ")}.`);
  }
  return role as StaffRole;
}

/** The account must belong to the caller's business (so one business can't touch another's users). */
export async function requireSameBusiness(uid: unknown, caller: Caller) {
  if (typeof uid !== "string" || !uid) throw new HttpError(400, "uid is required.");
  try {
    const user = await getAdminAuth().getUser(uid);
    if (user.customClaims?.businessId === caller.businessId) return user;
  } catch {
    // fall through: same answer whether it doesn't exist or isn't ours
  }
  throw new HttpError(404, "User not found.");
}

export function errorResponse(err: unknown) {
  if (err instanceof HttpError) {
    return NextResponse.json({ error: err.message }, { status: err.status });
  }
  console.error(err);
  const message = err instanceof Error ? err.message : "An unknown error occurred";
  return NextResponse.json({ error: message }, { status: 400 });
}
