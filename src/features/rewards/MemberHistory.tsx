"use client";

import { useCallback, useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { formatOrderedAt } from "@/lib/formatters";
import { describeTransaction } from "@/lib/rewards-members";
import { cn } from "@/lib/utils";
import { fetchRewardsTransactions } from "@/services/rewardsMembersService";

/** One member's points history, loaded each time the row is opened. */
export function MemberHistory({ memberId }: { memberId: string }) {
  const [transactions, setTransactions] = useState<RewardsTransaction[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setError(null);
    setTransactions(null);
    try {
      setTransactions(await fetchRewardsTransactions(memberId));
    } catch (err) {
      setError(err instanceof Error && err.message ? err.message : "Couldn't load history.");
    }
  }, [memberId]);

  useEffect(() => {
    void load();
  }, [load]);

  if (error) {
    return (
      <div className="flex flex-wrap items-center gap-3">
        <p className="text-sm text-red-600" role="alert">
          {error}
        </p>
        <Button type="button" variant="outline" size="sm" onClick={() => void load()}>
          Try again
        </Button>
      </div>
    );
  }
  if (!transactions) {
    return <p className="text-sm text-foreground/60">Loading history…</p>;
  }
  if (transactions.length === 0) {
    return <p className="text-sm text-foreground/60">No points activity yet.</p>;
  }

  return (
    <ul className="divide-y divide-foreground/10 overflow-hidden rounded-lg border border-foreground/10 bg-background">
      {transactions.map((t) => {
        const { title, detail } = describeTransaction(t);
        return (
          <li key={t.id} className="flex items-center justify-between gap-4 px-3 py-2">
            <div className="min-w-0">
              <p className="text-sm font-medium text-foreground">{title}</p>
              <p className="text-xs text-foreground/60">
                {t.createdAt != null ? formatOrderedAt(new Date(t.createdAt)) : "—"}
                {detail && ` · ${detail}`}
              </p>
            </div>
            <span
              className={cn(
                "shrink-0 text-sm font-semibold tabular-nums",
                t.points >= 0 ? "text-green-700" : "text-red-600",
              )}
            >
              {t.points >= 0 ? "+" : "−"}
              {Math.abs(t.points).toLocaleString()}
            </span>
          </li>
        );
      })}
    </ul>
  );
}
