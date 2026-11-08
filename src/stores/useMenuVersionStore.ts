"use client";

import { bizDoc } from "@/lib/business";
import { create } from "zustand";
import {
  onSnapshot,
  updateDoc,
  increment,
  Timestamp,
} from "firebase/firestore";
import { asTimestamp } from "@/lib/firestore-timestamp";

type MenuVersion = {
  version: number;
  lastUpdated: Timestamp | null;
};

type MenuVersionState = {
  version: MenuVersion | null;
  loading: boolean;
  subscribe: () => () => void;
  publishMenu: () => Promise<void>;
};

export const useMenuVersionStore = create<MenuVersionState>((set) => ({
  version: null,
  loading: true,

  subscribe: () => {
    const ref = bizDoc("menuVersion", "versionDoc");

    const unsub = onSnapshot(ref, (snapshot) => {
      if (snapshot.exists()) {
        const data = snapshot.data();
        set({
          version: {
            version: data.version ?? 0,
            lastUpdated:
              data.lastUpdated != null
                ? asTimestamp(data.lastUpdated)
                : null,
          },
          loading: false,
        });
      } else {
        set({ version: null, loading: false });
      }
    });

    return unsub;
  },

  publishMenu: async () => {
    const ref = bizDoc("menuVersion", "versionDoc");

    await updateDoc(ref, {
      lastUpdated: Timestamp.now(),
      version: increment(1),
    });
  },
}));
