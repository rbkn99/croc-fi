import Database from 'better-sqlite3';
import path from 'path';

const DB_PATH = path.join(process.cwd(), 'data', 'db.sqlite');
let db: Database.Database;

export function initDB(): void {
  db = new Database(DB_PATH);
  db.pragma('journal_mode = WAL');
  db.exec(`
    CREATE TABLE IF NOT EXISTS project_context (key TEXT PRIMARY KEY, value TEXT, updated_at INTEGER);
    CREATE TABLE IF NOT EXISTS messages (id INTEGER PRIMARY KEY AUTOINCREMENT, message_id INTEGER, user_id INTEGER, username TEXT, text TEXT, is_bot_response INTEGER DEFAULT 0, timestamp INTEGER);
    CREATE TABLE IF NOT EXISTS decisions (id INTEGER PRIMARY KEY AUTOINCREMENT, description TEXT, logged_by TEXT, timestamp INTEGER);
    CREATE TABLE IF NOT EXISTS tasks (id INTEGER PRIMARY KEY AUTOINCREMENT, description TEXT, assigned_to TEXT, status TEXT DEFAULT 'open', created_at INTEGER);
  `);
  seedDefaultContext();
  console.log(`[${new Date().toISOString()}] Database initialized at ${DB_PATH}`);
}

function seedDefaultContext(): void {
  const defaults: Record<string, string> = {
    project_name: 'RWA Tokenization Platform on Solana',
    hackathon_case: 'Building a platform for tokenizing real-world assets on Solana',
    team_members: '',
    tech_stack: 'Solana, Anchor, TypeScript, React',
    architecture_summary: 'TBD',
    goals: 'Build a working RWA tokenization MVP for the hackathon',
  };
  const stmt = db.prepare('INSERT OR IGNORE INTO project_context (key, value, updated_at) VALUES (?, ?, ?)');
  const now = Date.now();
  for (const [key, value] of Object.entries(defaults)) stmt.run(key, value, now);
}

export function getContext(key: string): string | undefined {
  const row = db.prepare('SELECT value FROM project_context WHERE key = ?').get(key) as { value: string } | undefined;
  return row?.value;
}

export function setContext(key: string, value: string): void {
  db.prepare('INSERT INTO project_context (key, value, updated_at) VALUES (?, ?, ?) ON CONFLICT(key) DO UPDATE SET value = ?, updated_at = ?').run(key, value, Date.now(), value, Date.now());
}

export function getAllContext(): Record<string, string> {
  const rows = db.prepare('SELECT key, value FROM project_context').all() as { key: string; value: string }[];
  return Object.fromEntries(rows.map(r => [r.key, r.value]));
}

export function saveMessage(messageId: number, userId: number, username: string, text: string, isBotResponse: boolean): void {
  db.prepare('INSERT INTO messages (message_id, user_id, username, text, is_bot_response, timestamp) VALUES (?, ?, ?, ?, ?, ?)').run(messageId, userId, username, text, isBotResponse ? 1 : 0, Date.now());
}

export function getRecentMessages(limit: number): { username: string; text: string; is_bot_response: number }[] {
  return db.prepare('SELECT username, text, is_bot_response FROM messages ORDER BY id DESC LIMIT ?').all(limit) as { username: string; text: string; is_bot_response: number }[];
}

export function getMessagesSince(sinceTimestamp: number): { username: string; text: string; is_bot_response: number }[] {
  return db.prepare('SELECT username, text, is_bot_response FROM messages WHERE timestamp > ? ORDER BY id ASC').all(sinceTimestamp) as { username: string; text: string; is_bot_response: number }[];
}

export function addDecision(description: string, loggedBy: string): number {
  const info = db.prepare('INSERT INTO decisions (description, logged_by, timestamp) VALUES (?, ?, ?)').run(description, loggedBy, Date.now());
  return info.lastInsertRowid as number;
}

export function getDecisions(): { id: number; description: string; logged_by: string; timestamp: number }[] {
  return db.prepare('SELECT * FROM decisions ORDER BY id ASC').all() as { id: number; description: string; logged_by: string; timestamp: number }[];
}

export function addTask(description: string, assignedTo?: string): number {
  const info = db.prepare('INSERT INTO tasks (description, assigned_to, created_at) VALUES (?, ?, ?)').run(description, assignedTo ?? null, Date.now());
  return info.lastInsertRowid as number;
}

export function getTasks(status = 'open'): { id: number; description: string; assigned_to: string | null; status: string }[] {
  return db.prepare('SELECT id, description, assigned_to, status FROM tasks WHERE status = ?').all(status) as { id: number; description: string; assigned_to: string | null; status: string }[];
}

export function completeTask(id: number): boolean {
  const info = db.prepare("UPDATE tasks SET status = 'done' WHERE id = ? AND status = 'open'").run(id);
  return info.changes > 0;
}

export function getDB(): Database.Database { return db; }
