import React, { useState } from 'react';
import { ArrowRight } from 'lucide-react';
import { api } from '../services/api';

export default function AuthView({ onAuthSuccess }) {
  const [isRegister, setIsRegister] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleEmailAuth = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const result = isRegister
        ? await api.signup({ email, password })
        : await api.login({ email, password });
      await onAuthSuccess(result.user);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-screen">
      <div className="auth-card">
        <div className="auth-brand">
          <span className="brand-mark">p</span>
          <span className="brand-name">pulse<span>.</span></span>
        </div>
        <h1 className="auth-title">{isRegister ? 'Create your account' : 'Welcome to Pulse'}</h1>
        <p className="auth-subtitle">A simpler way to move and manage your money.</p>

        {error && (
          <div className="auth-error" role="alert">
            {error}
          </div>
        )}

        <form onSubmit={handleEmailAuth} className="auth-form">
          <div>
            <label htmlFor="auth-email">Email address</label>
            <input
              id="auth-email"
              type="email"
              required
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
            />
          </div>

          <div>
            <label htmlFor="auth-password">Password</label>
            <input
              id="auth-password"
              type="password"
              required
              minLength={isRegister ? 8 : undefined}
              autoComplete={isRegister ? 'new-password' : 'current-password'}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Enter your password"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="auth-submit"
          >
            <span>{loading ? 'Please wait…' : isRegister ? 'Create account' : 'Sign in'}</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </form>

        <div className="auth-switch">
          <button
            type="button"
            onClick={() => {
              setIsRegister(!isRegister);
              setError('');
            }}
          >
            {isRegister ? 'Already registered? Sign In' : 'New to Pulse? Register'}
          </button>
        </div>
      </div>
    </div>
  );
}
