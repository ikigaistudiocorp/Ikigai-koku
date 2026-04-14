-- Koku schema. Idempotent: safe to run repeatedly.

CREATE TABLE IF NOT EXISTS koku_users (
  id TEXT PRIMARY KEY,
  role TEXT NOT NULL DEFAULT 'developer'
    CHECK (role IN ('owner', 'developer', 'project_lead')),
  preferred_language TEXT NOT NULL DEFAULT 'es'
    CHECK (preferred_language IN ('es', 'en')),
  timezone TEXT NOT NULL DEFAULT 'America/Panama',
  after_hours_start TIME DEFAULT '20:00',
  after_hours_end TIME DEFAULT '07:00',
  weekly_mirror_enabled BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS projects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  client_name TEXT,
  status TEXT NOT NULL DEFAULT 'active'
    CHECK (status IN ('active', 'paused', 'archived')),
  billable BOOLEAN NOT NULL DEFAULT true,
  hourly_rate NUMERIC(10,2),
  created_by TEXT REFERENCES koku_users(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS project_members (
  project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
  user_id TEXT REFERENCES koku_users(id) ON DELETE CASCADE,
  role TEXT NOT NULL DEFAULT 'member'
    CHECK (role IN ('lead', 'member')),
  assigned_at TIMESTAMPTZ DEFAULT NOW(),
  PRIMARY KEY (project_id, user_id)
);

CREATE TABLE IF NOT EXISTS custom_work_types (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  scope TEXT NOT NULL CHECK (scope IN ('global', 'project')),
  project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
  color TEXT NOT NULL DEFAULT '#6B7280',
  status TEXT NOT NULL DEFAULT 'active'
    CHECK (status IN ('active', 'archived')),
  created_by TEXT REFERENCES koku_users(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id TEXT NOT NULL REFERENCES koku_users(id),
  project_id UUID NOT NULL REFERENCES projects(id),
  work_type TEXT NOT NULL CHECK (work_type IN (
    'spec', 'build', 'debug', 'polish',
    'devops', 'arch', 'client', 'meeting', 'admin', 'other'
  )),
  custom_work_type_id UUID REFERENCES custom_work_types(id),
  started_at TIMESTAMPTZ NOT NULL,
  ended_at TIMESTAMPTZ,
  duration_minutes INTEGER,
  note TEXT,
  feedback TEXT CHECK (feedback IN ('difficult', 'flowed', 'blocked')),
  is_active BOOLEAN DEFAULT false,
  is_baseline BOOLEAN DEFAULT false,
  invoiced BOOLEAN DEFAULT false,
  invoice_id TEXT,
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS sessions_one_active_per_user
  ON sessions (user_id) WHERE is_active = true;

CREATE TABLE IF NOT EXISTS push_subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id TEXT NOT NULL REFERENCES koku_users(id),
  endpoint TEXT NOT NULL UNIQUE,
  p256dh TEXT NOT NULL,
  auth TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS friday_context (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id TEXT NOT NULL REFERENCES koku_users(id),
  week_start DATE NOT NULL,
  context TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (user_id, week_start)
);

CREATE TABLE IF NOT EXISTS weekly_mirrors (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id TEXT NOT NULL REFERENCES koku_users(id),
  week_start DATE NOT NULL,
  content TEXT NOT NULL,
  friday_context_used TEXT,
  delivered_at TIMESTAMPTZ,
  opened_at TIMESTAMPTZ,
  UNIQUE (user_id, week_start)
);

-- Indexes
CREATE INDEX IF NOT EXISTS sessions_user_id_idx ON sessions (user_id);
CREATE INDEX IF NOT EXISTS sessions_project_id_idx ON sessions (project_id);
CREATE INDEX IF NOT EXISTS sessions_started_at_idx ON sessions (started_at);
CREATE INDEX IF NOT EXISTS sessions_work_type_idx ON sessions (work_type);
CREATE INDEX IF NOT EXISTS sessions_is_active_idx ON sessions (user_id)
  WHERE is_active = true;
