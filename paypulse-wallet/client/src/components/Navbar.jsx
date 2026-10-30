import React from 'react';
import { LogOut } from 'lucide-react';

export default function Navbar({ user, activeTab, setActiveTab, onSignOut }) {
  return (
    <header className="w-full bg-white border-b-2 border-[#5a3bbe] px-4 py-3">
      <div className="max-w-4xl mx-auto flex items-center justify-between">
        {/* Brand */}
        <div className="flex items-center gap-6">
          <div 
            onClick={() => setActiveTab('wallet')}
            className="text-2xl font-black tracking-tight text-[#5a3bbe] cursor-pointer"
          >
            Pulse
          </div>

          {/* Navigation Tabs */}
          <nav className="flex items-center gap-2">
            {['wallet', 'paypal', 'ai'].map((tab) => {
              const isActive = activeTab === tab;
              const label = tab === 'wallet' ? 'Wallet' : tab === 'paypal' ? 'PayPal' : 'AI';
              return (
                <button
                  key={tab}
                  onClick={() => setActiveTab(tab)}
                  className={`px-4 py-1.5 rounded-lg text-sm font-bold transition-all ${
                    isActive 
                      ? 'bg-[#5a3bbe] text-white' 
                      : 'bg-white text-black border border-black hover:bg-[#5a3bbe] hover:text-white hover:border-[#5a3bbe]'
                  }`}
                >
                  {label}
                </button>
              );
            })}
          </nav>
        </div>

        {/* User & Sign Out */}
        <div className="flex items-center gap-3">
          {user?.avatar ? (
            <img 
              src={user.avatar} 
              alt={user.name || 'User'} 
              className="w-8 h-8 rounded-full border border-black object-cover"
            />
          ) : (
            <div className="w-8 h-8 rounded-full bg-[#5a3bbe] text-white flex items-center justify-center text-xs font-bold">
              {(user?.name || user?.email || 'U')[0].toUpperCase()}
            </div>
          )}

          <span className="hidden sm:inline text-xs font-bold text-black max-w-[120px] truncate">
            {user?.name || user?.email}
          </span>

          <button
            onClick={onSignOut}
            className="p-1.5 text-black hover:text-[#5a3bbe] transition-colors"
            title="Sign Out"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </div>
    </header>
  );
}
