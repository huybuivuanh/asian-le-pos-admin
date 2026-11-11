import { NextResponse } from "next/server";
import { getAdminDb } from "@/lib/firebase-admin";
import { HttpError, errorResponse, requireAdmin } from "@/app/api/_auth";
import { mapTransaction } from "../../../_shared";

export const dynamic = "force-dynamic";

/**
 * Admin reads one member's points history, newest first (read-only). The path is
 * always under the caller's own business, so another business's member isn't found.
 */
export async function GET(req: Request, { params }: { params: Promise<{ uid: string }> }) {
  try {
    const caller = await requireAdmin(req);
    const { uid } = await params;
    // Firebase uids are letters/digits; this also stops "/" from reaching the path.
    if (!/^[A-Za-z0-9_-]{1,128}$/.test(uid)) throw new HttpError(400, "Invalid member id.");

    const snap = await getAdminDb()
      .collection(`businesses/${caller.businessId}/members/${uid}/transactions`)
      .orderBy("createdAt", "desc")
      .get();
    const transactions = snap.docs.map((d) => mapTransaction(d.id, d.data()));
    return NextResponse.json({ transactions });
  } catch (err: unknown) {
    return errorResponse(err);
  }
}
