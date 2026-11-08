const BASE_URL = import.meta.env.VITE_API_BASE_URL || '/api';

export const api = {
  async syncUser(userData) {
    const res = await fetch(`${BASE_URL}/auth/sync`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(userData)
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Failed to synchronize user');
    return data;
  },

  async getUser(id) {
    const res = await fetch(`${BASE_URL}/user/${id}`);
    if (!res.ok) throw new Error('User not found');
    return res.json();
  },

  async getTransactions(userId) {
    const res = await fetch(`${BASE_URL}/transactions/${userId}`);
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Failed to load transactions');
    if (!Array.isArray(data)) throw new Error('The server returned an invalid transaction list');
    return data;
  },

  async transfer(payload) {
    const res = await fetch(`${BASE_URL}/transfer`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Transfer failed');
    return data;
  },

  async createPayPalOrder(amount) {
    const res = await fetch(`${BASE_URL}/paypal/create-order`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ amount })
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Failed to create PayPal order');
    return data;
  },

  async capturePayPalOrder(orderId, userId) {
    const res = await fetch(`${BASE_URL}/paypal/capture-order`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ orderId, userId })
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Failed to capture PayPal payment');
    return data;
  },

  async getPayPalConfig() {
    const res = await fetch(`${BASE_URL}/config`);
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Unable to load payment configuration');
    return data;
  },

  async estimateEcoImpact(cart) {
    const res = await fetch(`${BASE_URL}/checkout/eco-estimate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ cart })
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Carbon estimate failed');
    return data;
  },

  async assessCheckoutRisk(cart) {
    const res = await fetch(`${BASE_URL}/checkout/risk-check`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ cart })
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Checkout risk review failed');
    return data;
  },

  async createCheckoutOrder(payload) {
    const res = await fetch(`${BASE_URL}/checkout/create-order`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Failed to create checkout order');
    return data;
  },

  async captureCheckoutOrder(orderId) {
    const res = await fetch(`${BASE_URL}/checkout/capture-order`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ orderId })
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Failed to capture checkout payment');
    return data;
  },

  async createMicroPool(payload) {
    const res = await fetch(`${BASE_URL}/micro-pools`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Failed to create group pool');
    return data;
  },

  async getMicroPool(id) {
    const res = await fetch(`${BASE_URL}/micro-pools/${encodeURIComponent(id)}`);
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Unable to load group pool');
    return data;
  },

  async createPoolContributionOrder(poolId, payload) {
    const res = await fetch(`${BASE_URL}/micro-pools/${encodeURIComponent(poolId)}/orders`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Failed to create pool contribution');
    return data;
  },

  async capturePoolContribution(poolId, orderId) {
    const res = await fetch(`${BASE_URL}/micro-pools/${encodeURIComponent(poolId)}/capture`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ orderId })
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Failed to capture pool contribution');
    return data;
  },

  async askAI(userId, prompt) {
    if (!userId) throw new Error('A signed-in account is required to use Pulse AI');
    const res = await fetch(`${BASE_URL}/ai/assistant`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId, prompt })
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'AI assistant error');
    return data;
  }
};
