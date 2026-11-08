// Reverses rewards points when an order is cancelled. Mirrors the POS app's
// reverseCancelledOrderRewards (services/orderLoyaltyService.ts).
import { bizDoc } from "@/lib/business";
import {
  doc,
  getDoc,
  runTransaction,
  serverTimestamp,
  updateDoc,
} from "firebase/firestore";
import { clientDb } from "@/lib/firebase-config";
import {
  DINE_IN_ORDERS_COLLECTION,
  TAKE_OUT_ORDERS_COLLECTION,
} from "@/lib/order-history-firestore";
import { calculateTaxBreakdown, orderItemsSubtotal } from "@/lib/order-calculations";
import { reverseOrder } from "@/services/rewardsService";
import { DiscountType, OrderType } from "@/types/enum";

const REVERSE_TIMEOUT_MS = 10_000;

export type ReverseRewardsResult = {
  /** Staff-facing warning when points could not be reversed. */
  warning: string | null;
  /** Fresh loyalty / taxBreakDown to put on the local copy of the order. */
  patch: Partial<Pick<Order, "loyalty" | "taxBreakDown">>;
};

/**
 * After an order is cancelled: gives back redeemed points and removes earned points.
 * Never throws — the order is already cancelled. If points could not be reversed the
 * order is marked `loyalty.reversePending` and a warning is returned.
 */
export async function reverseCancelledOrderRewards(
  orderType: OrderType,
  orderId: string,
): Promise<ReverseRewardsResult> {
  const none: ReverseRewardsResult = { warning: null, patch: {} };

  const ref = bizDoc(orderType === OrderType.DineIn
      ? DINE_IN_ORDERS_COLLECTION
      : TAKE_OUT_ORDERS_COLLECTION,
    orderId,
  );

  let loyalty: OrderLoyalty | undefined;
  try {
    // Read fresh: points may have been collected on a POS moments ago.
    loyalty = ((await getDoc(ref)).data() as AnyOrder | undefined)?.loyalty;
  } catch {
    return none;
  }
  if (!loyalty?.memberId || loyalty.reversedAt) return none;
  if (loyalty.pointsEarned == null && !loyalty.pointsRedeemed) return none;

  try {
    const result = await Promise.race([
      reverseOrder(loyalty.memberId, orderId),
      new Promise<never>((_, reject) =>
        setTimeout(
          () => reject(new Error("No response from Rewards.")),
          REVERSE_TIMEOUT_MS,
        ),
      ),
    ]);
    const reversedFields = {
      "loyalty.reversedAt": serverTimestamp(),
      "loyalty.pointsReversed": result.pointsChanged,
      "loyalty.reversePending": false,
    };
    try {
      await runTransaction(clientDb, async (tx) => {
        const snap = await tx.get(ref);
        if (!snap.exists()) return;
        const order = snap.data() as AnyOrder;
        // The redeemed points went back to the member, so the rewards discount
        // goes too — otherwise un-cancelling would keep a free discount.
        const d = order.taxBreakDown?.discount;
        const isRedemptionDiscount =
          Boolean(loyalty?.redeemedAmount) &&
          d?.discountType === DiscountType.Amount &&
          d.discountValue === loyalty?.redeemedAmount;
        tx.update(ref, {
          ...reversedFields,
          ...(isRedemptionDiscount
            ? {
                taxBreakDown: calculateTaxBreakdown(
                  orderItemsSubtotal(order.orderItems),
                  DiscountType.None,
                  0,
                ),
              }
            : {}),
        });
      });
    } catch {
      // Offline etc.: at least record the reverse so rewards stay blocked on this order.
      await updateDoc(ref, reversedFields).catch(() => {});
    }
    return { warning: null, patch: await readPatch(ref) };
  } catch (err) {
    await updateDoc(ref, { "loyalty.reversePending": true }).catch(() => {});
    const reason = err instanceof Error ? err.message : "Rewards request failed.";
    return {
      warning: `The order was cancelled, but ${loyalty.memberName}'s rewards points were not reversed. ${reason}`,
      patch: await readPatch(ref),
    };
  }
}

async function readPatch(
  ref: ReturnType<typeof doc>,
): Promise<ReverseRewardsResult["patch"]> {
  try {
    const order = (await getDoc(ref)).data() as AnyOrder | undefined;
    if (!order) return {};
    return { loyalty: order.loyalty, taxBreakDown: order.taxBreakDown };
  } catch {
    return {};
  }
}
