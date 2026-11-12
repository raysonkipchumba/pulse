import React, { useState, useEffect, useCallback, useRef } from 'react';
import Navbar from './components/Navbar';
import AuthView from './components/AuthView';
import WalletView from './components/WalletView';
import ActivityView from './components/ActivityView';
import PayPalView from './components/PayPalView';
import CheckoutView from './components/CheckoutView';
import AssistantView from './components/AssistantView';
import SendModal from './components/SendModal';
import { Check, ChevronDown, Copy, LogOut } from 'lucide-react';
import { api } from './services/api';

export default function App() {
  const [pulseUser, setPulseUser] = useState(null);
  const [transactions, setTransactions] = useState([]);
  const [transactionsError, setTransactionsError] = useState('');
  const [activeTab, setActiveTab] = useState(() => new URLSearchParams(window.location.search).has('pool') ? 'checkout' : 'wallet');
  const [isSendOpen, setIsSendOpen] = useState(false);
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [profileTagCopied, setProfileTagCopied] = useState(false);
  const [profileTagCopyError, setProfileTagCopyError] = useState('');
  const [loadError, setLoadError] = useState('');
  const [loading, setLoading] = useState(true);
  const profileMenuRef = useRef(null);

  useEffect(() => {
    const closeProfileMenu = (event) => {
      if (event.type === 'keydown' && event.key === 'Escape') {
        setIsProfileOpen(false);
      } else if (event.type === 'pointerdown' && !profileMenuRef.current?.contains(event.target)) {
        setIsProfileOpen(false);
      }
    };

    document.addEventListener('pointerdown', closeProfileMenu);
    document.addEventListener('keydown', closeProfileMenu);
    return () => {
      document.removeEventListener('pointerdown', closeProfileMenu);
      document.removeEventListener('keydown', closeProfileMenu);
    };
  }, []);

  const loadUserData = useCallback(async (user) => {
    if (!user?.id) {
      throw new Error('Your account could not be loaded. Please try again.');
    }
    setPulseUser(user);

    try {
      const txs = await api.getTransactions(user.id);
      setTransactions(txs);
      setTransactionsError('');
    } catch (err) {
      console.error('Transaction load error:', err);
      setTransactionsError(err.message || 'Unable to load transactions.');
    }
  }, []);

  const handleRetryTransactions = async () => {
    if (!pulseUser?.id) return;
    try {
      const txs = await api.getTransactions(pulseUser.id);
      setTransactions(txs);
      setTransactionsError('');
    } catch (err) {
      console.error('Transaction reload error:', err);
      setTransactionsError(err.message || 'Unable to load transactions.');
    }
  };

  useEffect(() => {
    let active = true;
    const restoreSession = async () => {
      if (!api.getToken()) {
        setPulseUser(null);
        setTransactions([]);
        setTransactionsError('');
        setLoading(false);
        return;
      }

      setLoadError('');
      setLoading(true);
      try {
        const user = await api.getCurrentUser();
        if (active) await loadUserData(user);
      } catch (err) {
        console.error('Session restore error:', err);
        if (active) {
          if (err.status === 401) {
            api.signOut();
            setPulseUser(null);
            setTransactions([]);
          } else {
            setLoadError(err.message || 'Unable to load your account. Please try again.');
          }
        }
      } finally {
        if (active) setLoading(false);
      }
    };

    restoreSession();
    return () => {
      active = false;
    };
  }, [loadUserData]);

  const handleSignOut = async () => {
    api.signOut();
    setPulseUser(null);
    setTransactions([]);
    setLoadError('');
    setIsProfileOpen(false);
  };

  const handleAuthSuccess = async (user) => {
    setLoading(true);
    setLoadError('');
    try {
      await loadUserData(user);
    } catch (err) {
      console.error('User load error:', err);
      setLoadError(err.message || 'Unable to load your account. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleProfileTagCopy = async () => {
    if (!pulseUser?.tag) return;
    if (!navigator.clipboard) {
      setProfileTagCopyError('Copy is unavailable in this browser.');
      return;
    }
    try {
      await navigator.clipboard.writeText(pulseUser.tag);
      setProfileTagCopied(true);
      setProfileTagCopyError('');
      window.setTimeout(() => setProfileTagCopied(false), 1800);
    } catch (err) {
      console.error('Unable to copy account tag:', err);
      setProfileTagCopyError('Could not copy account tag.');
    }
  };

  const handleRetryLoad = async () => {
    setLoading(true);
    setLoadError('');
    try {
      const user = await api.getCurrentUser();
      await loadUserData(user);
    } catch (err) {
      console.error('User load retry error:', err);
      setLoadError(err.message || 'Unable to load your account. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleTransferSuccess = async () => {
    try {
      await loadUserData(await api.getCurrentUser());
    } catch (err) {
      console.error('Wallet refresh error:', err);
      setLoadError(err.message || 'Unable to refresh your wallet.');
    }
  };

  const handleDepositSuccess = useCallback(async () => {
    try {
      await loadUserData(await api.getCurrentUser());
    } catch (err) {
      console.error('Wallet refresh error:', err);
      setLoadError(err.message || 'Unable to refresh your wallet.');
    }
  }, [loadUserData]);

  if (loading) {
    return (
      <div className="loading-screen">
        <div className="loading-mark">P</div>
        <span>Loading your account...</span>
      </div>
    );
  }

  if (!pulseUser) {
    return <AuthView onAuthSuccess={handleAuthSuccess} />;
  }

  if (loadError || !pulseUser) {
    return (
      <div className="account-load-screen">
        <div className="account-load-card">
          <div className="brand-mark">p</div>
          <h1>We couldn't load your account</h1>
          <p>{loadError || 'Your account is still being prepared. Please try again.'}</p>
          <button type="button" onClick={handleRetryLoad}>Try again</button>
        </div>
      </div>
    );
  }

  const pageTitles = {
    wallet: 'Overview',
    activity: 'Activity',
    paypal: 'Add money',
    checkout: 'Smart checkout',
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
            <h1>{pageTitles[activeTab]}</h1>
          </div>
          <div className="topbar-actions">
            <div className="profile-menu" ref={profileMenuRef}>
              <button
                type="button"
                className="profile-trigger"
                onClick={() => setIsProfileOpen((open) => !open)}
                aria-label="Open account menu"
                aria-expanded={isProfileOpen}
                aria-haspopup="dialog"
              >
                <span className="topbar-avatar">
                  {pulseUser.avatar ? (
                    <img src={pulseUser.avatar} alt="" />
                  ) : (
                    (pulseUser.name || pulseUser.email || 'U')[0].toUpperCase()
                  )}
                </span>
                <ChevronDown size={15} />
              </button>
              {isProfileOpen && (
                <div className="profile-dropdown" role="dialog" aria-label="Account profile">
                  <div className="profile-details">
                    <strong>{pulseUser.name || 'Pulse member'}</strong>
                    <span>{pulseUser.email}</span>
                  </div>
                  <button
                    type="button"
                    className="profile-tag"
                    onClick={handleProfileTagCopy}
                    aria-label={profileTagCopied ? 'Account tag copied' : 'Copy account tag'}
                  >
                    <span>{pulseUser.tag || 'Account tag unavailable'}</span>
                    {profileTagCopied ? <Check size={15} /> : <Copy size={15} />}
                  </button>
                  {profileTagCopyError && <p className="profile-copy-error" role="status">{profileTagCopyError}</p>}
                  <div className="profile-status">
                    {pulseUser.account_status || 'ACTIVE'} account
                  </div>
                  <button
                    type="button"
                    className="profile-signout"
                    onClick={handleSignOut}
                  >
                    <LogOut size={16} />
                    Sign out
                  </button>
                </div>
              )}
            </div>
          </div>
        </header>
        <main className="page-content">
        {transactionsError && (
          <div className="account-notice" role="status">
            <span>Some wallet activity could not be loaded: {transactionsError}</span>
            <button type="button" onClick={handleRetryTransactions}>Retry</button>
          </div>
        )}
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

        {activeTab === 'checkout' && (
          <CheckoutView user={pulseUser} />
        )}

        {activeTab === 'ai' && (
          <AssistantView user={pulseUser} userId={pulseUser.id} />
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
