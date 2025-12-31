import { Database } from "bun:sqlite";
import path from "path";
import fs from "fs";

const dbPath = path.join(import.meta.dir, "..", "data", "workingdevshero.db");

// Ensure data directory exists
const dataDir = path.dirname(dbPath);
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

export const db = new Database(dbPath);

// Initialize database schema
db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    email TEXT UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS sessions (
    id TEXT PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id),
    expires_at DATETIME NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS work_items (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    email TEXT NOT NULL,
    max_minutes INTEGER NOT NULL,
    task_description TEXT NOT NULL,
    cost_usd REAL NOT NULL,
    cost_sol REAL,
    payment_address TEXT NOT NULL,
    transaction_signature TEXT,
    status TEXT DEFAULT 'pending_payment',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    paid_at DATETIME,
    started_at DATETIME,
    completed_at DATETIME,
    result TEXT
  );

  CREATE INDEX IF NOT EXISTS idx_work_items_status ON work_items(status);
  CREATE INDEX IF NOT EXISTS idx_work_items_payment ON work_items(payment_address, status);
  CREATE INDEX IF NOT EXISTS idx_sessions_user ON sessions(user_id);
`);

// Migration: Add user_id column to work_items if it doesn't exist
try {
  db.exec(`ALTER TABLE work_items ADD COLUMN user_id INTEGER REFERENCES users(id)`);
  console.log("Migration: Added user_id column to work_items");
} catch (e) {
  // Column already exists, ignore
}

// Create index after migration
db.exec(`CREATE INDEX IF NOT EXISTS idx_work_items_user ON work_items(user_id);`);

console.log("Database initialized at:", dbPath);

// User types and functions
export interface User {
  id: number;
  email: string;
  password_hash: string;
  created_at: string;
}

export interface Session {
  id: string;
  user_id: number;
  expires_at: string;
  created_at: string;
}

export function createUser(email: string, passwordHash: string): User {
  const stmt = db.prepare(`
    INSERT INTO users (email, password_hash)
    VALUES (?, ?)
  `);
  const result = stmt.run(email, passwordHash);
  return db.prepare("SELECT * FROM users WHERE id = ?").get(result.lastInsertRowid) as User;
}

export function getUserByEmail(email: string): User | undefined {
  return db.prepare("SELECT * FROM users WHERE email = ?").get(email) as User | undefined;
}

export function getUserById(id: number): User | undefined {
  return db.prepare("SELECT * FROM users WHERE id = ?").get(id) as User | undefined;
}

export function createSession(sessionId: string, userId: number, expiresAt: Date): Session {
  const stmt = db.prepare(`
    INSERT INTO sessions (id, user_id, expires_at)
    VALUES (?, ?, ?)
  `);
  stmt.run(sessionId, userId, expiresAt.toISOString());
  return db.prepare("SELECT * FROM sessions WHERE id = ?").get(sessionId) as Session;
}

export function getSession(sessionId: string): (Session & { user: User }) | undefined {
  const session = db.prepare("SELECT * FROM sessions WHERE id = ?").get(sessionId) as Session | undefined;
  if (!session) return undefined;

  // Check if expired
  if (new Date(session.expires_at) < new Date()) {
    deleteSession(sessionId);
    return undefined;
  }

  const user = getUserById(session.user_id);
  if (!user) return undefined;

  return { ...session, user };
}

export function deleteSession(sessionId: string): void {
  db.prepare("DELETE FROM sessions WHERE id = ?").run(sessionId);
}

export function deleteUserSessions(userId: number): void {
  db.prepare("DELETE FROM sessions WHERE user_id = ?").run(userId);
}

export interface WorkItem {
  id: number;
  user_id: number | null;
  email: string;
  max_minutes: number;
  task_description: string;
  cost_usd: number;
  cost_sol: number | null;
  payment_address: string;
  transaction_signature: string | null;
  status: string;
  created_at: string;
  paid_at: string | null;
  started_at: string | null;
  completed_at: string | null;
  result: string | null;
}

export function createWorkItem(
  email: string,
  maxMinutes: number,
  taskDescription: string,
  costUsd: number,
  paymentAddress: string,
  userId?: number
): WorkItem {
  const stmt = db.prepare(`
    INSERT INTO work_items (email, max_minutes, task_description, cost_usd, payment_address, user_id)
    VALUES (?, ?, ?, ?, ?, ?)
  `);
  const result = stmt.run(email, maxMinutes, taskDescription, costUsd, paymentAddress, userId || null);

  return db.prepare("SELECT * FROM work_items WHERE id = ?").get(result.lastInsertRowid) as WorkItem;
}

export function getWorkItemById(id: number): WorkItem | undefined {
  return db.prepare("SELECT * FROM work_items WHERE id = ?").get(id) as WorkItem | undefined;
}

export function getPendingPaymentItems(): WorkItem[] {
  return db.prepare("SELECT * FROM work_items WHERE status = 'pending_payment'").all() as WorkItem[];
}

export function getPaidItems(): WorkItem[] {
  return db.prepare("SELECT * FROM work_items WHERE status = 'paid' ORDER BY paid_at ASC").all() as WorkItem[];
}

export function updateWorkItemStatus(id: number, status: string, additionalFields?: Record<string, any>): void {
  let sql = `UPDATE work_items SET status = ?`;
  const params: any[] = [status];

  if (additionalFields) {
    for (const [key, value] of Object.entries(additionalFields)) {
      sql += `, ${key} = ?`;
      params.push(value);
    }
  }

  sql += ` WHERE id = ?`;
  params.push(id);

  db.prepare(sql).run(...params);
}

export function updateWorkItemPayment(id: number, txSignature: string, costSol: number): void {
  db.prepare(`
    UPDATE work_items
    SET status = 'paid', transaction_signature = ?, cost_sol = ?, paid_at = CURRENT_TIMESTAMP
    WHERE id = ?
  `).run(txSignature, costSol, id);
}

export function getWorkItemsByUserId(userId: number): WorkItem[] {
  return db.prepare("SELECT * FROM work_items WHERE user_id = ? ORDER BY created_at DESC").all(userId) as WorkItem[];
}

export function getWorkItemsByUserIdAndStatus(userId: number, statuses: string[]): WorkItem[] {
  const placeholders = statuses.map(() => "?").join(", ");
  return db.prepare(`SELECT * FROM work_items WHERE user_id = ? AND status IN (${placeholders}) ORDER BY created_at DESC`).all(userId, ...statuses) as WorkItem[];
}

// Check if a transaction signature has already been used
export function isTransactionUsed(signature: string): boolean {
  const result = db.prepare("SELECT id FROM work_items WHERE transaction_signature = ?").get(signature);
  return result !== undefined;
}

// Get pending payment work items created after a specific time
export function getPendingPaymentItemsAfter(afterTime: string): WorkItem[] {
  return db.prepare("SELECT * FROM work_items WHERE status = 'pending_payment' AND created_at >= ?").all(afterTime) as WorkItem[];
}
