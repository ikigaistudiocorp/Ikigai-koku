// English translation strings.
export const en = {
  app_name: "Koku",
  app_tagline: "刻 — The Time",
  nav_clock: "Clock",
  nav_dashboard: "Dashboard",
  nav_projects: "Projects",
  nav_reports: "Reports",
  nav_settings: "Settings",

  clock_greeting_morning: "Good morning",
  clock_greeting_afternoon: "Good afternoon",
  clock_greeting_evening: "Good evening",
  clock_today_summary: "Today: {hours}h {minutes}m across {count} sessions",
  clock_no_sessions: "No sessions today",
  clock_select_project: "Select project",
  clock_select_worktype: "Work type",
  clock_button_start: "START",
  clock_button_stop: "STOP",
  clock_note_placeholder: "Optional note...",
  clock_switch_type: "Switch type",
  clock_active_on: "Working on",
  clock_session_saved: "Session saved: {duration} — {type} on {project}",
  clock_session_discarded: "Session too short — not logged",

  feedback_label: "How was this session?",
  feedback_difficult: "Harder than it should have been",
  feedback_flowed: "Smooth sailing",
  feedback_blocked: "Kept hitting walls",
  feedback_skip: "Skip",

  worktype_group_ai: "AI Development Cycle",
  worktype_group_other: "Everything else",

  hire_signal_label: "Hire Signal",
  hire_signal_green: "No signal",
  hire_signal_amber: "Caution",
  hire_signal_red: "Hire",

  burnout_green: "Healthy",
  burnout_amber: "Caution",
  burnout_red: "Alert",

  status_active: "Active",
  status_paused: "Paused",
  status_archived: "Archived",

  custom_work_type_label: "Custom",

  onboarding_title: "Welcome to Koku",
  onboarding_subtitle:
    "Before we start, tell us how many hours you worked recently.",
  onboarding_instruction:
    "These are estimates — they don't need to be exact.",
  onboarding_submit: "Start using Koku",
  onboarding_week_label: "{n} weeks ago",
  onboarding_week_label_one: "Last week",
  onboarding_saving: "Saving...",

  login_name: "Name",
  login_email: "Email",
  login_password: "Password",
  login_signin: "Sign in",
  login_register: "Create account",
  login_first_user_cta: "First user?",
  login_register_link: "Register",
  login_back_to_signin: "Back to sign in",

  common_cancel: "Cancel",
  common_save: "Save",
  common_loading: "Loading...",
  common_error: "Something went wrong",
} as const;
