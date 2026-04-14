// Node harness for Prompt 2.1 end-to-end verification.
import pg from "pg";

const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });
const BASE = process.env.BASE || "http://localhost:3001";

const OWNER_JAR = new Map();
const DEV_JAR = new Map();

function cookieHeader(jar) {
  return [...jar.entries()].map(([k, v]) => `${k}=${v}`).join("; ");
}
function mergeCookies(jar, setCookieHeaders) {
  for (const c of setCookieHeaders) {
    const [pair] = c.split(";");
    const eq = pair.indexOf("=");
    if (eq < 0) continue;
    jar.set(pair.slice(0, eq).trim(), pair.slice(eq + 1).trim());
  }
}

async function call(method, path, { body, jar } = {}) {
  const headers = {
    "Content-Type": "application/json",
    Origin: BASE,
    Referer: BASE + "/login",
  };
  if (jar) headers["Cookie"] = cookieHeader(jar);
  const res = await fetch(BASE + path, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });
  if (jar) mergeCookies(jar, res.headers.getSetCookie());
  const text = await res.text();
  let data;
  try { data = JSON.parse(text); } catch { data = text; }
  return { status: res.status, data };
}

function log(label, { status, data }) {
  const preview =
    typeof data === "string" ? data.slice(0, 160) : JSON.stringify(data).slice(0, 240);
  console.log(`  [${status}] ${label} → ${preview}`);
}

async function signIn(email, jar) {
  const r = await call("POST", "/api/auth/sign-in/email", {
    body: { email, password: "passw0rd-long" },
    jar,
  });
  if (r.status !== 200) throw new Error(`signin ${email} failed: ${r.status}`);
}

async function main() {
  await signIn("owner@test.ikigai", OWNER_JAR);
  await signIn("dev@test.ikigai", DEV_JAR);

  // Fresh project.
  await pool.query(`DELETE FROM project_members WHERE project_id IN (SELECT id FROM projects WHERE name='Test Project')`);
  await pool.query(`DELETE FROM sessions WHERE project_id IN (SELECT id FROM projects WHERE name='Test Project')`);
  await pool.query(`DELETE FROM projects WHERE name='Test Project'`);
  const { rows: oRows } = await pool.query(`SELECT id FROM koku_users WHERE role='owner' LIMIT 1`);
  const projRes = await pool.query(
    `INSERT INTO projects(name,status,billable,created_by) VALUES('Test Project','active',true,$1) RETURNING id`,
    [oRows[0].id]
  );
  const projectId = projRes.rows[0].id;
  const { rows: members } = await pool.query(`SELECT id FROM koku_users ORDER BY created_at`);
  for (const { id } of members) {
    await pool.query(`INSERT INTO project_members(project_id,user_id) VALUES($1,$2)`, [projectId, id]);
  }
  console.log(`# project=${projectId}`);

  console.log("\n## Clock start / duplicate / switch / stop");
  log("active (empty)", await call("GET", "/api/sessions/active", { jar: DEV_JAR }));

  const start = await call("POST", "/api/sessions/start", {
    body: { project_id: projectId, work_type: "build" },
    jar: DEV_JAR,
  });
  log("start build", start);
  const sid = start.data.id;

  log(
    "start again (409)",
    await call("POST", "/api/sessions/start", {
      body: { project_id: projectId, work_type: "spec" },
      jar: DEV_JAR,
    })
  );

  log(
    "switch-type build→debug",
    await call("PATCH", "/api/sessions/switch-type", {
      body: { session_id: sid, new_work_type: "debug" },
      jar: DEV_JAR,
    })
  );

  const afterSwitch = await pool.query(
    `SELECT id,work_type,is_active,duration_minutes FROM sessions WHERE project_id=$1 ORDER BY started_at`,
    [projectId]
  );
  console.log("  db after switch:", afterSwitch.rows);

  // Grab the new active session and stop it immediately — expect discard.
  const active = await call("GET", "/api/sessions/active", { jar: DEV_JAR });
  const sid2 = active.data.id;
  log("active (debug)", active);
  log(
    "stop immediately (<3min → discard)",
    await call("POST", "/api/sessions/stop", {
      body: { session_id: sid2, feedback: "flowed", note: "unit test" },
      jar: DEV_JAR,
    })
  );

  const afterStop = await pool.query(
    `SELECT id,work_type,is_active,duration_minutes,note,feedback FROM sessions WHERE project_id=$1`,
    [projectId]
  );
  console.log("  db after stop:", afterStop.rows);

  console.log("\n## Seeded 50-min session → stop preserves row");
  await pool.query(
    `INSERT INTO sessions(id,user_id,project_id,work_type,started_at,is_active)
     VALUES(gen_random_uuid(),$1,$2,'build',NOW()-INTERVAL '50 minutes',true)`,
    [members[1].id, projectId]
  );
  const longActive = await call("GET", "/api/sessions/active", { jar: DEV_JAR });
  const longSid = longActive.data.id;
  log(
    "stop long session with feedback",
    await call("POST", "/api/sessions/stop", {
      body: { session_id: longSid, feedback: "difficult", note: "kept hitting walls" },
      jar: DEV_JAR,
    })
  );

  log("today (dev)", await call("GET", "/api/sessions/today", { jar: DEV_JAR }));

  console.log("\n## Custom work types");
  const global = await call("POST", "/api/work-types", {
    body: { name: "Code Review", scope: "global" },
    jar: OWNER_JAR,
  });
  log("owner creates global custom", global);
  const cid = global.data.id;

  log(
    "developer POST (403)",
    await call("POST", "/api/work-types", {
      body: { name: "Nope", scope: "global" },
      jar: DEV_JAR,
    })
  );

  log(
    `list ?project_id (=${projectId.slice(0, 8)}…)`,
    await call("GET", `/api/work-types?project_id=${projectId}`, { jar: DEV_JAR })
  );

  log(
    "owner archives custom",
    await call("DELETE", `/api/work-types/${cid}`, { jar: OWNER_JAR })
  );

  log(
    "list after archive (empty)",
    await call("GET", `/api/work-types?project_id=${projectId}`, { jar: DEV_JAR })
  );

  console.log("\n## Baseline session is protected");
  const { rows: baseline } = await pool.query(
    `SELECT id FROM sessions WHERE is_baseline=true LIMIT 1`
  );
  log(
    "owner DELETE baseline session (403)",
    await call("DELETE", `/api/sessions/${baseline[0].id}`, { jar: OWNER_JAR })
  );

  console.log("\n## PATCH /api/sessions/:id protected fields ignored");
  const { rows: lastSessions } = await pool.query(
    `SELECT id,started_at,project_id FROM sessions WHERE project_id=$1 AND is_active=false ORDER BY started_at DESC LIMIT 1`,
    [projectId]
  );
  const liveId = lastSessions[0].id;
  log(
    "patch work_type+note",
    await call("PATCH", `/api/sessions/${liveId}`, {
      body: {
        work_type: "polish",
        note: "a polished edit",
        // These should be ignored (not fields the endpoint accepts):
        started_at: "1999-01-01T00:00:00Z",
        project_id: "00000000-0000-0000-0000-000000000000",
      },
      jar: DEV_JAR,
    })
  );
  const { rows: check } = await pool.query(
    `SELECT id,started_at,project_id,work_type,note FROM sessions WHERE id=$1`,
    [liveId]
  );
  console.log("  db after patch:", check[0]);
  console.log(
    check[0].started_at.toISOString() === lastSessions[0].started_at.toISOString()
      ? "  protected started_at preserved ✓"
      : "  ! started_at was changed"
  );
  console.log(
    check[0].project_id === lastSessions[0].project_id
      ? "  protected project_id preserved ✓"
      : "  ! project_id was changed"
  );

  await pool.end();
}

main().catch((err) => { console.error(err); process.exit(1); });
