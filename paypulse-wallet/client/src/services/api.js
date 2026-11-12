const BASE_URL = import.meta.env.VITE_API_BASE_URL || '/api';
const TOKEN_KEY = 'pulse_auth_token';

function getAuthHeaders(extraHeaders = {}) {
  const headers = { ...extraHeaders };
  const token = localStorage.getItem(TOKEN_KEY);
  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }
  return headers;
}

async function jsonRequest(path, options = {}) {
  const headers = getAuthHeaders({
    'Content-Type': 'application/json',
    ...(options.headers || {})
  });

  const res = await fetch(`${BASE_URL}${path}`, {
    ...options,
    headers
  });

  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const error = new Error(data.error || 'Request failed');
    error.status = res.status;
    throw error;
  }
  return data;
}

export const api = {
  getToken() {
    return localStorage.getItem(TOKEN_KEY);
  },

  async signup(credentials) {
    const result = await jsonRequest('/signup', {
      method: 'POST',
      body: JSON.stringify(credentials)
    });
    localStorage.setItem(TOKEN_KEY, result.token);
    return result;
  },

  async login(credentials) {
    const result = await jsonRequest('/login', {
      method: 'POST',
      body: JSON.stringify(credentials)
    });
    localStorage.setItem(TOKEN_KEY, result.token);
    return result;
  },

  async getCurrentUser() {
    return jsonRequest('/auth/me');
  },

  signOut() {
    localStorage.removeItem(TOKEN_KEY);
  },

  async getUser(id) {
    return jsonRequest(`/user/${encodeURIComponent(id)}`);
  },

  async getTransactions(userId) {
    const data = await jsonRequest(`/transactions/${encodeURIComponent(userId)}`);
    if (!Array.isArray(data)) throw new Error('The server returned an invalid transaction list');
    return data;
  },

  async transfer(payload) {
    return jsonRequest('/transfer', {
      method: 'POST',
      body: JSON.stringify(payload)
    });
  },

  async createPayPalOrder(amount) {
    return jsonRequest('/paypal/create-order', {
      method: 'POST',
      body: JSON.stringify({ amount })
    });
  },

  async capturePayPalOrder(orderId, userId) {
    return jsonRequest('/paypal/capture-order', {
      method: 'POST',
      body: JSON.stringify({ orderId, userId })
    });
  },

  async getPayPalConfig() {
    return jsonRequest('/config');
  },

  async estimateEcoImpact(cart) {
    return jsonRequest('/checkout/eco-estimate', {
      method: 'POST',
      body: JSON.stringify({ cart })
    });
  },

  async assessCheckoutRisk(cart) {
    return jsonRequest('/checkout/risk-check', {
      method: 'POST',
      body: JSON.stringify({ cart })
    });
  },

  async createCheckoutOrder(payload) {
    return jsonRequest('/checkout/create-order', {
      method: 'POST',
      body: JSON.stringify(payload)
    });
  },

  async captureCheckoutOrder(orderId) {
    return jsonRequest('/checkout/capture-order', {
      method: 'POST',
      body: JSON.stringify({ orderId })
    });
  },

  async createMicroPool(payload) {
    return jsonRequest('/micro-pools', {
      method: 'POST',
      body: JSON.stringify(payload)
    });
  },

  async getMicroPool(id) {
    return jsonRequest(`/micro-pools/${encodeURIComponent(id)}`);
  },

  async createPoolContributionOrder(poolId, payload) {
    return jsonRequest(`/micro-pools/${encodeURIComponent(poolId)}/orders`, {
      method: 'POST',
      body: JSON.stringify(payload)
    });
  },

  async capturePoolContribution(poolId, orderId) {
    return jsonRequest(`/micro-pools/${encodeURIComponent(poolId)}/capture`, {
      method: 'POST',
      body: JSON.stringify({ orderId })
    });
  },

  async askAI(userId, prompt) {
    if (!userId) throw new Error('A signed-in account is required to use Pulse AI');
    return jsonRequest('/ai/assistant', {
      method: 'POST',
      body: JSON.stringify({ userId, prompt })
    });
  }
};
