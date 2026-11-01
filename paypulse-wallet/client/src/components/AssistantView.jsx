import React, { useState } from 'react';
import { Send } from 'lucide-react';
import { api } from '../services/api';

export default function AssistantView({ user, userId }) {
  const [messages, setMessages] = useState([
    {
      sender: 'assistant',
      text: 'Hi, I’m Pulse AI. Ask me about your wallet, transfers, or payments.'
    }
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSend = async (e) => {
    e.preventDefault();
    if (!input.trim() || loading) return;
    if (!userId && !user?.id) {
      setMessages((prev) => [...prev, {
        sender: 'assistant',
        text: 'Your signed-in account is still loading. Please try again in a moment.'
      }]);
      return;
    }

    const userText = input.trim();
    setInput('');
    setMessages((prev) => [...prev, { sender: 'user', text: userText }]);
    setLoading(true);

    try {
      const data = await api.askAI(userId || user?.id, userText);
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
