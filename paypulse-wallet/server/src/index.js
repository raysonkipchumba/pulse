import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import fs from 'node:fs';
import { db, initDatabase } from './db.js';
import { handleRiskPipeline } from './riskEngine.js';
import { createPayPalOrder, capturePayPalOrder } from './paypal.js';

initDatabase();

const app = express();
const PORT = process.env.PORT || 5000;
const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
const GEMINI_ENDPOINT = "https://generativelanguage.googleapis.com/v1beta/models/gemini-flash-latest:generateContent";

app.use(cors());
app.use(express.json());

// ----------------------------------------------------
// PUBLIC CONFIG (Safe public keys)
// ----------------------------------------------------
app.get('/api/config', (req, res) => {
  res.json({
    paypalClientId: process.env.PAYPAL_CLIENT_ID || ''
  });
});

// ----------------------------------------------------
// AUTH & USER SYNCHRONIZATION (Firebase Synced)
// ----------------------------------------------------
app.post('/api/auth/sync', (req, res) => {
  try {
    const { uid, email, name, avatar } = req.body;
    if (typeof uid !== 'string' || !uid.trim() || typeof email !== 'string' || !email.trim()) {
      return res.status(400).json({ error: 'UID and email required' });
    }

    let user = db.prepare('SELECT * FROM users WHERE id = ?').get(uid);

    if (!user) {
      const username = email.split('@')[0].replace(/[^a-zA-Z0-9_]/g, '') || 'user';
      let tag = `@${username}`;
      if (db.prepare('SELECT 1 FROM users WHERE tag = ?').get(tag)) {
        const uidSuffix = uid.replace(/[^a-zA-Z0-9_]/g, '') || 'account';
        tag = `@${username}_${uidSuffix}`;
        let attempt = 1;
        while (db.prepare('SELECT 1 FROM users WHERE tag = ?').get(tag)) {
          tag = `@${username}_${uidSuffix}_${attempt}`;
          attempt += 1;
        }
      }
      db.prepare(`
        INSERT INTO users (id, email, name, tag, avatar, balance, held_balance, dispute_rate_90d, id_verified, account_status)
        VALUES (?, ?, ?, ?, ?, 0.0, 0.0, 0.0, 1, 'ACTIVE')
      `).run(uid, email, name || username, tag, avatar || null);

      user = db.prepare('SELECT * FROM users WHERE id = ?').get(uid);
    } else {
      if (avatar || name) {
        db.prepare('UPDATE users SET name = COALESCE(?, name), avatar = COALESCE(?, avatar) WHERE id = ?')
          .run(name, avatar, uid);
        user = db.prepare('SELECT * FROM users WHERE id = ?').get(uid);
      }
    }

    res.json(user);
  } catch (err) {
    console.error('Auth sync error:', err);
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/user/:id', (req, res) => {
  try {
    const user = db.prepare('SELECT * FROM users WHERE id = ?').get(req.params.id);
    if (!user) return res.status(404).json({ error: 'User not found' });
    res.json(user);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ----------------------------------------------------
// REAL TRANSACTIONS
// ----------------------------------------------------
app.get('/api/transactions/:userId', (req, res) => {
  try {
    const txs = db.prepare(`
      SELECT * FROM transactions 
      WHERE user_id = ? 
      ORDER BY created_at DESC
    `).all(req.params.userId);
    res.json(txs);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ----------------------------------------------------
// PEER-TO-PEER TRANSFER (Real money between users)
// ----------------------------------------------------
app.post('/api/transfer', async (req, res) => {
  try {
    const { senderId, recipientQuery, amount, note } = req.body;
    const numAmount = parseFloat(amount);

    if (isNaN(numAmount) || numAmount <= 0) {
      return res.status(400).json({ error: 'Invalid amount' });
    }

    const sender = db.prepare('SELECT * FROM users WHERE id = ?').get(senderId);
    if (!sender) return res.status(404).json({ error: 'Sender not found' });

    if (sender.balance < numAmount) {
      return res.status(400).json({ error: 'Insufficient balance' });
    }

    // Run Background AI Risk Pipeline (Account Freezing Mitigation)
    const riskResult = await handleRiskPipeline(senderId, {
      amount: numAmount,
      type: 'TRANSFER_SEND',
      country: 'US',
      device_id: 'dev_primary'
    });

    if (riskResult.action === 'LIMIT_ACCOUNT') {
      return res.status(403).json({ error: 'Account action restricted by policy engine.' });
    }

    // Search recipient
    const recipient = db.prepare(`
      SELECT * FROM users 
      WHERE email = ? OR tag = ? OR id = ?
    `).get(recipientQuery, recipientQuery, recipientQuery);

    if (!recipient) {
      return res.status(404).json({ error: 'Recipient account not found' });
    }

    if (recipient.id === sender.id) {
      return res.status(400).json({ error: 'Cannot transfer to self' });
    }

    const refId = 'REF' + Math.floor(10000000 + Math.random() * 90000000);
    const nowIso = new Date().toISOString();

    // Deduct from sender
    db.prepare('UPDATE users SET balance = balance - ? WHERE id = ?').run(numAmount, sender.id);
    // Credit recipient
    db.prepare('UPDATE users SET balance = balance + ? WHERE id = ?').run(numAmount, recipient.id);

    // Record sender transaction
    const senderTxId = 'tx_' + Date.now() + '_s';
    db.prepare(`
      INSERT INTO transactions (id, user_id, type, amount, currency, counterparty_name, counterparty_email, status, reference_id, note, created_at)
      VALUES (?, ?, 'SEND', ?, 'USD', ?, ?, 'COMPLETED', ?, ?, ?)
    `).run(senderTxId, sender.id, numAmount, recipient.name, recipient.email, refId, note || null, nowIso);

    // Record recipient transaction
    const recipientTxId = 'tx_' + Date.now() + '_r';
    db.prepare(`
      INSERT INTO transactions (id, user_id, type, amount, currency, counterparty_name, counterparty_email, status, reference_id, note, created_at)
      VALUES (?, ?, 'RECEIVE', ?, 'USD', ?, ?, 'COMPLETED', ?, ?, ?)
    `).run(recipientTxId, recipient.id, numAmount, sender.name, sender.email, refId, note || null, nowIso);

    const updatedSender = db.prepare('SELECT * FROM users WHERE id = ?').get(sender.id);
    res.json({
      success: true,
      balance: updatedSender.balance,
      reference: refId
    });
  } catch (err) {
    console.error('Transfer error:', err);
    res.status(500).json({ error: err.message });
  }
});

// ----------------------------------------------------
// PAYPAL ENDPOINTS
// ----------------------------------------------------
app.post('/api/paypal/create-order', async (req, res) => {
  try {
    const { amount } = req.body;
    if (!amount || parseFloat(amount) <= 0) {
      return res.status(400).json({ error: 'Invalid amount' });
    }

    const order = await createPayPalOrder(amount, 'USD');
    res.json(order);
  } catch (err) {
    console.error('PayPal create error:', err);
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/paypal/capture-order', async (req, res) => {
  try {
    const { orderId, userId } = req.body;
    if (!orderId || !userId) {
      return res.status(400).json({ error: 'Order ID and User ID required' });
    }

    const user = db.prepare('SELECT * FROM users WHERE id = ?').get(userId);
    if (!user) return res.status(404).json({ error: 'User not found' });

    const captureData = await capturePayPalOrder(orderId);

    if (captureData.status !== 'COMPLETED') {
      return res.status(400).json({ error: `PayPal status: ${captureData.status}` });
    }

    const capturedAmount = parseFloat(
      captureData.purchase_units?.[0]?.payments?.captures?.[0]?.amount?.value || '0.00'
    );

    if (capturedAmount <= 0) {
      return res.status(400).json({ error: 'Captured amount invalid' });
    }

    // Run Background AI Risk Engine Pipeline
    await handleRiskPipeline(userId, {
      amount: capturedAmount,
      type: 'DEPOSIT_PAYPAL',
      country: 'US',
      device_id: 'dev_primary'
    });

    const refId = 'PP-' + (captureData.id || Math.floor(100000 + Math.random() * 900000));
    const nowIso = new Date().toISOString();

    // Credit real user balance
    db.prepare('UPDATE users SET balance = balance + ? WHERE id = ?').run(capturedAmount, userId);

    // Record real transaction
    const txId = 'tx_' + Date.now();
    db.prepare(`
      INSERT INTO transactions (id, user_id, type, amount, currency, counterparty_name, counterparty_email, status, reference_id, note, created_at)
      VALUES (?, ?, 'DEPOSIT_PAYPAL', ?, 'USD', 'PayPal Deposit', 'service@paypal.com', 'COMPLETED', ?, 'PayPal Funds Added', ?)
    `).run(txId, userId, capturedAmount, refId, nowIso);

    const updatedUser = db.prepare('SELECT * FROM users WHERE id = ?').get(userId);

    res.json({
      success: true,
      balance: updatedUser.balance,
      transactionId: txId,
      reference: refId
    });
  } catch (err) {
    console.error('PayPal capture error:', err);
    res.status(500).json({ error: err.message });
  }
});

// ----------------------------------------------------
// GEMINI AI ASSISTANT ENDPOINT
// ----------------------------------------------------
app.post('/api/ai/assistant', async (req, res) => {
  try {
    const { userId, prompt } = req.body;
    if (!prompt) return res.status(400).json({ error: 'Prompt required' });

    if (!GEMINI_API_KEY) {
      return res.status(500).json({ error: 'GEMINI_API_KEY not configured in environment' });
    }

    let userContext = "No account found.";
    if (userId) {
      const user = db.prepare('SELECT email, name, tag, balance, account_status FROM users WHERE id = ?').get(userId);
      const txs = db.prepare('SELECT type, amount, created_at, counterparty_name FROM transactions WHERE user_id = ? ORDER BY created_at DESC LIMIT 5').all(userId);
      if (user) {
        userContext = `User: ${user.name} (${user.tag}). Balance: $${user.balance.toFixed(2)}. Status: ${user.account_status}. Recent transactions: ${JSON.stringify(txs)}`;
      }
    }

    const systemInstruction = `You are Pulse AI, the payment and financial assistant for the Pulse payment app.
Guidelines:
- strictly no emojis
- minimal, direct, factual text only
- answer questions about balances, payments, transfers, and PayPal integration cleanly
- Account context: ${userContext}`;

    const geminiRes = await fetch(GEMINI_ENDPOINT, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-goog-api-key': GEMINI_API_KEY
      },
      body: JSON.stringify({
        contents: [
          {
            parts: [
              { text: `${systemInstruction}\n\nUser Question: ${prompt}` }
            ]
          }
        ]
      })
    });

    if (!geminiRes.ok) {
      const errText = await geminiRes.text();
      return res.status(500).json({ error: `Gemini error: ${errText}` });
    }

    const data = await geminiRes.json();
    const reply = data.candidates?.[0]?.content?.parts?.[0]?.text?.trim() || "No response generated.";

    res.json({ reply });
  } catch (err) {
    console.error('AI assistant error:', err);
    res.status(500).json({ error: err.message });
  }
});

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const clientDist = path.join(__dirname, '..', '..', 'client', 'dist');

if (fs.existsSync(clientDist)) {
  app.use(express.static(clientDist));
  app.get('*', (req, res) => {
    if (!req.path.startsWith('/api')) {
      res.sendFile(path.join(clientDist, 'index.html'));
    }
  });
}

app.listen(PORT, () => {
  console.log(`Pulse API running on http://localhost:${PORT}`);
});
