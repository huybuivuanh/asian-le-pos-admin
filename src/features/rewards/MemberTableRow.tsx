"use client";

import { ChevronRight } from "lucide-react";
import { formatPhone, formatShortDate } from "@/lib/formatters";

type Props = {
  member: RewardsMember;
  /** Opens the member's history popup. */
  onOpen: () => void;
};

export function MemberTableRow({ member, onOpen }: Props) {
  return (
    <tr
      tabIndex={0}
      aria-label={`${member.name || "Member"}: show points history`}
      className="cursor-pointer border-b border-foreground/10 transition-colors last:border-b-0 hover:bg-foreground/[0.02] focus-visible:bg-foreground/[0.04] focus-visible:outline-none"
      onClick={onOpen}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          onOpen();
        }
      }}
    >
      <td className="px-3 py-3 font-medium text-foreground sm:px-4">{member.name || "—"}</td>
      <td className="whitespace-nowrap px-3 py-3 text-foreground/60 sm:px-4">
        {member.phone ? formatPhone(member.phone) : "—"}
      </td>
      <td className="max-w-[16rem] truncate px-3 py-3 text-foreground/60 sm:px-4">
        {member.email || "—"}
      </td>
      <td className="whitespace-nowrap px-3 py-3 text-right font-semibold tabular-nums text-foreground sm:px-4">
        {member.points.toLocaleString()}
      </td>
      <td className="whitespace-nowrap px-3 py-3 text-foreground/60 sm:px-4">
        {formatShortDate(member.joinedAt)}
      </td>
      <td className="w-8 px-2 py-3 align-middle">
        <ChevronRight className="size-4 text-foreground/40" aria-hidden />
      </td>
    </tr>
  );
}
