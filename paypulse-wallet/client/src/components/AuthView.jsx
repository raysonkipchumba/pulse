import React, { useState } from 'react';
import { ArrowRight } from 'lucide-react';
import { 
  auth, 
  googleProvider, 
  signInWithPopup, 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword 
} from '../firebase';

export default function AuthView({ onAuthSuccess }) {
  const [isRegister, setIsRegister] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleGoogleSignIn = async () => {
    setError('');
    setLoading(true);
    try {
      const res = await signInWithPopup(auth, googleProvider);
      onAuthSuccess(res.user);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleEmailAuth = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      let res;
      if (isRegister) {
        res = await createUserWithEmailAndPassword(auth, email, password);
      } else {
        res = await signInWithEmailAndPassword(auth, email, password);
      }
      onAuthSuccess(res.user);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-white flex flex-col items-center justify-center p-4 text-black">
      <div className="w-full max-w-sm border-2 border-black rounded-2xl p-6 bg-white shadow-none">
        {/* App Title */}
        <div className="text-center mb-6">
          <h1 className="text-3xl font-black text-[#5a3bbe] tracking-tight">Pulse</h1>
          <p className="text-xs font-bold text-black mt-1">Payment Platform</p>
        </div>

        {error && (
          <div className="mb-4 p-2.5 border border-black bg-white text-xs font-bold text-black">
            {error}
          </div>
        )}

        {/* Google Sign In */}
        <button
          type="button"
          onClick={handleGoogleSignIn}
          disabled={loading}
          className="w-full py-2.5 px-4 bg-white text-black font-bold text-xs border-2 border-black rounded-xl hover:bg-[#5a3bbe] hover:text-white hover:border-[#5a3bbe] transition-all flex items-center justify-center gap-2 mb-4"
        >
          <span>Google Sign In</span>
        </button>

        <div className="flex items-center my-4">
          <div className="flex-1 border-t border-black"></div>
          <span className="px-2 text-[10px] font-bold text-black uppercase">Or</span>
          <div className="flex-1 border-t border-black"></div>
        </div>

        {/* Email & Password Form */}
        <form onSubmit={handleEmailAuth} className="space-y-3">
          <div>
            <label className="block text-[11px] font-bold uppercase text-black mb-1">Email</label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-3 py-2 bg-white border border-black rounded-xl text-xs font-medium text-black outline-none focus:border-[#5a3bbe]"
            />
          </div>

          <div>
            <label className="block text-[11px] font-bold uppercase text-black mb-1">Password</label>
            <input
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-3 py-2 bg-white border border-black rounded-xl text-xs font-medium text-black outline-none focus:border-[#5a3bbe]"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-2.5 bg-[#5a3bbe] text-white font-bold text-xs rounded-xl hover:opacity-90 transition-opacity flex items-center justify-center gap-2 mt-4"
          >
            <span>{loading ? 'Processing' : isRegister ? 'Register' : 'Sign In'}</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </form>

        <div className="mt-4 text-center">
          <button
            type="button"
            onClick={() => {
              setIsRegister(!isRegister);
              setError('');
            }}
            className="text-xs font-bold text-black hover:text-[#5a3bbe] underline"
          >
            {isRegister ? 'Already registered? Sign In' : 'New to Pulse? Register'}
          </button>
        </div>
      </div>
    </div>
  );
}
