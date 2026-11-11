import type { Timestamp } from "firebase/firestore";
import type {
  DiscountType,
  KitchenType,
  OrderStatus,
  OrderType,
  TableStatus,
} from "@/types/enum";

declare global {
  // ---------- Users ----------
  interface User {
    id?: string;
    name: string;
    email: string;
    role: string;
    createdAt: Timestamp;
  }

  // ---------- Rewards (read-only, from /api/rewards) ----------
  /** businesses/{id}/members/{uid}. Dates are epoch millis (sent as JSON). */
  interface RewardsMember {
    id: string;
    name: string;
    email: string;
    /** 10 digits, e.g. "3067647799". */
    phone: string;
    points: number;
    joinedAt: number | null;
  }

  type RewardsTransactionType = "earn" | "redeem" | "reverse";

  /**
   * members/{uid}/transactions/{id}, written only by the rewards functions.
   * Ids are `earn_<orderId>`, `welcome_<orderId>`, `redeem_<orderId>`, `reverse_<orderId>`.
   */
  interface RewardsTransaction {
    id: string;
    type: RewardsTransactionType;
    /** Change to the balance: +42 earned, -100 redeemed; a reverse undoes one. */
    points: number;
    orderId: string;
    createdAt: number | null;
    /** earn only: pre-tax subtotal in dollars the points came from. */
    subtotal?: number;
    /** redeem only: dollars off the order. */
    discount?: number;
  }

  // ---------- Menu ----------
  interface FoodCategory {
    id?: string;
    name: string;
    itemIds?: string[];
    order: number;
    createdAt: Timestamp;
  }

  interface OptionGroupId {
    optionGroupId: string;
    order: number;
  }

  interface MenuItem {
    id?: string;
    name: string;
    price: number;
    optionGroupIds?: OptionGroupId[];
    categoryIds?: string[];
    kitchenType: KitchenType;
    createdAt: Timestamp;
  }

  interface OptionGroup {
    id?: string;
    name: string;
    minSelection: number;
    maxSelection: number;
    multipleOptionQuantity: boolean;
    optionIds?: string[];
    itemIds?: string[];
    defaultOptionId?: string;
    createdAt: Timestamp;
  }

  interface ItemOption {
    id?: string;
    name: string;
    price: number;
    groupIds?: string[];
    createdAt: Timestamp;
  }

  interface MenuChange {
    id?: string;
    name: string;
    changes: ItemChange[];
    createdAt: Timestamp;
  }

  // ---------- Orders ----------
  interface OrderItemOption {
    name: string;
    price: number;
    quantity: number;
  }

  interface ItemChange {
    from: string;
    to: string;
    price: number;
  }

  interface AddExtra {
    description: string;
    price: number;
  }

  interface ExtraCatalogItem extends AddExtra {
    id?: string;
    createdAt: Timestamp;
  }

  interface OrderItem {
    id?: string;
    name: string;
    price: number;
    quantity: number;
    options?: OrderItemOption[];
    changes?: ItemChange[];
    extras?: AddExtra[];
    togo: boolean;
    appetizer: boolean;
    kitchenType: KitchenType;
    instructions?: string;
    paid: boolean;
    completed: boolean;
  }

  interface Discount {
    discountType: DiscountType;
    discountValue: number;
    discountAmount: number;
    taxableSubtotal: number;
  }

  interface TaxBreakDown {
    subTotal: number;
    discount?: Discount;
    pst: number;
    gst: number;
    total: number;
  }

  type TakeOutFulfillment =
    | {
        kind: "immediate";
        readyTimeMinutes?: number;
      }
    | {
        kind: "scheduled";
        scheduledAt: Timestamp;
      };

  interface Order {
    id?: string;
    staff: string;
    orderType: OrderType;
    orderItems: OrderItem[];
    taxBreakDown: TaxBreakDown;
    status: OrderStatus;
    paid: boolean;
    printed: boolean;
    createdAt: Timestamp;
    /** Rewards member attached to this order (set on first redeem or collect). */
    loyalty?: OrderLoyalty;
  }

  interface OrderLoyalty {
    memberId: string;
    memberName: string;
    /** Set when points are collected (once per order). */
    pointsEarned?: number;
    collectedAt?: Timestamp;
    /** Set when points are redeemed for an Amount discount. */
    pointsRedeemed?: number;
    redeemedAmount?: number;
    /** Set when the order was cancelled and its points were reversed. */
    reversedAt?: Timestamp;
    /** Net balance change from the reverse (refunded redeem minus removed earn). */
    pointsReversed?: number;
    /** Cancelled, but the reverse call failed — points still need reversing. */
    reversePending?: boolean;
  }

  interface TakeOutOrder extends Order {
    orderType: OrderType.TakeOut;
    customerName?: string;
    phoneNumber?: string;
    fulfillment: TakeOutFulfillment;
  }

  interface DineInOrder extends Order {
    orderType: OrderType.DineIn;
    tableNumber: string;
    guests: number;
  }

  type AnyOrder = TakeOutOrder | DineInOrder;

  // ---------- Tables ----------
  interface Table {
    id?: string;
    tableNumber: string;
    status: TableStatus;
    guests: number;
    currentOrderId: string | null;
  }

  // ---------- Customers ----------
  interface Customer {
    id?: string;
    name: string;
    phone: string;
    createdAt: Timestamp;
    isBlocked: boolean;
    note?: string;
    numberOfOrders: number;
    totalSpent: number;
  }

  // ---------- Credits ----------
  interface Credit {
    id?: string;
    name?: string;
    phoneNumber?: string;
    description?: string;
    amount: number;
    completed: boolean;
    createdAt: Timestamp;
  }
}

export {};
