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

type OptionGroupState = {
  optionGroups: OptionGroup[];
  loading: boolean;
  subscribe: () => () => void;
  createOptionGroup: (group: OptionGroup) => Promise<void>;
  updateOptionGroup: (id: string, group: Partial<OptionGroup>) => Promise<void>;
};

export const useOptionGroupStore = create<OptionGroupState>((set) => ({
  optionGroups: [],
  loading: true,

  subscribe: () => {
    const ref = bizCol("optionGroups");
    const q = query(ref, orderBy("createdAt", "desc"));
    const unsub = onSnapshot(q, (snapshot) => {
      const data = snapshot.docs.map((doc) => {
        const docData = doc.data();
        const multipleOptionQuantity =
          typeof docData.multipleOptionQuantity === "boolean"
            ? docData.multipleOptionQuantity
            : docData.multipleSelection === true;
        return {
          id: doc.id,
          ...docData,
          multipleOptionQuantity,
          createdAt: asTimestamp(docData.createdAt),
        } as OptionGroup;
      });
      const sortedData = sortByAlphabet(data);
      set({ optionGroups: sortedData, loading: false });
    });
    return unsub;
  },

  createOptionGroup: async (group) => {
    const ref = bizCol("optionGroups");
    await addDoc(ref, group);
  },

  updateOptionGroup: async (id, group) => {
    const ref = bizDoc("optionGroups", id);
    await updateDoc(ref, group);
  },
}));
