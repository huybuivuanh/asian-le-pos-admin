"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { RefreshCw } from "lucide-react";
import { PageHeader } from "@/components/layout/PageHeader";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/providers/AuthProvider";
import { rewardsStats } from "@/lib/rewards-members";
import { cn } from "@/lib/utils";
import { fetchRewardsMembers } from "@/services/rewardsMembersService";
import { MemberList } from "./MemberList";

function StatTile({
  label,
  value,
  hint,
  className,
}: {
  label: string;
  value: string;
  hint?: string;
  className?: string;
}) {
  return (
    <div className={cn("rounded-xl border border-foreground/10 bg-background px-4 py-3", className)}>
      <p className="text-xs font-medium tracking-wide text-foreground/60 uppercase">{label}</p>
      <p className="mt-1 text-2xl font-semibold tabular-nums text-foreground">{value}</p>
      {hint && <p className="truncate text-xs text-foreground/60">{hint}</p>}
    </div>
  );
}

/**
 * Rewards members, their balances and points history. Read-only: points only change
 * through the rewards functions. Loaded on open and with Refresh (not live).
 */
export function RewardsSection() {
  const { user, loading: authLoading } = useAuth();
  const [members, setMembers] = useState<RewardsMember[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      setMembers(await fetchRewardsMembers());
    } catch (err) {
      setError(
        err instanceof Error && err.message
          ? err.message
          : "Couldn't load rewards members. Try again.",
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!authLoading && user) void load();
  }, [authLoading, user, load]);

  const stats = useMemo(() => (members ? rewardsStats(members) : null), [members]);

  return (
    <div className="min-w-0">
      <PageHeader title="Rewards" count={members?.length}>
        <Button type="button" variant="outline" onClick={() => void load()} disabled={loading}>
          <RefreshCw className={loading ? "animate-spin" : undefined} aria-hidden />
          Refresh
        </Button>
      </PageHeader>

      {error && (
        <p className="mb-4 text-sm text-red-600" role="alert">
          {error}
        </p>
      )}

      {!members ? (
        loading && <p className="text-sm text-foreground/60">Loading members…</p>
      ) : (
        <div className="space-y-6">
          {stats && (
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
              <StatTile label="Members" value={stats.total.toLocaleString()} />
              <StatTile label="New this month" value={stats.newThisMonth.toLocaleString()} />
              <StatTile
                className="col-span-2 sm:col-span-1"
                label="Most points"
                value={stats.topMember ? stats.topMember.points.toLocaleString() : "—"}
                hint={stats.topMember ? stats.topMember.name || "Unnamed member" : "No points yet"}
              />
            </div>
          )}
          <MemberList members={members} />
        </div>
      )}
    </div>
  );
}
