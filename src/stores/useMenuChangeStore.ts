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

type MenuChangeState = {
  menuChanges: MenuChange[];
  loading: boolean;
  error: string | null;
  subscribe: () => () => void;
  createMenuChange: (name: string) => Promise<void>;
  renameMenuChange: (id: string, name: string) => Promise<void>;
  deleteMenuChange: (id: string) => Promise<void>;
  addItemChange: (id: string, change: ItemChange) => Promise<void>;
  updateItemChange: (
    id: string,
    index: number,
    change: ItemChange,
  ) => Promise<void>;
  removeItemChange: (id: string, index: number) => Promise<void>;
};

function normalizeName(name: string): string {
  const trimmed = name.trim();
  if (!trimmed) {
    throw new Error("Name cannot be empty.");
  }
  return trimmed;
}

function normalizeItemChange(change: ItemChange): ItemChange {
  const from = change.from.trim().toUpperCase();
  const to = change.to.trim().toUpperCase();
  if (!from || !to) {
    throw new Error('"From" and "To" cannot be empty.');
  }
  return { from, to, price: change.price };
}

export const useMenuChangeStore = create<MenuChangeState>((set, get) => ({
  menuChanges: [],
  loading: true,
  error: null,

  subscribe: () => {
    const ref = bizCol("menuChanges");
    const q = query(ref, orderBy("createdAt", "desc"));
    const unsub = onSnapshot(
      q,
      (snapshot) => {
        const menuChanges: MenuChange[] = snapshot.docs.map((d) => {
          const raw = d.data();
          const rawChanges = Array.isArray(raw.changes) ? raw.changes : [];
          return {
            id: d.id,
            name: String(raw.name ?? ""),
            changes: rawChanges.map((c) => ({
              from: String(c?.from ?? ""),
              to: String(c?.to ?? ""),
              price: typeof c?.price === "number" ? c.price : 0,
            })),
            createdAt:
              raw.createdAt === undefined
                ? undefined
                : (asTimestamp(raw.createdAt) as Timestamp),
          } as MenuChange;
        });
        set({ menuChanges, loading: false, error: null });
      },
      (err) => set({ error: err.message, loading: false }),
    );
    return unsub;
  },

  createMenuChange: async (name) => {
    const ref = bizCol("menuChanges");
    await addDoc(ref, {
      name: normalizeName(name),
      changes: [],
      createdAt: Timestamp.now(),
    });
  },

  renameMenuChange: async (id, name) => {
    const ref = bizDoc("menuChanges", id);
    await updateDoc(ref, { name: normalizeName(name) });
  },

  deleteMenuChange: async (id) => {
    const ref = bizDoc("menuChanges", id);
    await deleteDoc(ref);
  },

  addItemChange: async (id, change) => {
    const current = get().menuChanges.find((mc) => mc.id === id);
    if (!current) throw new Error("Menu change not found.");
    const ref = bizDoc("menuChanges", id);
    await updateDoc(ref, {
      changes: [...current.changes, normalizeItemChange(change)],
    });
  },

  updateItemChange: async (id, index, change) => {
    const current = get().menuChanges.find((mc) => mc.id === id);
    if (!current) throw new Error("Menu change not found.");
    if (index < 0 || index >= current.changes.length) {
      throw new Error("Item change not found.");
    }
    const next = normalizeItemChange(change);
    const ref = bizDoc("menuChanges", id);
    await updateDoc(ref, {
      changes: current.changes.map((c, i) => (i === index ? next : c)),
    });
  },

  removeItemChange: async (id, index) => {
    const current = get().menuChanges.find((mc) => mc.id === id);
    if (!current) throw new Error("Menu change not found.");
    const ref = bizDoc("menuChanges", id);
    await updateDoc(ref, {
      changes: current.changes.filter((_, i) => i !== index),
    });
  },
}));
