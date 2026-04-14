import type { WorkType } from "@/types";

export const VALID_WORK_TYPES: readonly WorkType[] = [
  "spec",
  "build",
  "debug",
  "polish",
  "arch",
  "client",
  "meeting",
  "admin",
  "other",
] as const;

export function isWorkType(v: unknown): v is WorkType {
  return typeof v === "string" && (VALID_WORK_TYPES as readonly string[]).includes(v);
}

export const MAX_NOTE_LENGTH = 140;
export const MIN_DURATION_MINUTES = 3;

export const VALID_FEEDBACK = ["difficult", "flowed", "blocked"] as const;
export function isFeedback(v: unknown): v is (typeof VALID_FEEDBACK)[number] {
  return typeof v === "string" && (VALID_FEEDBACK as readonly string[]).includes(v);
}

// 8 neutral colors to rotate through when auto-assigning custom work-type hues.
export const CUSTOM_WORK_TYPE_PALETTE = [
  "#6B7280",
  "#9CA3AF",
  "#7C3AED",
  "#0EA5E9",
  "#14B8A6",
  "#F97316",
  "#EC4899",
  "#84CC16",
] as const;
