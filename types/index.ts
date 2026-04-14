// Shared domain types.

export type UserRole = "owner" | "developer" | "project_lead";
export type Language = "es" | "en";
export type ProjectStatus = "active" | "paused" | "archived";
export type CustomWorkTypeScope = "global" | "project";
export type CustomWorkTypeStatus = "active" | "archived";

export type WorkType =
  | "spec"
  | "build"
  | "debug"
  | "polish"
  | "arch"
  | "client"
  | "meeting"
  | "admin"
  | "other";

export const AI_CYCLE_WORK_TYPES: readonly WorkType[] = [
  "spec",
  "build",
  "debug",
  "polish",
] as const;

export type SessionFeedback = "difficult" | "flowed" | "blocked";

export type WorkTypeGroup = "ai_cycle" | "other";

export type WorkTypeMetaEntry = {
  label_es: string;
  label_en: string;
  color: string; // Tailwind class
  group: WorkTypeGroup;
  emoji: string;
};

export const WORK_TYPE_META: Record<WorkType, WorkTypeMetaEntry> = {
  spec: {
    label_es: "Especificación",
    label_en: "Speccing",
    color: "bg-violet-500",
    group: "ai_cycle",
    emoji: "📝",
  },
  build: {
    label_es: "Desarrollo IA",
    label_en: "AI Development",
    color: "bg-blue-500",
    group: "ai_cycle",
    emoji: "🤖",
  },
  debug: {
    label_es: "Depuración",
    label_en: "Debugging",
    color: "bg-red-500",
    group: "ai_cycle",
    emoji: "🔍",
  },
  polish: {
    label_es: "Refinado UI",
    label_en: "UI Polishing",
    color: "bg-indigo-400",
    group: "ai_cycle",
    emoji: "✨",
  },
  arch: {
    label_es: "Infraestructura",
    label_en: "Infrastructure",
    color: "bg-teal-500",
    group: "other",
    emoji: "🏗️",
  },
  client: {
    label_es: "Cliente",
    label_en: "Client Work",
    color: "bg-emerald-500",
    group: "other",
    emoji: "🤝",
  },
  meeting: {
    label_es: "Reunión",
    label_en: "Meetings",
    color: "bg-yellow-500",
    group: "other",
    emoji: "💬",
  },
  admin: {
    label_es: "Administración",
    label_en: "Admin",
    color: "bg-gray-400",
    group: "other",
    emoji: "📋",
  },
  other: {
    label_es: "Otro",
    label_en: "Other",
    color: "bg-gray-300",
    group: "other",
    emoji: "📦",
  },
};

// Row types matching the schema.

export type KokuUser = {
  id: string;
  role: UserRole;
  preferred_language: Language;
  timezone: string;
  after_hours_start: string;
  after_hours_end: string;
  weekly_mirror_enabled: boolean;
  baseline_completed: boolean;
  created_at: string;
};

export type Project = {
  id: string;
  name: string;
  client_name: string | null;
  status: ProjectStatus;
  billable: boolean;
  hourly_rate: string | null;
  created_by: string | null;
  created_at: string;
};

export type ProjectMember = {
  project_id: string;
  user_id: string;
  role: "lead" | "member";
  assigned_at: string;
};

export type CustomWorkType = {
  id: string;
  name: string;
  scope: CustomWorkTypeScope;
  project_id: string | null;
  color: string;
  status: CustomWorkTypeStatus;
  created_by: string | null;
  created_at: string;
};

export type Session = {
  id: string;
  user_id: string;
  project_id: string;
  work_type: WorkType;
  custom_work_type_id: string | null;
  started_at: string;
  ended_at: string | null;
  duration_minutes: number | null;
  note: string | null;
  feedback: SessionFeedback | null;
  is_active: boolean;
  is_baseline: boolean;
  invoiced: boolean;
  invoice_id: string | null;
  updated_at: string;
  created_at: string;
};
