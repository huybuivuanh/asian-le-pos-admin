"use client";

import { bizCol, bizDoc } from "@/lib/business";
import { create } from "zustand";
import {
  onSnapshot,
  addDoc,
  updateDoc,
  query,
  orderBy,
} from "firebase/firestore";
import { sortByAlphabet } from "@/lib/list-utils";
import { asTimestamp } from "@/lib/firestore-timestamp";
import { normalizeMenuItemOptionGroupIds } from "@/lib/menu-item-option-groups";

type ItemState = {
  items: MenuItem[];
  loading: boolean;
  subscribe: () => () => void;
  createItem: (item: MenuItem) => Promise<void>;
  updateItem: (id: string, item: Partial<MenuItem>) => Promise<void>;
};

export const useItemStore = create<ItemState>((set) => ({
  items: [],
  loading: true,

  subscribe: () => {
    const ref = bizCol("menuItems");
    const q = query(ref, orderBy("createdAt", "desc"));
    const unsub = onSnapshot(q, (snapshot) => {
      const data = snapshot.docs.map((doc) => {
        const docData = doc.data();
        return {
          id: doc.id,
          ...docData,
          optionGroupIds: normalizeMenuItemOptionGroupIds(
            docData.optionGroupIds,
          ),
          createdAt: asTimestamp(docData.createdAt),
        } as MenuItem;
      });
      const sortedData = sortByAlphabet(data);
      set({ items: sortedData, loading: false });
    });
    return unsub;
  },

  createItem: async (item) => {
    const ref = bizCol("menuItems");
    await addDoc(ref, item);
  },

  updateItem: async (id, item) => {
    const ref = bizDoc("menuItems", id);
    await updateDoc(ref, item);
  },
}));
