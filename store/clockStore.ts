"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";

type State = {
  selectedProjectId: string | null;
  setSelectedProjectId: (id: string | null) => void;
};

export const useClockStore = create<State>()(
  persist(
    (set) => ({
      selectedProjectId: null,
      setSelectedProjectId: (id) => set({ selectedProjectId: id }),
    }),
    { name: "koku-clock" }
  )
);
