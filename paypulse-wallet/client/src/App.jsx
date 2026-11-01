import React, { useState, useEffect, useCallback } from 'react';
import Navbar from './components/Navbar';
import AuthView from './components/AuthView';
import WalletView from './components/WalletView';
import ActivityView from './components/ActivityView';
import PayPalView from './components/PayPalView';
import AssistantView from './components/AssistantView';
import SendModal from './components/SendModal';
import { LogOut } from 'lucide-react';
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

  const handleDepositSuccess = useCallback(async () => {
    if (firebaseUser) {
      await syncAndLoadUserData(firebaseUser);
    }
  }, [firebaseUser, syncAndLoadUserData]);

  if (loading) {
    return (
      <div className="loading-screen">
        <div className="loading-mark">P</div>
        <span>Getting your wallet ready…</span>
      </div>
    );
  }

  if (!firebaseUser) {
    return <AuthView onAuthSuccess={(user) => setFirebaseUser(user)} />;
  }

  const pageTitles = {
    wallet: 'Overview',
    activity: 'Activity',
    paypal: 'Add money',
    ai: 'Pulse assistant'
  };

  return (
    <div className="app-shell">
      <Navbar
        user={pulseUser}
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        onSignOut={handleSignOut}
      />
      <div className="app-content">
        <header className="topbar">
          <div className="topbar-heading">
            <span className="eyebrow">YOUR MONEY, IN MOTION</span>
            <h1>{pageTitles[activeTab]}</h1>
          </div>
          <div className="topbar-actions">
            <span className="secure-label"><span className="secure-dot" /> Secure account</span>
            <button
              type="button"
              className="icon-button mobile-signout"
              onClick={handleSignOut}
              aria-label="Sign out"
              title="Sign out"
            >
              <LogOut size={18} />
            </button>
            <div className="topbar-avatar" aria-label={pulseUser?.name || 'Your account'}>
              {pulseUser?.avatar ? (
                <img src={pulseUser.avatar} alt="" />
              ) : (
                (pulseUser?.name || pulseUser?.email || 'U')[0].toUpperCase()
              )}
            </div>
          </div>
        </header>
        <main className="page-content">
        {activeTab === 'wallet' && (
          <WalletView
            user={pulseUser}
            transactions={transactions}
            onOpenSend={() => setIsSendOpen(true)}
            onOpenPayPal={() => setActiveTab('paypal')}
            onViewActivity={() => setActiveTab('activity')}
            onAskAssistant={() => setActiveTab('ai')}
          />
        )}

        {activeTab === 'activity' && (
          <ActivityView
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
        <footer className="app-footer">
          <span>Pulse Financial</span>
          <span>Your wallet, all in one place</span>
        </footer>
      </div>

      <SendModal
        isOpen={isSendOpen}
        onClose={() => setIsSendOpen(false)}
        user={pulseUser}
        onSendSuccess={handleTransferSuccess}
      />
    </div>
  );
}
