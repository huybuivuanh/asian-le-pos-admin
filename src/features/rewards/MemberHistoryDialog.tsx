"use client";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { formatPhone, formatShortDate } from "@/lib/formatters";
import { pointsToDollars } from "@/lib/rewards-members";
import { MemberHistory } from "./MemberHistory";

/**
 * One member's details and points history. The header stays put and only the
 * history scrolls, so closing is always one click (or Esc) away.
 */
export function MemberHistoryDialog({
  member,
  onClose,
}: {
  member: RewardsMember | null;
  onClose: () => void;
}) {
  return (
    <Dialog open={member != null} onOpenChange={(open) => !open && onClose()}>
      {member && (
        <DialogContent className="flex max-h-[85dvh] flex-col gap-4 sm:max-w-xl">
          <DialogHeader className="pr-8">
            <DialogTitle>{member.name || "Member"}</DialogTitle>
            <DialogDescription>
              {[member.phone && formatPhone(member.phone), member.email]
                .filter(Boolean)
                .join(" · ")}
            </DialogDescription>
          </DialogHeader>

          <div className="grid grid-cols-2 gap-3">
            <div className="rounded-lg border border-foreground/10 px-3 py-2">
              <p className="text-xs font-medium tracking-wide text-foreground/60 uppercase">
                Points
              </p>
              <p className="text-xl font-semibold tabular-nums text-foreground">
                {member.points.toLocaleString()}
              </p>
              <p className="text-xs text-foreground/60">
                Worth ${pointsToDollars(member.points).toLocaleString()} in rewards
              </p>
            </div>
            <div className="rounded-lg border border-foreground/10 px-3 py-2">
              <p className="text-xs font-medium tracking-wide text-foreground/60 uppercase">
                Joined
              </p>
              <p className="text-xl font-semibold text-foreground">
                {formatShortDate(member.joinedAt)}
              </p>
            </div>
          </div>

          <div className="min-h-0 flex-1 overflow-y-auto">
            <MemberHistory memberId={member.id} />
          </div>
        </DialogContent>
      )}
    </Dialog>
  );
}
