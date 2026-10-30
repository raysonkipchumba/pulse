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
    <div className="space-y-6">
      {/* 100% Opaque Header Card in #5a3bbe */}
      <div className="bg-[#5a3bbe] text-white p-6 rounded-2xl">
        <h2 className="text-xl font-black text-white">AI Assistant</h2>
        <p className="text-xs font-bold text-white mt-1">
          Instant financial and payment support powered by Gemini
        </p>
      </div>

      {/* Chat Messages */}
      <div className="border-2 border-black rounded-2xl p-4 bg-white min-h-[350px] max-h-[500px] overflow-y-auto space-y-3 flex flex-col justify-between">
        <div className="space-y-3">
          {messages.map((msg, idx) => (
            <div
              key={idx}
              className={`flex ${msg.sender === 'user' ? 'justify-end' : 'justify-start'}`}
            >
              <div
                className={`max-w-[80%] p-3 rounded-xl text-xs font-bold ${
                  msg.sender === 'user'
                    ? 'bg-[#5a3bbe] text-white'
                    : 'bg-white text-black border-2 border-black'
                }`}
              >
                {msg.text}
              </div>
            </div>
          ))}

          {loading && (
            <div className="flex justify-start">
              <div className="p-3 rounded-xl text-xs font-bold bg-white text-black border-2 border-black">
                Processing query...
              </div>
            </div>
          )}
        </div>

        {/* Input Form */}
        <form onSubmit={handleSend} className="flex gap-2 pt-3 border-t-2 border-black">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Enter query..."
            className="flex-1 px-3 py-2 bg-white border border-black rounded-xl text-xs font-medium text-black outline-none focus:border-[#5a3bbe]"
          />
          <button
            type="submit"
            disabled={loading}
            className="px-4 py-2 bg-[#5a3bbe] text-white rounded-xl hover:opacity-90 transition-opacity flex items-center justify-center"
          >
            <Send className="w-4 h-4" />
          </button>
        </form>
      </div>
    </div>
  );
}
