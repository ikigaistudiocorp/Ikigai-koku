// Spanish translation strings.
export const es = {
  app_name: "Koku",
  app_tagline: "刻 — El Tiempo",
  nav_clock: "Registrar",
  nav_dashboard: "Panel",
  nav_projects: "Proyectos",
  nav_reports: "Reportes",
  nav_settings: "Configuración",

  clock_greeting_morning: "Buenos días",
  clock_greeting_afternoon: "Buenas tardes",
  clock_greeting_evening: "Buenas noches",
  clock_today_summary: "Hoy: {hours}h {minutes}m en {count} sesiones",
  clock_no_sessions: "Sin sesiones hoy",
  clock_select_project: "Seleccionar proyecto",
  clock_select_worktype: "Tipo de trabajo",
  clock_button_start: "INICIAR",
  clock_button_stop: "DETENER",
  clock_note_placeholder: "Nota opcional...",
  clock_switch_type: "Cambiar tipo",
  clock_active_on: "Trabajando en",
  clock_session_saved: "Sesión guardada: {duration} — {type} en {project}",
  clock_session_discarded: "Sesión muy corta — no registrada",

  feedback_label: "¿Cómo fue esta sesión?",
  feedback_difficult: "Más difícil de lo que debería",
  feedback_flowed: "Todo fluyó",
  feedback_blocked: "No pude avanzar",
  feedback_skip: "Omitir",

  worktype_group_ai: "Ciclo de Desarrollo IA",
  worktype_group_other: "Todo lo demás",

  hire_signal_label: "Señal de Contratación",
  hire_signal_green: "Sin señal",
  hire_signal_amber: "Precaución",
  hire_signal_red: "Contratar",

  burnout_green: "Saludable",
  burnout_amber: "Precaución",
  burnout_red: "Alerta",

  status_active: "Activo",
  status_paused: "Pausado",
  status_archived: "Archivado",

  custom_work_type_label: "Personalizado",

  onboarding_title: "Bienvenido a Koku",
  onboarding_subtitle:
    "Antes de comenzar, dinos cuántas horas trabajaron recientemente.",
  onboarding_instruction:
    "Estos son estimados — no necesitan ser exactos.",
  onboarding_submit: "Empezar a usar Koku",
  onboarding_week_label: "Hace {n} semanas",
  onboarding_week_label_one: "Hace 1 semana",
  onboarding_saving: "Guardando...",

  login_name: "Nombre",
  login_email: "Email",
  login_password: "Contraseña",
  login_signin: "Iniciar sesión",
  login_register: "Crear cuenta",
  login_first_user_cta: "¿Primer usuario?",
  login_register_link: "Regístrate",
  login_back_to_signin: "Volver a iniciar sesión",

  offline_banner: "Sin conexión",
  offline_detail: "Los datos se sincronizarán al reconectar",

  common_cancel: "Cancelar",
  common_save: "Guardar",
  common_loading: "Cargando...",
  common_error: "Algo salió mal",
} as const;
