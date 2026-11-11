import { NextResponse } from "next/server";
import { getAdminDb } from "@/lib/firebase-admin";
import { errorResponse, requireAdmin } from "@/app/api/_auth";
import { mapMember } from "../_shared";

export const dynamic = "force-dynamic";

/** Admin lists the rewards members of their own business (read-only). */
export async function GET(req: Request) {
  try {
    const caller = await requireAdmin(req);
    const snap = await getAdminDb()
      .collection(`businesses/${caller.businessId}/members`)
      .select("name", "email", "phone", "points", "createdAt")
      .get();
    const members = snap.docs.map((d) => mapMember(d.id, d.data()));
    return NextResponse.json({ members });
  } catch (err: unknown) {
    return errorResponse(err);
  }
}
