import React from 'react';
import { Send, CreditCard } from 'lucide-react';

export default function WalletView({ user, transactions = [], onOpenSend, onOpenPayPal }) {
  return (
    <div className="space-y-6">
      {/* 100% Opaque Balance Card with color #5a3bbe */}
      <div className="w-full bg-[#5a3bbe] text-white p-6 rounded-2xl shadow-none">
        <div className="flex items-center justify-between mb-4">
          <span className="text-xs font-bold uppercase tracking-wider text-white">
            Available Balance
          </span>
          <span className="text-xs font-bold border border-white px-2 py-0.5 rounded text-white">
            USD
          </span>
        </div>

        <div className="text-4xl sm:text-5xl font-black tracking-tight text-white mb-4">
          ${(user?.balance || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
        </div>

        <div className="flex items-center justify-between text-xs font-bold text-white pt-2 border-t border-white/20">
          <span>Account: {user?.tag || '@user'}</span>
          <span>Status: {user?.account_status || 'ACTIVE'}</span>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="grid grid-cols-2 gap-3">
        <button
          onClick={onOpenSend}
          className="py-3 px-4 bg-[#5a3bbe] text-white font-bold text-xs rounded-xl hover:opacity-90 transition-all flex items-center justify-center gap-2"
        >
          <Send className="w-4 h-4" />
          <span>Send Money</span>
        </button>

        <button
          onClick={onOpenPayPal}
          className="py-3 px-4 bg-white text-black font-bold text-xs border-2 border-black rounded-xl hover:bg-black hover:text-white transition-all flex items-center justify-center gap-2"
        >
          <CreditCard className="w-4 h-4" />
          <span>Add via PayPal</span>
        </button>
      </div>

      {/* Transactions List */}
      <div className="border-2 border-black rounded-2xl p-5 bg-white">
        <div className="flex items-center justify-between mb-4 pb-2 border-b-2 border-black">
          <h2 className="text-sm font-black uppercase text-black">
            Transactions
          </h2>
          <span className="text-xs font-bold text-black">
            {transactions.length} Records
          </span>
        </div>

        {transactions.length === 0 ? (
          <div className="py-8 text-center text-xs font-bold text-black">
            No transactions recorded.
          </div>
        ) : (
          <div className="space-y-2">
            {transactions.map((tx) => {
              const isCredit = tx.type === 'RECEIVE' || tx.type === 'DEPOSIT_PAYPAL';
              return (
                <div
                  key={tx.id}
                  className="p-3 border border-black rounded-xl flex items-center justify-between bg-white hover:border-[#5a3bbe] transition-colors"
                >
                  <div>
                    <p className="text-xs font-bold text-black">
                      {tx.counterparty_name || tx.type}
                    </p>
                    <p className="text-[10px] font-medium text-black">
                      {new Date(tx.created_at).toLocaleDateString()} • Ref: {tx.reference_id || tx.id}
                    </p>
                  </div>

                  <div className="text-right">
                    <p className={`text-sm font-black ${isCredit ? 'text-[#5a3bbe]' : 'text-black'}`}>
                      {isCredit ? '+' : '-'}${tx.amount.toFixed(2)}
                    </p>
                    <p className="text-[10px] font-bold text-black uppercase">
                      {tx.status}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
