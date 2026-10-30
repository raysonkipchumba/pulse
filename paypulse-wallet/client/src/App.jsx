import React, { useState, useEffect, useCallback } from 'react';
import Navbar from './components/Navbar';
import AuthView from './components/AuthView';
import WalletView from './components/WalletView';
import PayPalView from './components/PayPalView';
import AssistantView from './components/AssistantView';
import SendModal from './components/SendModal';
import { auth, onAuthStateChanged, signOut } from './firebase';
import { api } from './services/api';

export default function App() {
  const [firebaseUser, setFirebaseUser] = useState(null);
  const [pulseUser, setPulseUser] = useState(null);
  const [transactions, setTransactions] = useState([]);
  const [activeTab, setActiveTab] = useState('wallet');
  const [isSendOpen, setIsSendOpen] = useState(false);
  const [loading, setLoading] = useState(true);

  // Sync user and fetch transactions
  const syncAndLoadUserData = useCallback(async (fbUser) => {
    try {
      const synced = await api.syncUser({
        uid: fbUser.uid,
        email: fbUser.email,
        name: fbUser.displayName || fbUser.email.split('@')[0],
        avatar: fbUser.photoURL || null
      });
      setPulseUser(synced);

      const txs = await api.getTransactions(fbUser.uid);
      setTransactions(txs);
    } catch (err) {
      console.error('User load error:', err);
    }
  }, []);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      setFirebaseUser(user);
      if (user) {
        await syncAndLoadUserData(user);
      } else {
        setPulseUser(null);
        setTransactions([]);
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, [syncAndLoadUserData]);

  const handleSignOut = async () => {
    await signOut(auth);
  };

  const handleTransferSuccess = async () => {
    if (firebaseUser) {
      await syncAndLoadUserData(firebaseUser);
    }
  };

  const handleDepositSuccess = async () => {
    if (firebaseUser) {
      await syncAndLoadUserData(firebaseUser);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center text-black text-xs font-bold">
        Pulse Loading...
      </div>
    );
  }

  if (!firebaseUser) {
    return <AuthView onAuthSuccess={(user) => setFirebaseUser(user)} />;
  }

  return (
    <div className="min-h-screen bg-white text-black flex flex-col font-sans">
      {/* Top Navbar */}
      <Navbar
        user={pulseUser}
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        onSignOut={handleSignOut}
      />

      {/* Main Content Area */}
      <main className="flex-1 max-w-4xl w-full mx-auto p-4 sm:p-6 bg-white">
        {activeTab === 'wallet' && (
          <WalletView
            user={pulseUser}
            transactions={transactions}
            onOpenSend={() => setIsSendOpen(true)}
            onOpenPayPal={() => setActiveTab('paypal')}
          />
        )}

        {activeTab === 'paypal' && (
          <PayPalView
            user={pulseUser}
            onDepositSuccess={handleDepositSuccess}
          />
        )}

        {activeTab === 'ai' && (
          <AssistantView user={pulseUser} />
        )}
      </main>

      {/* Footer */}
      <footer className="border-t-2 border-black bg-white py-3 text-center text-xs font-bold text-black">
        Pulse • Real Payments • PayPal SDK
      </footer>

      {/* Send Modal */}
      <SendModal
        isOpen={isSendOpen}
        onClose={() => setIsSendOpen(false)}
        user={pulseUser}
        onSendSuccess={handleTransferSuccess}
      />
    </div>
  );
}
