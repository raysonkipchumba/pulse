import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { randomUUID } from 'node:crypto';
import { pool } from './db.js';

const isProduction = process.env.NODE_ENV === 'production' || process.env.RENDER === 'true';
const JWT_SECRET = process.env.JWT_SECRET
  || (isProduction ? '' : 'pulse-development-jwt-secret');

if (!JWT_SECRET) {
  throw new Error('JWT_SECRET must be set in production.');
}

function normalizeEmail(value) {
  return String(value || '').trim().toLowerCase();
}

function userView(user) {
  const safeUser = { ...user };
  delete safeUser.password_hash;
  const balance = Number(user.balance || 0);
  const heldBalance = Number(user.held_balance || 0);
  return {
    ...safeUser,
    balance,
    held_balance: heldBalance,
    available: Math.max(0, balance - heldBalance)
  };
}

function createToken(user) {
  return jwt.sign({ sub: String(user.id) }, JWT_SECRET, { expiresIn: '7d' });
}

export async function signup(req, res) {
  const body = req.body || {};
  const email = normalizeEmail(body.email);
  const password = String(body.password || '');
  const name = String(body.name || '').trim().slice(0, 80) || email.split('@')[0] || 'Pulse user';

  if (!email || !email.includes('@')) {
    return res.status(400).json({ error: 'A valid email is required.' });
  }
  if (password.length < 8) {
    return res.status(400).json({ error: 'Password must be at least 8 characters.' });
  }

  try {
    const passwordHash = await bcrypt.hash(password, 10);
    const tagBase = email.split('@')[0].replace(/[^a-zA-Z0-9_]/g, '').slice(0, 30) || 'user';
    const tag = `@${tagBase}_${randomUUID().slice(0, 8)}`;
    const result = await pool.query(`
      INSERT INTO users (email, name, password_hash, tag)
      VALUES ($1, $2, $3, $4)
      ON CONFLICT (email) DO NOTHING
      RETURNING *
    `, [email, name, passwordHash, tag]);

    if (!result.rows[0]) {
      return res.status(409).json({ error: 'An account with this email already exists.' });
    }

    const user = userView(result.rows[0]);
    return res.status(201).json({ token: createToken(result.rows[0]), user });
  } catch (err) {
    console.error('Signup failed:', err);
    return res.status(500).json({ error: 'Unable to create account.' });
  }
}

export async function login(req, res) {
  const body = req.body || {};
  const email = normalizeEmail(body.email);
  const password = String(body.password || '');
  if (!email || !password) {
    return res.status(400).json({ error: 'Email and password are required.' });
  }

  try {
    const result = await pool.query('SELECT * FROM users WHERE email = $1', [email]);
    const user = result.rows[0];
    if (!user || !(await bcrypt.compare(password, user.password_hash))) {
      return res.status(401).json({ error: 'Invalid email or password.' });
    }

    return res.json({ token: createToken(user), user: userView(user) });
  } catch (err) {
    console.error('Login failed:', err);
    return res.status(500).json({ error: 'Unable to sign in.' });
  }
}

export function requireAuth(req, res, next) {
  const authorization = req.headers.authorization || '';
  const token = authorization.startsWith('Bearer ') ? authorization.slice(7).trim() : '';
  if (!token) return res.status(401).json({ error: 'Authentication required.' });

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    if (!decoded || typeof decoded !== 'object' || !decoded.sub) {
      return res.status(401).json({ error: 'Invalid or expired session.' });
    }
    req.uid = String(decoded.sub);
    return next();
  } catch {
    return res.status(401).json({ error: 'Invalid or expired session.' });
  }
}
