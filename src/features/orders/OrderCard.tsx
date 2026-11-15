"use client";

import { OrderStatus } from "@/types/enum";
import {
  isOrderPaid,
  isTakeOutLoadedOrder,
  submitToPrintQueue,
  completeOrder,
  cancelOrder,
  markOrderPaid,
  type OrderCardPatch,
  type OrderHistoryLoadedOrder,
} from "@/lib/order-history-firestore";
import {
  formatDiscountAmount,
  formatDiscountLabel,
  formatOrderedAt,
  formatPhone,
} from "@/lib/formatters";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { OrderItemBlock } from "./OrderItemBlock";
import { RewardsBadge } from "./RewardsBadge";
import { reverseCancelledOrderRewards } from "@/lib/order-loyalty";
import { alertDialog } from "@/stores/useModalStore";

function orderCardSurface(
  status: OrderStatus,
  takeOut: boolean,
  scheduled: boolean,
): string {
  if (status === OrderStatus.Cancelled) return "bg-red-100 border-red-200";
  if (status === OrderStatus.Completed) return "bg-green-100 border-green-200";
  if (takeOut) {
    return scheduled
      ? "bg-orange-100 border-orange-200"
      : "bg-blue-100 border-blue-200";
  }
  return "bg-amber-100 border-amber-200";
}

function Pill({ className, children }: { className: string; children: React.ReactNode }) {
  return (
    <span className={cn("rounded-full px-3 py-1 text-xs font-semibold", className)}>
      {children}
    </span>
  );
}

export function OrderCard({
  order,
  expanded,
  onToggle,
  onOrderChange,
  onOrderItemsChange,
}: {
  order: OrderHistoryLoadedOrder;
  expanded: boolean;
  onToggle: () => void;
  onOrderChange?: (
    orderId: string,
    patch: OrderCardPatch,
  ) => void;
  onOrderItemsChange?: (
    orderId: string,
    orderItems: OrderHistoryLoadedOrder["orderItems"],
  ) => void;
}) {
  const takeOut = isTakeOutLoadedOrder(order);
  const scheduled = takeOut && order.fulfillment.kind === "scheduled";
  const tb = order.taxBreakDown;
  const isPaid = isOrderPaid(order);
  const showPaidPill =
    !(order.status === OrderStatus.Completed && !isPaid) &&
    order.status !== OrderStatus.Cancelled;

  const printedPillClass = takeOut
    ? order.printed
      ? "bg-indigo-100 text-indigo-700"
      : "bg-amber-100 text-amber-700"
    : order.printed
      ? "bg-green-100 text-green-700"
      : "bg-yellow-100 text-yellow-700";

  const paidPillClass = takeOut
    ? isPaid
      ? "bg-fuchsia-100 text-fuchsia-700"
      : "bg-slate-200 text-slate-600"
    : isPaid
      ? "bg-green-100 text-green-700"
      : "bg-gray-100 text-gray-700";

  return (
    <div
      className={cn(
        "rounded-xl border p-4 shadow-sm",
        orderCardSurface(order.status, takeOut, scheduled),
      )}
    >
      <button
        type="button"
        onClick={onToggle}
        className="flex w-full items-center justify-between text-left"
      >
        <div>
          {takeOut ? (
            <>
              {order.customerName?.trim() ? (
                <p className="text-base font-semibold text-gray-800">
                  Name: {order.customerName.trim()}
                </p>
              ) : null}
              {order.phoneNumber?.trim() ? (
                <p className="text-base font-semibold text-gray-800">
                  Phone #: {formatPhone(order.phoneNumber)}
                </p>
              ) : null}
            </>
          ) : (
            <>
              <p className="text-base font-semibold text-gray-800">
                Table: {order.tableNumber}
              </p>
              <p className="text-base font-semibold text-gray-800">
                Guests: {order.guests ?? 0}
              </p>
            </>
          )}
          <p className="text-base font-semibold text-gray-800">
            Staff: {order.staff ?? "—"}
          </p>
          {takeOut &&
          order.fulfillment.kind === "immediate" &&
          order.fulfillment.readyTimeMinutes != null ? (
            <p className="text-base font-semibold text-gray-800">
              Ready In: {order.fulfillment.readyTimeMinutes} min
            </p>
          ) : null}
          <p className="text-base font-semibold text-gray-800">
            Ordered At: {formatOrderedAt(order.createdAt.toDate())}
          </p>
          <RewardsBadge loyalty={order.loyalty} />
          {takeOut && order.fulfillment.kind === "scheduled" ? (
            <p className="text-base font-semibold text-gray-800">
              Preorder: {formatOrderedAt(order.fulfillment.scheduledAt.toDate())}
            </p>
          ) : null}
        </div>

        <div className="flex flex-col items-end gap-2">
          <Pill className={printedPillClass}>
            {order.printed ? "Printed" : "Not Printed"}
          </Pill>
          {showPaidPill ? (
            <Pill className={paidPillClass}>{isPaid ? "Paid" : "Unpaid"}</Pill>
          ) : null}
          {!takeOut ? (
            <Pill
              className={
                order.status === OrderStatus.InProgress
                  ? "bg-blue-100 text-blue-700"
                  : order.status === OrderStatus.Completed
                    ? "bg-green-100 text-green-700"
                    : "bg-red-200 text-red-700"
              }
            >
              {order.status === OrderStatus.InProgress
                ? "In Progress"
                : order.status}
            </Pill>
          ) : null}
        </div>
      </button>

      {expanded ? (
        <div className="mt-3 border-t border-gray-200 pt-2">
          {order.orderItems.length > 0 ? (
            <ul>
              {order.orderItems.map((item, i) => (
                <OrderItemBlock key={item.id ?? i} item={item} />
              ))}
            </ul>
          ) : (
            <p className="text-sm text-gray-500">No line items.</p>
          )}

          <div className="mt-2 border-t border-gray-200 p-2">
            <div className="mb-1 flex justify-between">
              <span className="text-base text-gray-700">Subtotal</span>
              <span className="text-base text-gray-700">
                ${(tb.subTotal ?? 0).toFixed(2)}
              </span>
            </div>
            {tb.discount != null && tb.discount.discountAmount > 0 ? (
                <div className="mb-1 flex justify-between">
                  <span className="text-base text-gray-600">
                    {formatDiscountLabel(tb.discount)}
                  </span>
                  <span className="text-base text-gray-700">
                    {formatDiscountAmount(tb.discount)}
                  </span>
                </div>
            ) : null}
            {tb.rewards ? (
              <div className="mb-1 flex justify-between">
                <span className="text-base text-gray-600">
                  Rewards ({tb.rewards.points} pts)
                </span>
                <span className="text-base text-gray-700">
                  -${tb.rewards.amount.toFixed(2)}
                </span>
              </div>
            ) : null}
            {tb.taxableSubtotal < tb.subTotal ? (
              <div className="mb-1 flex justify-between">
                <span className="text-base text-gray-700">
                  Taxable Subtotal
                </span>
                <span className="text-base text-gray-700">
                  ${tb.taxableSubtotal.toFixed(2)}
                </span>
              </div>
            ) : null}
            <div className="mb-1 flex justify-between">
              <span className="text-base text-gray-700">PST (6%)</span>
              <span className="text-base text-gray-700">
                ${(tb.pst ?? 0).toFixed(2)}
              </span>
            </div>
            <div className="mb-1 flex justify-between">
              <span className="text-base text-gray-700">GST (5%)</span>
              <span className="text-base text-gray-700">
                ${(tb.gst ?? 0).toFixed(2)}
              </span>
            </div>
            <div className="mb-1 flex justify-between">
              <span className="text-base font-semibold text-gray-800">
                Total
              </span>
              <span className="text-base font-bold text-gray-900">
                ${(tb.total ?? 0).toFixed(2)}
              </span>
            </div>
          </div>

          <div className="mt-3 flex justify-between gap-2">
            <Button
              type="button"
              className="flex-1 rounded-md bg-blue-500 py-3 text-sm font-semibold text-white hover:bg-blue-600"
              variant="default"
              onClick={async (e) => {
                try {
                  e.stopPropagation();
                  await submitToPrintQueue(order);
                  await alertDialog("Order added to print queue successfully.");
                } catch (error) {
                  console.error(error);
                  await alertDialog("Couldn't print order. Try again.");
                }
              }}
            >
              Print
            </Button>
            <Button
              type="button"
              className={cn(
                "flex-1 rounded-md py-3 text-sm font-semibold text-white",
                isPaid ? "bg-gray-500 hover:bg-gray-600" : "bg-pink-500 hover:bg-pink-600",
              )}
              variant="default"
              onClick={async (e) => {
                try {
                  e.stopPropagation();
                  const items = await markOrderPaid(order, !isPaid);
                  onOrderItemsChange?.(order.id, items);
                } catch (error) {
                  console.error(error);
                  await alertDialog("Couldn't update paid status. Try again.");
                }
              }}
            >
              {isPaid ? "Unpaid" : "Paid"}
            </Button>
          </div>

          <div className="mt-3 flex justify-between gap-2">
            <Button
              type="button"
              className="flex-1 rounded-md bg-red-500 py-3 text-sm font-semibold text-white hover:bg-red-600"
              variant="default"
              onClick={async (e) => {
                try {
                  e.stopPropagation();
                  const status = await cancelOrder(order);
                  onOrderChange?.(order.id, { status });
                  // Pressing Cancel on a cancelled order undoes it — only reverse points on a real cancel.
                  if (status === OrderStatus.Cancelled) {
                    const { warning, patch } = await reverseCancelledOrderRewards(
                      order.orderType,
                      order.id,
                    );
                    onOrderChange?.(order.id, patch);
                    if (warning) await alertDialog(warning);
                  }
                } catch (error) {
                  console.error(error);
                  await alertDialog("Couldn't cancel order. Try again.");
                }
              }}
            >
              Cancel
            </Button>
            <Button
              type="button"
              className="flex-1 rounded-md bg-green-500 py-3 text-sm font-semibold text-white hover:bg-green-600"
              variant="default"
              onClick={async (e) => {
                try {
                  e.stopPropagation();
                  const status = await completeOrder(order);
                  onOrderChange?.(order.id, { status });
                } catch (error) {
                  console.error(error);
                  await alertDialog("Couldn't complete order. Try again.");
                }
              }}
            >
              Complete
            </Button>
          </div>
        </div>
      ) : null}
    </div>
  );
}
