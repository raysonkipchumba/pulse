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
    <div className="send-overlay">
      <div 
        className="send-dialog"
        role="dialog"
        aria-modal="true"
        aria-labelledby="send-dialog-title"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="send-dialog-header">
          <h3 id="send-dialog-title">
            Send Money
          </h3>
          <button
            type="button"
            onClick={onClose}
            className="send-close"
            aria-label="Close"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {error && (
          <div className="send-error" role="alert">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="send-form">
          <div>
            <label htmlFor="send-recipient">
              Demo Recipient Email or Tag
            </label>
            <input
              id="send-recipient"
              type="text"
              required
              placeholder="@pulse_demo_recipient"
              value={recipient}
              onChange={(e) => setRecipient(e.target.value)}
            />
          </div>

          <div>
            <div className="send-amount-label">
              <label htmlFor="send-amount">
                Amount (USD)
              </label>
              <span>
                Max: ${(user?.balance || 0).toFixed(2)}
              </span>
            </div>
            <input
              id="send-amount"
              type="number"
              step="0.01"
              min="0.01"
              required
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
            />
          </div>

          <div>
            <label htmlFor="send-note">
              Note (Optional)
            </label>
            <input
              id="send-note"
              type="text"
              value={note}
              onChange={(e) => setNote(e.target.value)}
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="send-submit"
          >
            <Send className="w-3.5 h-3.5" />
            <span>{loading ? 'Processing...' : 'Confirm Transfer'}</span>
          </button>
        </form>
      </div>
    </div>
  );
}
