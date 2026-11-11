import 'dotenv/config';
import { randomUUID } from 'node:crypto';

const PAYPAL_CLIENT_ID = process.env.PAYPAL_CLIENT_ID;
const PAYPAL_SECRET = process.env.PAYPAL_SECRET;
const PAYPAL_API_BASE = process.env.PAYPAL_API_BASE || 'https://api-m.sandbox.paypal.com';

let cachedToken = null;
let tokenExpiresAt = 0;

export async function getPayPalAccessToken() {
  const now = Date.now();
  if (cachedToken && now < tokenExpiresAt - 60000) return cachedToken;

  if (!PAYPAL_CLIENT_ID || !PAYPAL_SECRET) {
    throw new Error('PayPal credentials not configured in environment variables');
  }

  const auth = Buffer.from(`${PAYPAL_CLIENT_ID}:${PAYPAL_SECRET}`).toString('base64');
  const response = await fetch(`${PAYPAL_API_BASE}/v1/oauth2/token`, {
    method: 'POST',
    headers: {
      Authorization: `Basic ${auth}`,
      'Content-Type': 'application/x-www-form-urlencoded'
    },
    body: 'grant_type=client_credentials'
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`PayPal auth failed: ${response.status} - ${errorText}`);
  }

  const data = await response.json();
  cachedToken = data.access_token;
  tokenExpiresAt = now + (data.expires_in * 1000);
  return cachedToken;
}

function asPayPalMoney(value, currency = 'USD') {
  const parsed = Number(value);
  return {
    currency_code: currency,
    value: Number.isFinite(parsed) ? parsed.toFixed(2) : '0.00'
  };
}

export async function createPayPalOrder(amount, currency = 'USD') {
  const token = await getPayPalAccessToken();
  const response = await fetch(`${PAYPAL_API_BASE}/v2/checkout/orders`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      intent: 'CAPTURE',
      purchase_units: [{
        amount: asPayPalMoney(amount, currency),
        description: 'Pulse Wallet Deposit'
      }]
    })
  });

  if (!response.ok) {
    const err = await response.text();
    throw new Error(`PayPal Create Order Error: ${err}`);
  }

  return response.json();
}

export async function createPayPalAuthorizeOrder(amount, currency = 'USD', description = 'Pulse escrow authorization') {
  const token = await getPayPalAccessToken();
  const response = await fetch(`${PAYPAL_API_BASE}/v2/checkout/orders`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      intent: 'AUTHORIZE',
      purchase_units: [{
        amount: asPayPalMoney(amount, currency),
        description
      }]
    })
  });

  if (!response.ok) {
    const err = await response.text();
    throw new Error(`PayPal Authorize Order Error: ${err}`);
  }

  return response.json();
}

export async function createPayPalCheckoutOrder(purchaseUnits) {
  const token = await getPayPalAccessToken();
  const response = await fetch(`${PAYPAL_API_BASE}/v2/checkout/orders`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ intent: 'CAPTURE', purchase_units: purchaseUnits })
  });

  if (!response.ok) {
    const err = await response.text();
    throw new Error(`PayPal Create Order Error: ${err}`);
  }

  return response.json();
}

export async function capturePayPalOrder(orderId) {
  const token = await getPayPalAccessToken();
  const response = await fetch(`${PAYPAL_API_BASE}/v2/checkout/orders/${orderId}/capture`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json'
    }
  });

  if (!response.ok) {
    const err = await response.text();
    throw new Error(`PayPal Capture Order Error: ${err}`);
  }

  return response.json();
}

export async function capturePayPalAuthorization(authorizationId, amount, currency = 'USD') {
  const token = await getPayPalAccessToken();
  const response = await fetch(`${PAYPAL_API_BASE}/v2/payments/authorizations/${encodeURIComponent(authorizationId)}/capture`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      amount: asPayPalMoney(amount, currency),
      invoice_id: randomUUID()
    })
  });

  if (!response.ok) {
    const err = await response.text();
    throw new Error(`PayPal Capture Authorization Error: ${err}`);
  }

  return response.json();
}

export async function voidPayPalAuthorization(authorizationId) {
  const token = await getPayPalAccessToken();
  const response = await fetch(`${PAYPAL_API_BASE}/v2/payments/authorizations/${encodeURIComponent(authorizationId)}/void`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json'
    }
  });

  if (!response.ok) {
    const err = await response.text();
    throw new Error(`PayPal Void Authorization Error: ${err}`);
  }

  return response.json();
}

export async function refundPayPalCapture(captureId, requestId = randomUUID()) {
  const token = await getPayPalAccessToken();
  const response = await fetch(`${PAYPAL_API_BASE}/v2/payments/captures/${encodeURIComponent(captureId)}/refund`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
      'PayPal-Request-Id': requestId
    },
    body: JSON.stringify({})
  });

  if (!response.ok) {
    const err = await response.text();
    throw new Error(`PayPal Refund Error: ${err}`);
  }

  return response.json();
}
