import { createClient } from "@libsql/client";
import { Database } from "bun:sqlite";
import path from "path";
import fs from "fs";

// Use Turso in production, local SQLite in development
const isProduction = !!process.env.TURSO_DATABASE_URL;

interface DbClient {
  execute(sql: string, params?: any[]): Promise<{ rows: any[]; lastInsertRowid?: number | bigint; changes?: number }>;
  executeSync?(sql: string, params?: any[]): { rows: any[]; lastInsertRowid?: number | bigint; changes?: number };
}

let dbClient: DbClient;

if (isProduction) {
  // Turso for production
  const turso = createClient({
    url: process.env.TURSO_DATABASE_URL!,
    authToken: process.env.TURSO_AUTH_TOKEN,
  });

  dbClient = {
    async execute(sql: string, params?: any[]) {
      const result = await turso.execute({ sql, args: params || [] });
      return {
        rows: result.rows as any[],
        lastInsertRowid: result.lastInsertRowid,
        changes: result.rowsAffected,
      };
    }
  };

  console.log("Using Turso database");
} else {
  // Local SQLite for development
  const dbPath = path.join(import.meta.dir, "..", "data", "workingdevshero.db");
  const dataDir = path.dirname(dbPath);
  if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
  }

  const localDb = new Database(dbPath);

  dbClient = {
    async execute(sql: string, params?: any[]) {
      // Handle different SQL statement types
      const trimmedSql = sql.trim().toUpperCase();
      if (trimmedSql.startsWith("SELECT")) {
        const stmt = localDb.prepare(sql);
        const rows = params ? stmt.all(...params) : stmt.all();
        return { rows: rows as any[] };
      } else {
        const stmt = localDb.prepare(sql);
        const result = params ? stmt.run(...params) : stmt.run();
        return {
          rows: [],
          lastInsertRowid: result.lastInsertRowid,
          changes: result.changes,
        };
      }
    },
    executeSync(sql: string, params?: any[]) {
      const trimmedSql = sql.trim().toUpperCase();
      if (trimmedSql.startsWith("SELECT")) {
        const stmt = localDb.prepare(sql);
        const rows = params ? stmt.all(...params) : stmt.all();
        return { rows: rows as any[] };
      } else {
        const stmt = localDb.prepare(sql);
        const result = params ? stmt.run(...params) : stmt.run();
        return {
          rows: [],
          lastInsertRowid: result.lastInsertRowid,
          changes: result.changes,
        };
      }
    }
  };

  console.log("Using local SQLite database at:", dbPath);
}

// Initialize database schema
async function initializeSchema() {
  await dbClient.execute(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      email TEXT UNIQUE NOT NULL,
      password_hash TEXT NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  await dbClient.execute(`
    CREATE TABLE IF NOT EXISTS sessions (
      id TEXT PRIMARY KEY,
      user_id INTEGER NOT NULL,
      expires_at DATETIME NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  await dbClient.execute(`
    CREATE TABLE IF NOT EXISTS work_items (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER,
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
    )
  `);

  await dbClient.execute(`CREATE INDEX IF NOT EXISTS idx_work_items_status ON work_items(status)`);
  await dbClient.execute(`CREATE INDEX IF NOT EXISTS idx_work_items_payment ON work_items(payment_address, status)`);
  await dbClient.execute(`CREATE INDEX IF NOT EXISTS idx_work_items_user ON work_items(user_id)`);
  await dbClient.execute(`CREATE INDEX IF NOT EXISTS idx_sessions_user ON sessions(user_id)`);

  console.log("Database schema initialized");
}

// Initialize on import
const schemaReady = initializeSchema();

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

export async function createUser(email: string, passwordHash: string): Promise<User> {
  await schemaReady;
  const result = await dbClient.execute(
    `INSERT INTO users (email, password_hash) VALUES (?, ?)`,
    [email, passwordHash]
  );
  const users = await dbClient.execute(`SELECT * FROM users WHERE id = ?`, [result.lastInsertRowid]);
  return users.rows[0] as User;
}

export async function getUserByEmail(email: string): Promise<User | undefined> {
  await schemaReady;
  const result = await dbClient.execute(`SELECT * FROM users WHERE email = ?`, [email]);
  return result.rows[0] as User | undefined;
}

export async function getUserById(id: number): Promise<User | undefined> {
  await schemaReady;
  const result = await dbClient.execute(`SELECT * FROM users WHERE id = ?`, [id]);
  return result.rows[0] as User | undefined;
}

export async function createSession(sessionId: string, userId: number, expiresAt: Date): Promise<Session> {
  await schemaReady;
  await dbClient.execute(
    `INSERT INTO sessions (id, user_id, expires_at) VALUES (?, ?, ?)`,
    [sessionId, userId, expiresAt.toISOString()]
  );
  const result = await dbClient.execute(`SELECT * FROM sessions WHERE id = ?`, [sessionId]);
  return result.rows[0] as Session;
}

export async function getSession(sessionId: string): Promise<(Session & { user: User }) | undefined> {
  await schemaReady;
  const sessionResult = await dbClient.execute(`SELECT * FROM sessions WHERE id = ?`, [sessionId]);
  const session = sessionResult.rows[0] as Session | undefined;
  if (!session) return undefined;

  // Check if expired
  if (new Date(session.expires_at) < new Date()) {
    await deleteSession(sessionId);
    return undefined;
  }

  const user = await getUserById(session.user_id);
  if (!user) return undefined;

  return { ...session, user };
}

export async function deleteSession(sessionId: string): Promise<void> {
  await schemaReady;
  await dbClient.execute(`DELETE FROM sessions WHERE id = ?`, [sessionId]);
}

export async function deleteUserSessions(userId: number): Promise<void> {
  await schemaReady;
  await dbClient.execute(`DELETE FROM sessions WHERE user_id = ?`, [userId]);
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

export async function createWorkItem(
  email: string,
  maxMinutes: number,
  taskDescription: string,
  costUsd: number,
  paymentAddress: string,
  userId?: number
): Promise<WorkItem> {
  await schemaReady;
  const result = await dbClient.execute(
    `INSERT INTO work_items (email, max_minutes, task_description, cost_usd, payment_address, user_id) VALUES (?, ?, ?, ?, ?, ?)`,
    [email, maxMinutes, taskDescription, costUsd, paymentAddress, userId || null]
  );
  const items = await dbClient.execute(`SELECT * FROM work_items WHERE id = ?`, [result.lastInsertRowid]);
  return items.rows[0] as WorkItem;
}

export async function getWorkItemById(id: number): Promise<WorkItem | undefined> {
  await schemaReady;
  const result = await dbClient.execute(`SELECT * FROM work_items WHERE id = ?`, [id]);
  return result.rows[0] as WorkItem | undefined;
}

export async function getPendingPaymentItems(): Promise<WorkItem[]> {
  await schemaReady;
  const result = await dbClient.execute(`SELECT * FROM work_items WHERE status = 'pending_payment'`);
  return result.rows as WorkItem[];
}

export async function getPaidItems(): Promise<WorkItem[]> {
  await schemaReady;
  const result = await dbClient.execute(`SELECT * FROM work_items WHERE status = 'paid' ORDER BY paid_at ASC`);
  return result.rows as WorkItem[];
}

export async function updateWorkItemStatus(id: number, status: string, additionalFields?: Record<string, any>): Promise<void> {
  await schemaReady;
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

  await dbClient.execute(sql, params);
}

export async function updateWorkItemPayment(id: number, txSignature: string, costSol: number): Promise<void> {
  await schemaReady;
  await dbClient.execute(
    `UPDATE work_items SET status = 'paid', transaction_signature = ?, cost_sol = ?, paid_at = CURRENT_TIMESTAMP WHERE id = ?`,
    [txSignature, costSol, id]
  );
}

export async function getWorkItemsByUserId(userId: number): Promise<WorkItem[]> {
  await schemaReady;
  const result = await dbClient.execute(
    `SELECT * FROM work_items WHERE user_id = ? ORDER BY created_at DESC`,
    [userId]
  );
  return result.rows as WorkItem[];
}

export async function getWorkItemsByUserIdAndStatus(userId: number, statuses: string[]): Promise<WorkItem[]> {
  await schemaReady;
  const placeholders = statuses.map(() => "?").join(", ");
  const result = await dbClient.execute(
    `SELECT * FROM work_items WHERE user_id = ? AND status IN (${placeholders}) ORDER BY created_at DESC`,
    [userId, ...statuses]
  );
  return result.rows as WorkItem[];
}

export async function isTransactionUsed(signature: string): Promise<boolean> {
  await schemaReady;
  const result = await dbClient.execute(
    `SELECT id FROM work_items WHERE transaction_signature = ?`,
    [signature]
  );
  return result.rows.length > 0;
}

export async function getPendingPaymentItemsAfter(afterTime: string): Promise<WorkItem[]> {
  await schemaReady;
  const result = await dbClient.execute(
    `SELECT * FROM work_items WHERE status = 'pending_payment' AND created_at >= ?`,
    [afterTime]
  );
  return result.rows as WorkItem[];
}

export async function deleteWorkItem(id: number): Promise<boolean> {
  await schemaReady;
  const result = await dbClient.execute(
    `DELETE FROM work_items WHERE id = ? AND status = 'pending_payment'`,
    [id]
  );
  return (result.changes || 0) > 0;
}
