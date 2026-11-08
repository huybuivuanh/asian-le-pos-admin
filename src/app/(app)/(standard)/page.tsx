"use client";

import { useEffect, useMemo, useState } from "react";
import { PageHeader } from "@/components/layout/PageHeader";
import {
  fetchOrdersForAnalytics,
  type OrderHistoryLoadedOrder,
} from "@/lib/order-history-firestore";
import { cn } from "@/lib/utils";

type Tab = "items" | "staff";
type ItemStat = { name: string; quantity: number; pct: number };
type StaffStat = { name: string; orders: number; pct: number };

function computeItemStats(orders: OrderHistoryLoadedOrder[]): ItemStat[] {
  const map = new Map<string, number>();
  for (const order of orders) {
    for (const item of order.orderItems) {
      map.set(item.name, (map.get(item.name) ?? 0) + item.quantity);
    }
  }
  const total = Array.from(map.values()).reduce((s, n) => s + n, 0);
  return Array.from(map.entries())
    .map(([name, quantity]) => ({
      name,
      quantity,
      pct: total > 0 ? (quantity / total) * 100 : 0,
    }))
    .sort((a, b) => b.quantity - a.quantity);
}

function computeStaffStats(orders: OrderHistoryLoadedOrder[]): StaffStat[] {
  const map = new Map<string, number>();
  for (const order of orders) {
    const s = order.staff || "Unknown";
    map.set(s, (map.get(s) ?? 0) + 1);
  }
  const total = orders.length;
  return Array.from(map.entries())
    .map(([name, count]) => ({
      name,
      orders: count,
      pct: total > 0 ? (count / total) * 100 : 0,
    }))
    .sort((a, b) => b.orders - a.orders);
}

export default function DashboardPage() {
  const [tab, setTab] = useState<Tab>("items");
  const [orders, setOrders] = useState<OrderHistoryLoadedOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchOrdersForAnalytics()
      .then(setOrders)
      .catch((e) =>
        setError(e instanceof Error ? e.message : "Failed to load analytics"),
      )
      .finally(() => setLoading(false));
  }, []);

  const itemStats = useMemo(() => computeItemStats(orders), [orders]);
  const staffStats = useMemo(() => computeStaffStats(orders), [orders]);
  const totalQuantity = useMemo(
    () => itemStats.reduce((s, i) => s + i.quantity, 0),
    [itemStats],
  );

  return (
    <div className="min-w-0">
      <PageHeader title="Dashboard">
        <p className="text-sm text-foreground/60">
          Last 30 days · take-out and dine-in
        </p>
      </PageHeader>

      {!loading && !error && (
        <div className="mb-6 grid grid-cols-2 gap-3 sm:grid-cols-3">
          <div className="rounded-xl border border-foreground/10 bg-background px-4 py-4">
            <p className="text-xs font-medium tracking-wide text-foreground/60 uppercase">
              Orders
            </p>
            <p className="mt-1 text-2xl font-semibold tabular-nums">
              {orders.length}
            </p>
          </div>
          <div className="rounded-xl border border-foreground/10 bg-background px-4 py-4">
            <p className="text-xs font-medium tracking-wide text-foreground/60 uppercase">
              Items Sold
            </p>
            <p className="mt-1 text-2xl font-semibold tabular-nums">
              {totalQuantity}
            </p>
          </div>
          <div className="col-span-2 rounded-xl border border-foreground/10 bg-background px-4 py-4 sm:col-span-1">
            <p className="text-xs font-medium tracking-wide text-foreground/60 uppercase">
              Unique Items
            </p>
            <p className="mt-1 text-2xl font-semibold tabular-nums">
              {itemStats.length}
            </p>
          </div>
        </div>
      )}

      <div className="overflow-hidden rounded-xl border border-foreground/10 bg-background">
        <div className="flex border-b border-foreground/10">
          {(["items", "staff"] as Tab[]).map((t) => (
            <button
              key={t}
              type="button"
              onClick={() => setTab(t)}
              className={cn(
                "px-5 py-3 text-sm font-medium transition-colors",
                tab === t
                  ? "border-b-2 border-foreground text-foreground"
                  : "text-foreground/60 hover:text-foreground",
              )}
            >
              {t === "items" ? "Items" : "Staff"}
            </button>
          ))}
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-16">
            <div className="size-6 animate-spin rounded-full border-2 border-muted-foreground/20 border-t-foreground" />
          </div>
        ) : error ? (
          <p className="px-4 py-10 text-center text-sm text-red-600">
            {error}
          </p>
        ) : tab === "items" ? (
          <ItemsTable stats={itemStats} total={totalQuantity} />
        ) : (
          <StaffTable stats={staffStats} total={orders.length} />
        )}
      </div>
    </div>
  );
}

function ItemsTable({
  stats,
  total,
}: {
  stats: ItemStat[];
  total: number;
}) {
  if (stats.length === 0) {
    return (
      <p className="px-4 py-12 text-center text-sm text-foreground/60">
        No items found in the last 30 days.
      </p>
    );
  }
  return (
    <div className="overflow-x-auto">
      <table className="w-full border-collapse text-sm">
        <thead>
          <tr className="border-b border-foreground/10 bg-foreground/[0.03]">
            <th className="w-10 px-4 py-3 text-left text-xs font-medium tracking-wide text-foreground/60 uppercase">
              #
            </th>
            <th className="px-4 py-3 text-left text-xs font-medium tracking-wide text-foreground/60 uppercase">
              Item
            </th>
            <th className="px-4 py-3 text-right text-xs font-medium tracking-wide text-foreground/60 uppercase">
              Qty
            </th>
            <th className="px-4 py-3 text-right text-xs font-medium tracking-wide text-foreground/60 uppercase">
              % of {total}
            </th>
          </tr>
        </thead>
        <tbody className="divide-y divide-foreground/10">
          {stats.map((row, i) => (
            <tr key={row.name} className="transition-colors hover:bg-foreground/[0.02]">
              <td className="px-4 py-3 text-foreground/60">{i + 1}</td>
              <td className="px-4 py-3 font-medium text-foreground">
                {row.name}
              </td>
              <td className="px-4 py-3 text-right tabular-nums">
                {row.quantity}
              </td>
              <td className="px-4 py-3 text-right tabular-nums text-foreground/60">
                {row.pct.toFixed(1)}%
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function StaffTable({
  stats,
  total,
}: {
  stats: StaffStat[];
  total: number;
}) {
  if (stats.length === 0) {
    return (
      <p className="px-4 py-12 text-center text-sm text-foreground/60">
        No staff data found in the last 30 days.
      </p>
    );
  }
  return (
    <div className="overflow-x-auto">
      <table className="w-full border-collapse text-sm">
        <thead>
          <tr className="border-b border-foreground/10 bg-foreground/[0.03]">
            <th className="w-10 px-4 py-3 text-left text-xs font-medium tracking-wide text-foreground/60 uppercase">
              #
            </th>
            <th className="px-4 py-3 text-left text-xs font-medium tracking-wide text-foreground/60 uppercase">
              Staff
            </th>
            <th className="px-4 py-3 text-right text-xs font-medium tracking-wide text-foreground/60 uppercase">
              Orders
            </th>
            <th className="px-4 py-3 text-right text-xs font-medium tracking-wide text-foreground/60 uppercase">
              % of {total}
            </th>
          </tr>
        </thead>
        <tbody className="divide-y divide-foreground/10">
          {stats.map((row, i) => (
            <tr key={row.name} className="transition-colors hover:bg-foreground/[0.02]">
              <td className="px-4 py-3 text-foreground/60">{i + 1}</td>
              <td className="px-4 py-3 font-medium text-foreground">
                {row.name}
              </td>
              <td className="px-4 py-3 text-right tabular-nums">{row.orders}</td>
              <td className="px-4 py-3 text-right tabular-nums text-foreground/60">
                {row.pct.toFixed(1)}%
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
