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
  updateDoc,
} from "firebase/firestore";
import { asTimestamp } from "@/lib/firestore-timestamp";

type CreditState = {
  credits: Credit[];
  loading: boolean;
  error: string | null;
  subscribe: () => () => void;
  createCredit: (
    data: Omit<Credit, "id" | "createdAt" | "completed">,
  ) => Promise<void>;
  updateCredit: (id: string, data: Partial<Credit>) => Promise<void>;
  deleteCredit: (id: string) => Promise<void>;
};

export const useCreditStore = create<CreditState>((set) => ({
  credits: [],
  loading: true,
  error: null,

  subscribe: () => {
    const ref = bizCol("credits");
    const q = query(ref, orderBy("createdAt", "desc"));
    const unsub = onSnapshot(
      q,
      (snapshot) => {
        const credits: Credit[] = snapshot.docs.map((d) => {
          const raw = d.data();
          return {
            id: d.id,
            name: raw.name === undefined ? undefined : String(raw.name),
            phoneNumber:
              raw.phoneNumber === undefined
                ? undefined
                : String(raw.phoneNumber),
            description:
              raw.description === undefined
                ? undefined
                : String(raw.description),
            amount: typeof raw.amount === "number" ? raw.amount : 0,
            completed: Boolean(raw.completed),
            createdAt:
              raw.createdAt === undefined
                ? Timestamp.now()
                : (asTimestamp(raw.createdAt) as Timestamp),
          } as Credit;
        });
        set({ credits, loading: false, error: null });
      },
      (err) => set({ error: err.message, loading: false }),
    );
    return unsub;
  },

  createCredit: async (data) => {
    const ref = bizCol("credits");
    if (data.name) {
      data.name = data.name.toUpperCase();
    }
    if (data.description) {
      data.description = data.description.toUpperCase();
    }
    await addDoc(ref, {
      ...data,
      createdAt: Timestamp.now(),
      completed: false,
    });
  },

  updateCredit: async (id, data) => {
    const ref = bizDoc("credits", id);
    if (data.name) {
      data.name = data.name.toUpperCase();
    }
    if (data.description) {
      data.description = data.description.toUpperCase();
    }
    await updateDoc(ref, { ...data });
  },

  deleteCredit: async (id) => {
    const ref = bizDoc("credits", id);
    await deleteDoc(ref);
  },
}));
