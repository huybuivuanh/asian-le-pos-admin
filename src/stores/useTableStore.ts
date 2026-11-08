"use client";

import { bizCol, bizDoc } from "@/lib/business";
import { create } from "zustand";
import {
  onSnapshot,
  updateDoc,
  deleteDoc,
  runTransaction,
} from "firebase/firestore";
import { clientDb } from "@/lib/firebase-config";
import { TableStatus } from "@/types/enum";

function parseTableStatus(value: unknown): TableStatus {
  if (value === TableStatus.Occupied) return TableStatus.Occupied;
  return TableStatus.Open;
}

/**
 * Table doc IDs equal their tableNumber (POS app builds the doc ref
 * directly from tableNumber, no lookup) — so this doubles as doc-ID
 * validation: no "/", and not "." or ".." (both illegal/reserved).
 */
function normalizeTableNumber(value: string): string {
  const trimmed = value.trim();
  if (!trimmed) {
    throw new Error("Table number cannot be empty.");
  }
  if (trimmed.includes("/")) {
    throw new Error('Table number cannot contain "/".');
  }
  if (trimmed === "." || trimmed === "..") {
    throw new Error(`Table number cannot be "${trimmed}".`);
  }
  return trimmed;
}

type TableState = {
  tables: Table[];
  loading: boolean;
  subscribe: () => () => void;
  createTable: (table: Omit<Table, "id">) => Promise<void>;
  renameTable: (oldId: string, newTableNumber: string) => Promise<void>;
  updateTable: (
    id: string,
    table: Partial<Omit<Table, "id" | "tableNumber">>,
  ) => Promise<void>;
  deleteTable: (id: string) => Promise<void>;
};

function sortTablesByNumber(a: Table, b: Table): number {
  return a.tableNumber.localeCompare(b.tableNumber, undefined, {
    numeric: true,
    sensitivity: "base",
  });
}

export const useTableStore = create<TableState>((set) => ({
  tables: [],
  loading: true,

  subscribe: () => {
    const ref = bizCol("tables");
    const unsub = onSnapshot(ref, (snapshot) => {
      const data = snapshot.docs.map((d) => {
        const raw = d.data();
        return {
          id: d.id,
          tableNumber: String(raw.tableNumber ?? ""),
          status: parseTableStatus(raw.status),
          guests: typeof raw.guests === "number" ? raw.guests : 0,
          currentOrderId:
            raw.currentOrderId === undefined || raw.currentOrderId === null
              ? null
              : String(raw.currentOrderId),
        } as Table;
      });
      data.sort(sortTablesByNumber);
      set({ tables: data, loading: false });
    });
    return unsub;
  },

  createTable: async (table) => {
    const tableNumber = normalizeTableNumber(table.tableNumber);
    const ref = bizDoc("tables", tableNumber);
    await runTransaction(clientDb, async (tx) => {
      const existing = await tx.get(ref);
      if (existing.exists()) {
        throw new Error(`Table "${tableNumber}" already exists.`);
      }
      tx.set(ref, {
        tableNumber,
        status: table.status,
        guests: table.guests,
        currentOrderId: table.currentOrderId,
      });
    });
  },

  renameTable: async (oldId, newTableNumber) => {
    const nextId = normalizeTableNumber(newTableNumber);
    if (nextId === oldId) return;

    const oldRef = bizDoc("tables", oldId);
    const newRef = bizDoc("tables", nextId);
    await runTransaction(clientDb, async (tx) => {
      const [oldSnap, newSnap] = await Promise.all([
        tx.get(oldRef),
        tx.get(newRef),
      ]);
      if (!oldSnap.exists()) {
        throw new Error(`Table "${oldId}" no longer exists.`);
      }
      if (newSnap.exists()) {
        throw new Error(`Table "${nextId}" already exists.`);
      }
      const data = oldSnap.data();
      tx.set(newRef, {
        tableNumber: nextId,
        status: data.status,
        guests: data.guests,
        currentOrderId: data.currentOrderId ?? null,
      });
      tx.delete(oldRef);
    });
  },

  updateTable: async (id, table) => {
    const ref = bizDoc("tables", id);
    await updateDoc(ref, table);
  },

  deleteTable: async (id) => {
    const ref = bizDoc("tables", id);
    await deleteDoc(ref);
  },
}));
