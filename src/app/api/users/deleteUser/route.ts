import { NextResponse } from "next/server";
import { getAdminAuth, getAdminDb } from "@/lib/firebase-admin";
import { HttpError, errorResponse, requireAdmin, requireSameBusiness } from "@/app/api/_auth";

/** Admin deletes a staff/admin account in their own business. */
export async function POST(req: Request) {
  try {
    const caller = await requireAdmin(req);
    const { uid } = await req.json();
    const target = await requireSameBusiness(uid, caller);
    if (target.uid === caller.uid) {
      throw new HttpError(400, "You can't delete your own account here.");
    }

    await getAdminAuth().deleteUser(target.uid);
    await getAdminDb().doc(`businesses/${caller.businessId}/users/${target.uid}`).delete();

    return NextResponse.json({ success: true });
  } catch (err: unknown) {
    return errorResponse(err);
  }
}
