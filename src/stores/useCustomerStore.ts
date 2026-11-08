"use client";

import { bizCol, bizDoc } from "@/lib/business";
import { create } from "zustand";
import {
  Timestamp,
  addDoc,
  deleteDoc,
  onSnapshot,
  orderBy,
  query,
  setDoc,
  updateDoc,
} from "firebase/firestore";
import { asTimestamp } from "@/lib/firestore-timestamp";
import { sortByAlphabet } from "@/lib/list-utils";

const CUSTOMERS_VERSION_COLLECTION = "customersVersion";
const CUSTOMERS_VERSION_DOC = "versionDoc";

// POS clients subscribe to this doc and refetch customers when it advances.
async function bumpCustomersVersion(): Promise<void> {
  await setDoc(
    bizDoc(CUSTOMERS_VERSION_COLLECTION, CUSTOMERS_VERSION_DOC),
    { version: Date.now() },
    { merge: true },
  );
}

type CustomerState = {
  customers: Customer[];
  loading: boolean;
  error: string | null;
  subscribe: () => () => void;
  createCustomer: (
    data: Omit<
      Customer,
      "id" | "createdAt" | "isBlocked" | "numberOfOrders" | "totalSpent"
    >,
  ) => Promise<void>;
  deleteCustomer: (id: string) => Promise<void>;
  updateCustomer: (id: string, data: Partial<Customer>) => Promise<void>;
};

export const useCustomerStore = create<CustomerState>((set) => ({
  customers: [],
  loading: true,
  error: null,

  subscribe: () => {
    const ref = bizCol("customers");
    const q = query(ref, orderBy("createdAt", "desc"));
    const unsub = onSnapshot(
      q,
      (snapshot) => {
        const customers: Customer[] = snapshot.docs.map((d) => {
          const raw = d.data();
          return {
            id: d.id,
            name: String(raw.name ?? ""),
            phone: String(raw.phone ?? ""),
            createdAt: asTimestamp(raw.createdAt),
            isBlocked: Boolean(raw.isBlocked),
            note: typeof raw.note === "string" ? raw.note : undefined,
            numberOfOrders: Number(raw.numberOfOrders ?? 0),
            totalSpent: Number(raw.totalSpent ?? 0),
          };
        });
        const sortedCustomers = sortByAlphabet(customers);
        set({ customers: sortedCustomers, loading: false, error: null });
      },
      (err) => {
        set({ error: err.message, loading: false });
      },
    );
    return unsub;
  },

  createCustomer: async (data) => {
    const ref = bizCol("customers");
    await addDoc(ref, {
      ...data,
      createdAt: Timestamp.now(),
      isBlocked: false,
      numberOfOrders: 0,
      totalSpent: 0,
    });
    await bumpCustomersVersion();
  },

  deleteCustomer: async (id) => {
    const ref = bizDoc("customers", id);
    await deleteDoc(ref);
  },

  updateCustomer: async (id, data) => {
    const ref = bizDoc("customers", id);
    await updateDoc(ref, { ...data, createdAt: Timestamp.now() });
    await bumpCustomersVersion();
  },
}));
