import React, { useState } from 'react';
import { X, Send } from 'lucide-react';
import { api } from '../services/api';

export default function SendModal({ isOpen, onClose, user, onSendSuccess }) {
  const [recipient, setRecipient] = useState('');
  const [amount, setAmount] = useState('');
  const [note, setNote] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    const numAmount = parseFloat(amount);
    if (isNaN(numAmount) || numAmount <= 0) {
      setError('Enter valid amount');
      return;
    }

    if (numAmount > (user?.balance || 0)) {
      setError('Insufficient balance');
      return;
    }

    if (!recipient.trim()) {
      setError('Recipient required');
      return;
    }

    setLoading(true);
    try {
      const data = await api.transfer({
        senderId: user.id,
        recipientQuery: recipient.trim(),
        amount: numAmount,
        note: note.trim()
      });
      if (onSendSuccess) {
        onSendSuccess(data);
      }
      onClose();
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40">
      <div 
        className="w-full max-w-sm bg-white border-2 border-black rounded-2xl p-5 text-black shadow-none relative"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b-2 border-black mb-4">
          <h3 className="text-sm font-black uppercase text-black">
            Send Money
          </h3>
          <button
            onClick={onClose}
            className="p-1 text-black hover:text-[#5a3bbe]"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {error && (
          <div className="mb-3 p-2 border border-black bg-white text-xs font-bold text-black">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-3">
          <div>
            <label className="block text-[11px] font-bold uppercase text-black mb-1">
              Recipient Email or Tag
            </label>
            <input
              type="text"
              required
              placeholder="e.g. user@domain.com or @tag"
              value={recipient}
              onChange={(e) => setRecipient(e.target.value)}
              className="w-full px-3 py-2 bg-white border border-black rounded-xl text-xs font-medium text-black outline-none focus:border-[#5a3bbe]"
            />
          </div>

          <div>
            <div className="flex justify-between items-center mb-1">
              <label className="text-[11px] font-bold uppercase text-black">
                Amount (USD)
              </label>
              <span className="text-[10px] font-bold text-black">
                Max: ${(user?.balance || 0).toFixed(2)}
              </span>
            </div>
            <input
              type="number"
              step="0.01"
              min="0.01"
              required
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              className="w-full px-3 py-2 bg-white border border-black rounded-xl text-lg font-black text-black outline-none focus:border-[#5a3bbe]"
            />
          </div>

          <div>
            <label className="block text-[11px] font-bold uppercase text-black mb-1">
              Note (Optional)
            </label>
            <input
              type="text"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              className="w-full px-3 py-2 bg-white border border-black rounded-xl text-xs font-medium text-black outline-none focus:border-[#5a3bbe]"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full mt-2 py-2.5 bg-[#5a3bbe] text-white font-bold text-xs rounded-xl hover:opacity-90 transition-opacity flex items-center justify-center gap-2"
          >
            <Send className="w-3.5 h-3.5" />
            <span>{loading ? 'Processing...' : 'Confirm Transfer'}</span>
          </button>
        </form>
      </div>
    </div>
  );
}
