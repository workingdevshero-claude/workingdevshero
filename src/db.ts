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
`);

console.log("Database initialized at:", dbPath);

export interface WorkItem {
  id: number;
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
  paymentAddress: string
): WorkItem {
  const stmt = db.prepare(`
    INSERT INTO work_items (email, max_minutes, task_description, cost_usd, payment_address)
    VALUES (?, ?, ?, ?, ?)
  `);
  const result = stmt.run(email, maxMinutes, taskDescription, costUsd, paymentAddress);

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
