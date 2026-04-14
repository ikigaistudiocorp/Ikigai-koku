// Shared domain types. Expanded across phases.
export type UserRole = "owner" | "developer" | "project_lead";
export type Language = "es" | "en";

export type WorkType =
  | "spec"
  | "build"
  | "debug"
  | "polish"
  | "devops"
  | "arch"
  | "client"
  | "meeting"
  | "admin"
  | "other";

export type SessionFeedback = "difficult" | "flowed" | "blocked";
