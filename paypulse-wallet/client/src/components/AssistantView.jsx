import React, { useState } from 'react';
import { Send } from 'lucide-react';
import { api } from '../services/api';

export default function AssistantView({ user }) {
  const [messages, setMessages] = useState([
    {
      sender: 'assistant',
      text: 'Pulse AI Assistant active. State your request regarding wallet, transfers, or PayPal.'
    }
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSend = async (e) => {
    e.preventDefault();
    if (!input.trim() || loading) return;

    const userText = input.trim();
    setInput('');
    setMessages((prev) => [...prev, { sender: 'user', text: userText }]);
    setLoading(true);

    try {
      const data = await api.askAI(user.id, userText);
      setMessages((prev) => [...prev, { sender: 'assistant', text: data.reply }]);
    } catch (err) {
      setMessages((prev) => [...prev, { sender: 'assistant', text: `Error: ${err.message}` }]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="assistant-page">
      <div className="assistant-hero">
        <span className="assistant-sparkle"><Send size={17} /></span>
        <span className="summary-eyebrow">YOUR PERSONAL MONEY COMPANION</span>
        <h2>Meet Pulse AI</h2>
        <p>Ask a question about your wallet, transfers, or payments.</p>
      </div>

      <div className="assistant-chat">
        <div className="assistant-messages">
          {messages.map((msg, idx) => (
            <div
              key={idx}
              className={`message-row ${msg.sender === 'user' ? 'user-message' : ''}`}
            >
              <div className="message-bubble">
                {msg.text}
              </div>
            </div>
          ))}

          {loading && (
            <div className="message-row">
              <div className="message-bubble">Thinking…</div>
            </div>
          )}
        </div>

        <form onSubmit={handleSend} className="assistant-input">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Ask anything about your wallet…"
            aria-label="Ask Pulse AI"
          />
          <button
            type="submit"
            disabled={loading}
            aria-label="Send message"
          >
            <Send className="w-4 h-4" />
          </button>
        </form>
      </div>
    </div>
  );
}
