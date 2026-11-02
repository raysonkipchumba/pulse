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
