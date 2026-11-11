import { NextResponse } from "next/server";
import { getAdminAuth, getAdminDb } from "@/lib/firebase-admin";
import { HttpError, errorResponse, requireAdmin, requireRole, requireSameBusiness } from "@/app/api/_auth";

/** Admin updates a staff/admin account in their own business. */
export async function POST(req: Request) {
  try {
    const caller = await requireAdmin(req);
    const { uid, name, email, password, role: rawRole } = await req.json();
    const role = requireRole(rawRole);
    const target = await requireSameBusiness(uid, caller);

    // Don't let the admin lock themselves out.
    if (target.uid === caller.uid && role !== "admin") {
      throw new HttpError(400, "You can't remove your own admin role.");
    }

    const adminAuth = getAdminAuth();
    const adminDb = getAdminDb();

    await adminAuth.updateUser(target.uid, {
      email,
      ...(password ? { password } : {}),
      displayName: name,
    });

    const roleChanged = target.customClaims?.role !== role;
    await adminAuth.setCustomUserClaims(target.uid, {
      businessId: caller.businessId,
      role,
    });
    // A changed role should apply now, not when their token next refreshes (up to 1 h).
    if (roleChanged) await adminAuth.revokeRefreshTokens(target.uid);

    await adminDb
      .doc(`businesses/${caller.businessId}/users/${target.uid}`)
      .set({ name, email, role }, { merge: true });

    return NextResponse.json({ success: true });
  } catch (err: unknown) {
    return errorResponse(err);
  }
}
