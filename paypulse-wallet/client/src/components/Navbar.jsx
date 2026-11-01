import React from 'react';
import { ArrowDownLeft, ArrowLeftRight, LayoutDashboard, LogOut, Sparkles } from 'lucide-react';

const navigation = [
  { id: 'wallet', label: 'Overview', icon: LayoutDashboard },
  { id: 'activity', label: 'Activity', icon: ArrowLeftRight },
  { id: 'paypal', label: 'Add money', icon: ArrowDownLeft },
  { id: 'ai', label: 'Pulse assistant', icon: Sparkles }
];

export default function Navbar({ user, activeTab, setActiveTab, onSignOut }) {
  const initials = (user?.name || user?.email || 'U')
    .split(/\s+/)
    .map((part) => part[0])
    .slice(0, 2)
    .join('')
    .toUpperCase();

  return (
    <aside className="sidebar">
      <button
        type="button"
        className="brand"
        onClick={() => setActiveTab('wallet')}
        aria-label="Pulse home"
      >
        <span className="brand-mark">p</span>
        <span className="brand-name">pulse<span>.</span></span>
      </button>

      <div className="sidebar-label">MENU</div>
      <nav className="side-nav" aria-label="Main navigation">
        {navigation.map(({ id, label, icon: Icon }) => (
          <button
            type="button"
            key={id}
            onClick={() => setActiveTab(id)}
            className={`nav-item ${activeTab === id ? 'active' : ''}`}
            aria-current={activeTab === id ? 'page' : undefined}
          >
            <Icon size={18} strokeWidth={1.8} />
            <span>{label}</span>
            {id === 'ai' && <span className="nav-new">NEW</span>}
          </button>
        ))}
      </nav>

      <div className="sidebar-spacer" />
      <div className="sidebar-promo">
        <div className="promo-icon"><Sparkles size={17} /></div>
        <p>Money made simpler.</p>
        <span>Everything you need, all in one place.</span>
      </div>
      <div className="sidebar-account">
        <div className="account-avatar">
          {user?.avatar ? <img src={user.avatar} alt="" /> : initials}
        </div>
        <div className="account-copy">
          <strong>{user?.name || 'Your account'}</strong>
          <span>{user?.email || user?.tag || 'Pulse member'}</span>
        </div>
        <button
          type="button"
          className="signout-button"
          onClick={onSignOut}
          aria-label="Sign out"
          title="Sign out"
        >
          <LogOut size={17} />
        </button>
      </div>
    </aside>
  );
}
