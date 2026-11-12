import pg from 'pg';

const { Pool } = pg;
const isProduction = process.env.NODE_ENV === 'production' || process.env.RENDER === 'true';

export const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: isProduction ? { rejectUnauthorized: false } : undefined
});

function makeDb(client) {
  const prepare = (sql) => {
    let parameterIndex = 0;
    const parameterizedText = sql.replace(/\?/g, () => `$${++parameterIndex}`);

    return {
      async get(...values) {
        const result = await client.query(parameterizedText, values);
        return result.rows[0];
      },
      async all(...values) {
        const result = await client.query(parameterizedText, values);
        return result.rows;
      },
      async run(...values) {
        return client.query(parameterizedText, values);
      }
    };
  };

  return { prepare };
}

export const db = {
  ...makeDb(pool),
  async transaction(callback) {
    const client = await pool.connect();
    const transactionDb = makeDb(client);
    try {
      await client.query('BEGIN');
      const result = await callback(transactionDb);
      await client.query('COMMIT');
      return result;
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
  }
};

export async function initDb() {
  if (!process.env.DATABASE_URL) {
    throw new Error('DATABASE_URL must be set to initialize the Postgres database.');
  }

  await pool.query(`
    CREATE TABLE IF NOT EXISTS users (
      id SERIAL PRIMARY KEY,
      email TEXT UNIQUE NOT NULL,
      name TEXT NOT NULL,
      password_hash TEXT NOT NULL,
      balance NUMERIC NOT NULL DEFAULT 100,
      held_balance NUMERIC NOT NULL DEFAULT 0,
      tag TEXT UNIQUE,
      avatar TEXT,
      dispute_rate_90d NUMERIC DEFAULT 0.0,
      id_verified INTEGER DEFAULT 0,
      linked_bad_accounts INTEGER DEFAULT 0,
      on_sanctions_list INTEGER DEFAULT 0,
      account_status TEXT DEFAULT 'ACTIVE',
      known_countries TEXT DEFAULT '["US"]',
      known_devices TEXT DEFAULT '["dev_primary"]',
      created_at TIMESTAMPTZ DEFAULT now()
    );

    CREATE TABLE IF NOT EXISTS transactions (
      id SERIAL PRIMARY KEY,
      user_id INTEGER REFERENCES users(id),
      type TEXT NOT NULL,
      amount NUMERIC NOT NULL,
      description TEXT,
      currency TEXT DEFAULT 'USD',
      counterparty_name TEXT,
      counterparty_email TEXT,
      status TEXT DEFAULT 'COMPLETED',
      reference_id TEXT,
      note TEXT,
      created_at TIMESTAMPTZ DEFAULT now()
    );

    CREATE TABLE IF NOT EXISTS daily_volumes (
      id SERIAL PRIMARY KEY,
      user_id INTEGER NOT NULL REFERENCES users(id),
      date DATE NOT NULL,
      volume NUMERIC DEFAULT 0,
      UNIQUE (user_id, date)
    );

    CREATE TABLE IF NOT EXISTS risk_decisions (
      id TEXT PRIMARY KEY,
      account_id INTEGER NOT NULL REFERENCES users(id),
      event_id TEXT NOT NULL,
      event_type TEXT NOT NULL,
      score NUMERIC NOT NULL,
      reasons_json TEXT NOT NULL,
      action TEXT NOT NULL,
      ai_audit_explanation TEXT,
      created_at TIMESTAMPTZ DEFAULT now()
    );

    CREATE TABLE IF NOT EXISTS checkout_assessments (
      id TEXT PRIMARY KEY,
      cart_hash TEXT NOT NULL,
      high_risk INTEGER NOT NULL,
      reason TEXT NOT NULL,
      expires_at TIMESTAMPTZ NOT NULL,
      used INTEGER DEFAULT 0,
      created_at TIMESTAMPTZ DEFAULT now()
    );

    CREATE TABLE IF NOT EXISTS checkout_orders (
      order_id TEXT PRIMARY KEY,
      assessment_id TEXT NOT NULL REFERENCES checkout_assessments(id),
      cart_hash TEXT NOT NULL,
      user_id INTEGER REFERENCES users(id),
      status TEXT DEFAULT 'CREATED',
      created_at TIMESTAMPTZ DEFAULT now()
    );

    CREATE TABLE IF NOT EXISTS micro_pools (
      id TEXT PRIMARY KEY,
      owner_user_id INTEGER REFERENCES users(id),
      target_amount NUMERIC NOT NULL,
      pooled_amount NUMERIC DEFAULT 0,
      reserved_amount NUMERIC DEFAULT 0,
      cart_json TEXT NOT NULL,
      status TEXT DEFAULT 'OPEN',
      expires_at TIMESTAMPTZ NOT NULL,
      created_at TIMESTAMPTZ DEFAULT now()
    );

    CREATE TABLE IF NOT EXISTS micro_pool_contributions (
      id TEXT PRIMARY KEY,
      pool_id TEXT NOT NULL REFERENCES micro_pools(id),
      paypal_order_id TEXT UNIQUE NOT NULL,
      paypal_capture_id TEXT,
      refund_request_id TEXT,
      amount NUMERIC NOT NULL,
      status TEXT DEFAULT 'PENDING',
      created_at TIMESTAMPTZ DEFAULT now()
    );

    CREATE TABLE IF NOT EXISTS paypal_orders (
      order_id TEXT PRIMARY KEY,
      user_id INTEGER NOT NULL REFERENCES users(id),
      amount NUMERIC NOT NULL,
      status TEXT DEFAULT 'CREATED',
      created_at TIMESTAMPTZ DEFAULT now()
    );

    CREATE TABLE IF NOT EXISTS processed_captures (
      capture_id TEXT PRIMARY KEY,
      user_id INTEGER NOT NULL REFERENCES users(id),
      amount NUMERIC NOT NULL,
      credited INTEGER DEFAULT 0,
      created_at TIMESTAMPTZ DEFAULT now()
    );

    CREATE TABLE IF NOT EXISTS account_audit_events (
      id TEXT PRIMARY KEY,
      user_id INTEGER NOT NULL REFERENCES users(id),
      event_type TEXT NOT NULL,
      amount NUMERIC DEFAULT 0,
      note TEXT,
      created_at TIMESTAMPTZ DEFAULT now()
    );
  `);

  console.log('Pulse production database initialized.');
}
