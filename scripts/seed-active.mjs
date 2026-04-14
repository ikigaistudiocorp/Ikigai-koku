import pg from "pg";
const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });
const { rows: devRows } = await pool.query(
  `SELECT id FROM koku_users ORDER BY created_at OFFSET 1 LIMIT 1`
);
const { rows: projRows } = await pool.query(
  `SELECT id FROM projects WHERE name='Test Project' LIMIT 1`
);
await pool.query(`DELETE FROM sessions WHERE is_active=true`);
await pool.query(`DELETE FROM notification_log`);
await pool.query(
  `INSERT INTO sessions(user_id,project_id,work_type,started_at,is_active)
   VALUES ($1,$2,'build',NOW() - INTERVAL '3 hours 40 minutes',true)`,
  [devRows[0].id, projRows[0].id]
);
await pool.query(
  `INSERT INTO push_subscriptions(user_id,endpoint,p256dh,auth)
   VALUES ($1,'https://fake.push.example/xyz','fake-p256','fake-auth')
   ON CONFLICT (endpoint) DO NOTHING`,
  [devRows[0].id]
);
console.log("seeded forgotten + fake subscription");
await pool.end();
