import { DatabaseSync } from 'node:sqlite';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const dbPath = path.join(__dirname, '..', 'pulse_production.db');

export const db = new DatabaseSync(dbPath);

export function initDatabase() {
  db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      email TEXT UNIQUE NOT NULL,
      name TEXT NOT NULL,
      tag TEXT UNIQUE NOT NULL,
      avatar TEXT,
      balance REAL DEFAULT 0.0,
      held_balance REAL DEFAULT 0.0,
      dispute_rate_90d REAL DEFAULT 0.0,
      id_verified INTEGER DEFAULT 0,
      linked_bad_accounts INTEGER DEFAULT 0,
      on_sanctions_list INTEGER DEFAULT 0,
      account_status TEXT DEFAULT 'ACTIVE',
      known_countries TEXT DEFAULT '["US"]',
      known_devices TEXT DEFAULT '["dev_primary"]',
      created_at TEXT DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS daily_volumes (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id TEXT NOT NULL,
      date TEXT NOT NULL,
      volume REAL DEFAULT 0.0
    );

    CREATE TABLE IF NOT EXISTS transactions (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      type TEXT NOT NULL,
      amount REAL NOT NULL,
      currency TEXT DEFAULT 'USD',
      counterparty_name TEXT,
      counterparty_email TEXT,
      status TEXT DEFAULT 'COMPLETED',
      reference_id TEXT,
      note TEXT,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS risk_decisions (
      id TEXT PRIMARY KEY,
      account_id TEXT NOT NULL,
      event_id TEXT NOT NULL,
      event_type TEXT NOT NULL,
      score REAL NOT NULL,
      reasons_json TEXT NOT NULL,
      action TEXT NOT NULL,
      ai_audit_explanation TEXT,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS checkout_assessments (
      id TEXT PRIMARY KEY,
      cart_hash TEXT NOT NULL,
      high_risk INTEGER NOT NULL,
      reason TEXT NOT NULL,
      expires_at TEXT NOT NULL,
      used INTEGER DEFAULT 0,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS checkout_orders (
      order_id TEXT PRIMARY KEY,
      assessment_id TEXT NOT NULL,
      cart_hash TEXT NOT NULL,
      status TEXT DEFAULT 'CREATED',
      created_at TEXT DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS micro_pools (
      id TEXT PRIMARY KEY,
      owner_user_id TEXT,
      target_amount REAL NOT NULL,
      pooled_amount REAL DEFAULT 0,
      reserved_amount REAL DEFAULT 0,
      cart_json TEXT NOT NULL,
      status TEXT DEFAULT 'OPEN',
      expires_at TEXT NOT NULL,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS micro_pool_contributions (
      id TEXT PRIMARY KEY,
      pool_id TEXT NOT NULL,
      paypal_order_id TEXT UNIQUE NOT NULL,
      paypal_capture_id TEXT,
      refund_request_id TEXT,
      amount REAL NOT NULL,
      status TEXT DEFAULT 'PENDING',
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (pool_id) REFERENCES micro_pools(id)
    );
  `);

  console.log('Pulse production database initialized.');
}
