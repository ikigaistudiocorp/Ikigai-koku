"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";

export type PendingStop = {
  session_id: string;
  note: string | null;
  feedback: "difficult" | "flowed" | "blocked" | null;
  queued_at: number;
};

type State = {
  selectedProjectId: string | null;
  setSelectedProjectId: (id: string | null) => void;
  pendingStop: PendingStop | null;
  setPendingStop: (p: PendingStop | null) => void;
};

export const useClockStore = create<State>()(
  persist(
    (set) => ({
      selectedProjectId: null,
      setSelectedProjectId: (id) => set({ selectedProjectId: id }),
      pendingStop: null,
      setPendingStop: (p) => set({ pendingStop: p }),
    }),
    { name: "koku-clock" }
  )
);
