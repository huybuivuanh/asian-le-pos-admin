import { bizCol } from "@/lib/business";
import {
  Timestamp,
  doc,
  getDocs,
  orderBy,
  query,
  setDoc,
  updateDoc,
  where,
  writeBatch,
  type DocumentData,
} from "firebase/firestore";
import { clientDb } from "@/lib/firebase-config";
import { asTimestamp } from "@/lib/firestore-timestamp";
import { OrderStatus, OrderType, TableStatus } from "@/types/enum";

export const TAKE_OUT_ORDERS_COLLECTION = "takeOutOrders";
export const DINE_IN_ORDERS_COLLECTION = "dineInOrders";

/** Fields an order card changes on the local copy of an order. */
export type OrderCardPatch = Partial<
  Pick<Order, "status" | "loyalty" | "taxBreakDown">
>;

export type OrderHistoryLoadedOrder =
  | (TakeOutOrder & { id: string })
  | (DineInOrder & { id: string });

export function dateToLocalKey(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

/** Local calendar day [start, end] as Firestore timestamps (browser local timezone). */
export function localDayBoundsFromDateKey(
  dateKey: string,
): { start: Timestamp; end: Timestamp } | null {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(dateKey);
  if (!match) return null;
  const y = Number(match[1]);
  const mo = Number(match[2]);
  const d = Number(match[3]);
  const start = new Date(y, mo - 1, d, 0, 0, 0, 0);
  const end = new Date(y, mo - 1, d, 23, 59, 59, 999);
  if (
    start.getFullYear() !== y ||
    start.getMonth() !== mo - 1 ||
    start.getDate() !== d
  ) {
    return null;
  }
  return {
    start: Timestamp.fromDate(start),
    end: Timestamp.fromDate(end),
  };
}

function normalizeFulfillment(
  raw: DocumentData["fulfillment"],
): TakeOutFulfillment {
  if (raw == null || typeof raw !== "object") {
    return { kind: "immediate" };
  }
  const k = (raw as { kind?: string }).kind;
  if (k === "scheduled") {
    const scheduledAt = (raw as { scheduledAt?: unknown }).scheduledAt;
    return {
      kind: "scheduled",
      scheduledAt: asTimestamp(scheduledAt),
    };
  }
  return {
    kind: "immediate",
    readyTimeMinutes: (raw as { readyTimeMinutes?: number }).readyTimeMinutes,
  };
}

function normalizeTakeOutOrderDoc(
  id: string,
  data: DocumentData,
): TakeOutOrder & { id: string } {
  return {
    ...(data as TakeOutOrder),
    id,
    createdAt: asTimestamp(data.createdAt),
    fulfillment: normalizeFulfillment(data.fulfillment),
  };
}

function normalizeDineInOrderDoc(
  id: string,
  data: DocumentData,
): DineInOrder & { id: string } {
  return {
    ...(data as DineInOrder),
    id,
    createdAt: asTimestamp(data.createdAt),
  };
}

export type OrderHistoryChannel = "takeOut" | "dineIn";

export async function fetchOrdersForHistory(
  channel: OrderHistoryChannel,
  dateKey: string,
): Promise<OrderHistoryLoadedOrder[]> {
  const colName =
    channel === "takeOut"
      ? TAKE_OUT_ORDERS_COLLECTION
      : DINE_IN_ORDERS_COLLECTION;
  const ref = bizCol(colName);
  const bounds = localDayBoundsFromDateKey(dateKey);
  if (bounds == null) {
    return [];
  }
  const q = query(
    ref,
    where("createdAt", ">=", bounds.start),
    where("createdAt", "<=", bounds.end),
    orderBy("createdAt", "desc"),
  );
  const snap = await getDocs(q);

  if (channel === "takeOut") {
    return snap.docs.map((d) => normalizeTakeOutOrderDoc(d.id, d.data()));
  }
  return snap.docs.map((d) => normalizeDineInOrderDoc(d.id, d.data()));
}

export async function fetchAllTakeOutOrders(): Promise<
  (TakeOutOrder & { id: string })[]
> {
  const snap = await getDocs(
    query(
      bizCol(TAKE_OUT_ORDERS_COLLECTION),
      orderBy("createdAt", "desc"),
    ),
  );
  return snap.docs.map((d) => normalizeTakeOutOrderDoc(d.id, d.data()));
}

export async function fetchOrdersForAnalytics(): Promise<
  OrderHistoryLoadedOrder[]
> {
  const [takeOutSnap, dineInSnap] = await Promise.all([
    getDocs(
      query(
        bizCol(TAKE_OUT_ORDERS_COLLECTION),
        orderBy("createdAt", "desc"),
      ),
    ),
    getDocs(
      query(
        bizCol(DINE_IN_ORDERS_COLLECTION),
        orderBy("createdAt", "desc"),
      ),
    ),
  ]);
  return [
    ...takeOutSnap.docs.map((d) => normalizeTakeOutOrderDoc(d.id, d.data())),
    ...dineInSnap.docs.map((d) => normalizeDineInOrderDoc(d.id, d.data())),
  ];
}

export function isTakeOutLoadedOrder(
  o: OrderHistoryLoadedOrder,
): o is TakeOutOrder & { id: string } {
  return o.orderType === OrderType.TakeOut;
}

export function isOrderPaid(order: OrderHistoryLoadedOrder): boolean {
  const items = order.orderItems ?? [];
  return items.length > 0 && items.every((item) => item.paid === true);
}

type OrderDraft = Partial<Order> & {
  customerName?: string;
  phoneNumber?: string;
  fulfillment?: TakeOutFulfillment;
  tableNumber?: string;
  guests?: number;
};

export const submitToPrintQueue = async (order: OrderDraft) => {
  if (!order.id) throw new Error("Order ID is required to print.");
  const printQueueRef = doc(bizCol("printQueue"));
  const forPrint: OrderDraft = {
    ...order,
    printed: false,
    orderItems: order.orderItems ?? [],
  };
  await setDoc(printQueueRef, forPrint as Record<string, unknown>);
};

/**
 * Sets an order's status. When a dine-in order is finished (completed or cancelled),
 * the table still holding it is freed in the same batch, so the order and its table
 * can't end up disagreeing.
 */
async function setOrderStatus(order: OrderDraft, status: OrderStatus): Promise<void> {
  const colName =
    order.orderType === OrderType.TakeOut
      ? TAKE_OUT_ORDERS_COLLECTION
      : DINE_IN_ORDERS_COLLECTION;
  const batch = writeBatch(clientDb);
  batch.update(doc(bizCol(colName), order.id!), { status });

  const finished =
    status === OrderStatus.Completed || status === OrderStatus.Cancelled;
  if (order.orderType === OrderType.DineIn && finished && order.tableNumber) {
    const tables = await getDocs(
      query(
        bizCol("tables"),
        where("tableNumber", "==", order.tableNumber),
        where("currentOrderId", "==", order.id),
      ),
    );
    for (const t of tables.docs) {
      batch.update(t.ref, {
        currentOrderId: null,
        status: TableStatus.Open,
        guests: 0,
      });
    }
  }
  await batch.commit();
}

/** Toggles Completed ↔ In Progress. */
export const completeOrder = async (
  order: OrderDraft,
): Promise<OrderStatus> => {
  if (!order.id) throw new Error("Order ID is required to complete.");
  const status =
    order.status === OrderStatus.Completed
      ? OrderStatus.InProgress
      : OrderStatus.Completed;
  await setOrderStatus(order, status);
  return status;
};

/** Toggles Cancelled ↔ In Progress. */
export const cancelOrder = async (order: OrderDraft): Promise<OrderStatus> => {
  if (!order.id) throw new Error("Order ID is required to cancel.");
  const status =
    order.status === OrderStatus.Cancelled
      ? OrderStatus.InProgress
      : OrderStatus.Cancelled;
  await setOrderStatus(order, status);
  return status;
};

export const markOrderPaid = async (
  order: OrderHistoryLoadedOrder,
  paid: boolean,
): Promise<OrderHistoryLoadedOrder["orderItems"]> => {
  if (!order.id) throw new Error("Order ID is required to mark as paid.");
  const colName =
    order.orderType === OrderType.TakeOut
      ? TAKE_OUT_ORDERS_COLLECTION
      : DINE_IN_ORDERS_COLLECTION;
  const nextItems = (order.orderItems ?? []).map((item) => ({
    ...item,
    paid,
  }));
  const orderRef = doc(bizCol(colName), order.id);
  await updateDoc(orderRef, {
    orderItems: nextItems,
  });
  return nextItems;
};
