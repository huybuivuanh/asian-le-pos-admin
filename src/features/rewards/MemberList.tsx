"use client";

import { useMemo, useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { SearchField } from "@/components/ui/search-field";
import { tableCardClass } from "@/components/layout/RowParts";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  DEFAULT_MEMBER_SORT,
  MEMBER_SORT_OPTIONS,
  matchesMember,
  sortMembers,
  type MemberSort,
} from "@/lib/rewards-members";
import { MemberHistoryDialog } from "./MemberHistoryDialog";
import { MemberTableRow } from "./MemberTableRow";

const PAGE_SIZE = 100;

const headerCellClass =
  "px-3 py-3 text-xs font-medium tracking-wide text-foreground/60 uppercase sm:px-4";

export function MemberList({ members }: { members: RewardsMember[] }) {
  const [searchTerm, setSearchTerm] = useState("");
  const [sort, setSort] = useState<MemberSort>(DEFAULT_MEMBER_SORT);
  const [page, setPage] = useState(1);
  const [openMember, setOpenMember] = useState<RewardsMember | null>(null);

  const sorted = useMemo(
    () => sortMembers(members.filter((m) => matchesMember(m, searchTerm)), sort),
    [members, searchTerm, sort],
  );

  const pageCount = Math.max(1, Math.ceil(sorted.length / PAGE_SIZE));
  const currentPage = Math.min(page, pageCount);
  const visible = sorted.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);

  // A new search or sort starts again from page 1.
  function resetView() {
    setPage(1);
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <SearchField
          className="flex-1"
          placeholder="Search by name, phone or email…"
          value={searchTerm}
          onChange={(e) => {
            setSearchTerm(e.target.value);
            resetView();
          }}
          aria-label="Search members"
        />
        <div className="flex shrink-0 items-center gap-2">
          <label
            htmlFor="member-sort"
            className="text-xs font-medium tracking-wide text-foreground/60 uppercase"
          >
            Sort by
          </label>
          <Select
            value={sort}
            onValueChange={(v) => {
              setSort(v as MemberSort);
              resetView();
            }}
          >
            <SelectTrigger id="member-sort" className="h-10 w-48 rounded-xl">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {MEMBER_SORT_OPTIONS.map((o) => (
                <SelectItem key={o.value} value={o.value}>
                  {o.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className={`${tableCardClass} overflow-x-auto`}>
        <table className="w-full min-w-[40rem] border-collapse text-sm">
          <thead>
            <tr className="border-b border-foreground/10 bg-foreground/[0.03]">
              <th className={`${headerCellClass} text-left`}>Name</th>
              <th className={`${headerCellClass} text-left`}>Phone</th>
              <th className={`${headerCellClass} text-left`}>Email</th>
              <th className={`${headerCellClass} text-right`}>Points</th>
              <th className={`${headerCellClass} text-left`}>Joined</th>
              <th className="w-8 px-2 py-3" aria-hidden />
            </tr>
          </thead>
          <tbody>
            {sorted.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-4 py-12 text-center text-sm text-foreground/60">
                  {members.length === 0 ? "No rewards members yet." : "No members match your search."}
                </td>
              </tr>
            ) : (
              visible.map((member) => (
                <MemberTableRow
                  key={member.id}
                  member={member}
                  onOpen={() => setOpenMember(member)}
                />
              ))
            )}
          </tbody>
        </table>
      </div>

      {sorted.length > PAGE_SIZE && (
        <div className="flex items-center justify-between gap-4">
          <p className="text-xs text-foreground/60">
            Showing {(currentPage - 1) * PAGE_SIZE + 1}–
            {Math.min(currentPage * PAGE_SIZE, sorted.length)} of {sorted.length}
          </p>
          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={currentPage <= 1}
              onClick={() => setPage(currentPage - 1)}
            >
              <ChevronLeft className="size-4" aria-hidden />
              Previous
            </Button>
            <span className="text-xs text-foreground/60">
              Page {currentPage} of {pageCount}
            </span>
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={currentPage >= pageCount}
              onClick={() => setPage(currentPage + 1)}
            >
              Next
              <ChevronRight className="size-4" aria-hidden />
            </Button>
          </div>
        </div>
      )}

      <MemberHistoryDialog member={openMember} onClose={() => setOpenMember(null)} />
    </div>
  );
}
