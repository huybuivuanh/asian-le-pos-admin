import { NextResponse } from "next/server";
import { Timestamp } from "firebase-admin/firestore";
import { getAdminAuth, getAdminDb } from "@/lib/firebase-admin";
import { errorResponse, requireAdmin, requireRole } from "@/app/api/_auth";

/** Admin creates a staff/admin account in their own business. */
export async function POST(req: Request) {
  try {
    const caller = await requireAdmin(req);
    const { email, password, name, role: rawRole } = await req.json();
    const role = requireRole(rawRole);

    const adminAuth = getAdminAuth();
    const adminDb = getAdminDb();

    const userRecord = await adminAuth.createUser({
      email,
      password,
      displayName: name,
    });

    // Business + role as custom claims: the apps and security rules check these.
    await adminAuth.setCustomUserClaims(userRecord.uid, {
      businessId: caller.businessId,
      role,
    });

    // Staff list for display (POS staff picker, this app's Users page).
    await adminDb
      .doc(`businesses/${caller.businessId}/users/${userRecord.uid}`)
      .set({ name, email, role, createdAt: Timestamp.now() });

    return NextResponse.json({ uid: userRecord.uid });
  } catch (err: unknown) {
    return errorResponse(err);
  }
}
