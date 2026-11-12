import 'dotenv/config';
import { db } from './db.js';

const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
const GEMINI_ENDPOINT = "https://generativelanguage.googleapis.com/v1beta/models/gemini-flash-latest:generateContent";

function calculateMean(arr) {
  if (!arr || arr.length === 0) return 0;
  return arr.reduce((a, b) => a + b, 0) / arr.length;
}

function calculatePstdev(arr, mu) {
  if (!arr || arr.length === 0) return 1.0;
  const variance = arr.reduce((acc, val) => acc + Math.pow(val - mu, 2), 0) / arr.length;
  return Math.sqrt(variance) || 1.0;
}

export function zscore(x, history) {
  if (!history || history.length === 0) return 0.0;
  const mu = calculateMean(history);
  const sd = calculatePstdev(history, mu);
  return (x - mu) / sd;
}

export function calculateRiskScore(acct, ev, dailyVolumes30d, todayVolume, lifetimeVolume) {
  if (acct.on_sanctions_list === 1) {
    return { score: 1.0, reasons: ["SANCTIONS_MATCH"] };
  }

  let score = 0.0;
  const reasons = [];

  const baseline = Array.isArray(dailyVolumes30d) ? dailyVolumes30d : [];
  const z = zscore((Number(todayVolume) || 0) + (Number(ev.amount) || 0), baseline);
  if (z > 3.0 && baseline.length >= 3) {
    score += 0.30;
    reasons.push('VOLUME_SPIKE');
  }

  let knownCountries = [];
  try {
    knownCountries = JSON.parse(acct.known_countries || '["US"]');
  } catch {
    knownCountries = ['US'];
  }

  let knownDevices = [];
  try {
    knownDevices = JSON.parse(acct.known_devices || '["dev_primary"]');
  } catch {
    knownDevices = ['dev_primary'];
  }

  if (ev.country && !knownCountries.includes(ev.country)) {
    score += 0.15;
    reasons.push('NEW_COUNTRY');
  }

  if (ev.device_id && !knownDevices.includes(ev.device_id)) {
    score += 0.10;
    reasons.push('NEW_DEVICE');
  }

  if (Number(acct.dispute_rate_90d || 0) > 0.01) {
    score += 0.25;
    reasons.push('HIGH_DISPUTES');
  }

  if (Number(acct.id_verified || 0) !== 1 && Number(lifetimeVolume || 0) > 1000) {
    score += 0.20;
    reasons.push('UNVERIFIED_VOLUME');
  }

  if (Number(acct.linked_bad_accounts || 0) > 0) {
    score += 0.35;
    reasons.push('LINKED_FRAUD_RING');
  }

  return {
    score: Math.min(score, 1.0),
    reasons
  };
}

export function decideAction(score) {
  if (score < 0.30) return "ALLOW";
  if (score < 0.50) return "STEP_UP";
  if (score < 0.75) return "PARTIAL_HOLD";
  return "LIMIT_ACCOUNT";
}

/**
 * AI-assisted grounded explanation generator (Guardrail: LLM only explains deterministic policy codes)
 */
async function generateGroundedExplanation(reasons, score, action, amount) {
  if (!reasons || reasons.length === 0) {
    return "Standard transaction. Risk verified within baseline tolerance.";
  }

  if (!GEMINI_API_KEY) {
    return `Automated risk evaluation: ${reasons.join(", ")}. Action assigned: ${action}.`;
  }

  try {
    const prompt = `You are a compliance risk auditor for Pulse. 
The deterministic policy engine calculated:
Risk Score: ${score.toFixed(2)}
Policy Action: ${action}
Event Amount: $${amount}
Fired Reason Codes: ${reasons.join(", ")}

Task: Generate a concise, factual 2-sentence background audit log note and checklist item explaining why these specific codes fired and what standard documentation is needed. Do not use emojis. Do not invent thresholds.`;

    const response = await fetch(GEMINI_ENDPOINT, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-goog-api-key": GEMINI_API_KEY
      },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }]
      })
    });

    if (!response.ok) {
      return `Automated risk evaluation: ${reasons.join(", ")}. Action assigned: ${action}.`;
    }

    const data = await response.json();
    return data.candidates?.[0]?.content?.parts?.[0]?.text?.trim() || `Automated audit: ${reasons.join(", ")}`;
  } catch (err) {
    console.error("Gemini risk explanation error:", err.message);
    return `Audit note: Triggered signals [${reasons.join(", ")}]. Policy status: ${action}.`;
  }
}

/**
 * Main risk event handler executed in the background for every payment event.
 */
export async function handleRiskPipeline(accountId, ev) {
  const acct = await db.prepare('SELECT * FROM users WHERE id = ?').get(accountId);
  if (!acct) {
    return { action: 'ALLOW', score: 0.0, reasons: [] };
  }

  const dailyRows = await db.prepare(`
    SELECT volume FROM daily_volumes
    WHERE user_id = ? AND date < ?
    ORDER BY date DESC LIMIT 30
  `).all(accountId, new Date().toISOString().slice(0, 10));
  const dailyVolumes30d = dailyRows.map((r) => Number(r.volume || 0));

  const today = new Date().toISOString().slice(0, 10);
  const todayRow = await db.prepare('SELECT volume FROM daily_volumes WHERE user_id = ? AND date = ?').get(accountId, today);
  const todayVolume = Number(todayRow ? todayRow.volume : 0);

  const totalVolumeRow = await db.prepare('SELECT SUM(amount) as total FROM transactions WHERE user_id = ?').get(accountId);
  const lifetimeVolume = Number(totalVolumeRow?.total || 0);

  const { score, reasons } = calculateRiskScore(acct, ev, dailyVolumes30d, todayVolume, lifetimeVolume);
  const action = decideAction(score);
  const explanation = await generateGroundedExplanation(reasons, score, action, ev.amount);

  const decisionId = 'dec_' + Date.now() + '_' + Math.floor(Math.random() * 1000);
  await db.prepare(`
    INSERT INTO risk_decisions (id, account_id, event_id, event_type, score, reasons_json, action, ai_audit_explanation)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    decisionId,
    accountId,
    ev.id || 'ev_' + Date.now(),
    ev.type || 'PAYMENT',
    score,
    JSON.stringify(reasons),
    action,
    explanation
  );

  if (todayRow) {
    await db.prepare('UPDATE daily_volumes SET volume = volume + ? WHERE user_id = ? AND date = ?').run(Number(ev.amount || 0), accountId, today);
  } else {
    await db.prepare('INSERT INTO daily_volumes (user_id, date, volume) VALUES (?, ?, ?)').run(accountId, today, Number(ev.amount || 0));
  }

  if (action === 'PARTIAL_HOLD') {
    await db.prepare('UPDATE users SET held_balance = held_balance + ?, account_status = ? WHERE id = ?').run(Number(ev.amount || 0), 'PARTIAL_HOLD', accountId);
  } else if (action === 'LIMIT_ACCOUNT') {
    await db.prepare('UPDATE users SET account_status = ? WHERE id = ?').run('LIMITED', accountId);
  } else if (action === 'STEP_UP') {
    await db.prepare('UPDATE users SET account_status = ? WHERE id = ?').run('STEP_UP', accountId);
  }

  return { action, score, reasons, explanation };
}
