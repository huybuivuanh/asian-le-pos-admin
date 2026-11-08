"use client";

import { bizCol, bizDoc } from "@/lib/business";
import { create } from "zustand";
import {
  addDoc,
  updateDoc,
  onSnapshot,
  query,
  orderBy,
} from "firebase/firestore";
import { sortByAlphabet } from "@/lib/list-utils";
import { asTimestamp } from "@/lib/firestore-timestamp";

interface OptionStore {
  options: ItemOption[];
  loading: boolean;
  createOption: (option: Omit<ItemOption, "id">) => Promise<void>;
  updateOption: (id: string, data: Partial<ItemOption>) => Promise<void>;
  subscribe: () => () => void;
}

export const useOptionStore = create<OptionStore>((set) => ({
  options: [],
  loading: true,

  subscribe: () => {
    const q = query(
      bizCol("options"),
      orderBy("createdAt", "desc")
    );
    const unsub = onSnapshot(q, (snapshot) => {
      const opts: ItemOption[] = snapshot.docs.map((d) => {
        const raw = d.data();
        return {
          id: d.id,
          ...raw,
          createdAt: asTimestamp(raw.createdAt),
        } as ItemOption;
      });
      const sortedData = sortByAlphabet(opts);
      set({ options: sortedData, loading: false });
    });
    return unsub;
  },

  createOption: async (option) => {
    await addDoc(bizCol("options"), option);
  },

  updateOption: async (id, data) => {
    await updateDoc(bizDoc("options", id), data);
  },
}));
