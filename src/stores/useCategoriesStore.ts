"use client";

import { bizCol, bizDoc } from "@/lib/business";
import { create } from "zustand";
import {
  onSnapshot,
  addDoc,
  updateDoc,
  Timestamp,
} from "firebase/firestore";
import { asTimestamp } from "@/lib/firestore-timestamp";

type CategoriesState = {
  categories: FoodCategory[];
  loading: boolean;
  subscribe: () => () => void;
  createCategory: (name: string) => Promise<void>;
  updateCategory: (
    id: string,
    category: Partial<FoodCategory>
  ) => Promise<void>;
};

export const useCategoriesStore = create<CategoriesState>((set) => ({
  categories: [],
  loading: true,

  subscribe: () => {
    const ref = bizCol("categories");
    const unsub = onSnapshot(ref, (snapshot) => {
      const data = snapshot.docs.map((doc) => {
        const raw = doc.data();
        return {
          id: doc.id,
          ...raw,
          createdAt: asTimestamp(raw.createdAt),
        } as FoodCategory;
      });
      set({
        categories: data.sort((a, b) => (a.order ?? 0) - (b.order ?? 0)),
        loading: false,
      });
    });
    return unsub;
  },

  createCategory: async (name) => {
    const ref = bizCol("categories");
    await addDoc(ref, { name, createdAt: Timestamp.now(), order: Date.now() });
  },

  updateCategory: async (id, category) => {
    const ref = bizDoc("categories", id);
    await updateDoc(ref, category);
  },
}));
