import Database from "better-sqlite3";
import path from "path";
import fs from "fs";

const DB_PATH = process.env.DATABASE_PATH || "./rhymeforge.db";

let db: Database.Database | null = null;

export function getDb(): Database.Database {
  if (!db) {
    const dbPath = path.resolve(DB_PATH);
    const dir = path.dirname(dbPath);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    db = new Database(dbPath);
    db.pragma("journal_mode = WAL");
    initSchema(db);
  }
  return db;
}

function initSchema(db: Database.Database) {
  db.exec(`
    CREATE TABLE IF NOT EXISTS sessions (
      id TEXT PRIMARY KEY,
      title TEXT,
      status TEXT DEFAULT 'in_progress',
      created_at INTEGER NOT NULL,
      updated_at INTEGER NOT NULL,
      pipeline_state TEXT NOT NULL DEFAULT '{}'
    );

    CREATE TABLE IF NOT EXISTS step_outputs (
      id TEXT PRIMARY KEY,
      session_id TEXT NOT NULL,
      step_id TEXT NOT NULL,
      tool_used TEXT,
      cost REAL DEFAULT 0,
      output TEXT NOT NULL DEFAULT '{}',
      approved_at INTEGER,
      user_edits TEXT,
      FOREIGN KEY (session_id) REFERENCES sessions(id)
    );

    CREATE INDEX IF NOT EXISTS idx_step_outputs_session ON step_outputs(session_id);
    CREATE INDEX IF NOT EXISTS idx_sessions_updated ON sessions(updated_at DESC);
  `);
}

export interface SessionRow {
  id: string;
  title: string | null;
  status: "in_progress" | "complete" | "paused";
  created_at: number;
  updated_at: number;
  pipeline_state: string;
}

export interface StepOutputRow {
  id: string;
  session_id: string;
  step_id: string;
  tool_used: string | null;
  cost: number;
  output: string;
  approved_at: number | null;
  user_edits: string | null;
}

export const sessionDb = {
  create(id: string, title: string, pipelineState: object): SessionRow {
    const now = Date.now();
    const stmt = getDb().prepare(
      `INSERT INTO sessions (id, title, status, created_at, updated_at, pipeline_state)
       VALUES (?, ?, 'in_progress', ?, ?, ?)`
    );
    stmt.run(id, title, now, now, JSON.stringify(pipelineState));
    return { id, title, status: "in_progress", created_at: now, updated_at: now, pipeline_state: JSON.stringify(pipelineState) };
  },

  getById(id: string): SessionRow | undefined {
    return getDb().prepare("SELECT * FROM sessions WHERE id = ?").get(id) as SessionRow | undefined;
  },

  list(): SessionRow[] {
    return getDb().prepare("SELECT * FROM sessions ORDER BY updated_at DESC").all() as SessionRow[];
  },

  update(id: string, updates: Partial<{ title: string; status: string; pipeline_state: object }>) {
    const now = Date.now();
    const fields: string[] = ["updated_at = ?"];
    const values: unknown[] = [now];
    if (updates.title !== undefined) { fields.push("title = ?"); values.push(updates.title); }
    if (updates.status !== undefined) { fields.push("status = ?"); values.push(updates.status); }
    if (updates.pipeline_state !== undefined) { fields.push("pipeline_state = ?"); values.push(JSON.stringify(updates.pipeline_state)); }
    values.push(id);
    getDb().prepare(`UPDATE sessions SET ${fields.join(", ")} WHERE id = ?`).run(...values);
  },

  delete(id: string) {
    const db = getDb();
    db.prepare("DELETE FROM step_outputs WHERE session_id = ?").run(id);
    db.prepare("DELETE FROM sessions WHERE id = ?").run(id);
  },
};

export const stepOutputDb = {
  upsert(row: Omit<StepOutputRow, "approved_at" | "user_edits"> & { approved_at?: number; user_edits?: object }) {
    getDb().prepare(`
      INSERT INTO step_outputs (id, session_id, step_id, tool_used, cost, output, approved_at, user_edits)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(id) DO UPDATE SET
        tool_used = excluded.tool_used,
        cost = excluded.cost,
        output = excluded.output,
        approved_at = excluded.approved_at,
        user_edits = excluded.user_edits
    `).run(
      row.id,
      row.session_id,
      row.step_id,
      row.tool_used ?? null,
      row.cost ?? 0,
      typeof row.output === "string" ? row.output : JSON.stringify(row.output),
      row.approved_at ?? null,
      row.user_edits ? JSON.stringify(row.user_edits) : null
    );
  },

  getBySession(sessionId: string): StepOutputRow[] {
    return getDb().prepare("SELECT * FROM step_outputs WHERE session_id = ?").all(sessionId) as StepOutputRow[];
  },

  getByStep(sessionId: string, stepId: string): StepOutputRow | undefined {
    return getDb().prepare("SELECT * FROM step_outputs WHERE session_id = ? AND step_id = ?").get(sessionId, stepId) as StepOutputRow | undefined;
  },
};
