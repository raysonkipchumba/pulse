import React, { useMemo, useState } from 'react';
import {
  ArrowDownLeft, ArrowLeftRight, ArrowUpRight, Check,
  ChevronRight, Copy, CreditCard, Eye, EyeOff, Plus, Send, Sparkles
} from 'lucide-react';

const money = (value) => Number(value || 0).toLocaleString('en-US', {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2
});

const isCredit = (transaction) => ['RECEIVE', 'DEPOSIT_PAYPAL'].includes(transaction.type);

function getWeekDays() {
  return Array.from({ length: 7 }, (_, index) => {
    const date = new Date();
    date.setHours(0, 0, 0, 0);
    date.setDate(date.getDate() - (6 - index));
    return date;
  });
}

function CashflowChart({ transactions }) {
  const [days] = useState(getWeekDays);
  const totals = days.map((day) => {
    const nextDay = new Date(day);
    nextDay.setDate(nextDay.getDate() + 1);
    return transactions
      .filter((transaction) => {
        const date = new Date(transaction.created_at);
        return date >= day && date < nextDay && transaction.type === 'SEND';
      })
      .reduce((sum, transaction) => sum + Number(transaction.amount || 0), 0);
  });
  const max = Math.max(...totals, 1);

  return (
    <div className="cashflow-chart">
      <div className="chart-y-labels">
        <span>${Math.round(max).toLocaleString()}</span>
        <span>${Math.round(max / 2).toLocaleString()}</span>
        <span>$0</span>
      </div>
      <div className="chart-plot">
        <div className="chart-grid"><i /><i /><i /></div>
        <div className="chart-bars" role="img" aria-label="Outgoing transfers over the last seven days">
          {totals.map((total, index) => (
            <div className="chart-bar-column" key={days[index].toISOString()}>
              <div
                className={`chart-bar ${total > 0 ? 'has-value' : ''}`}
                style={{ height: `${Math.max((total / max) * 100, 4)}%` }}
                title={`${days[index].toLocaleDateString('en-US', { weekday: 'long' })}: $${money(total)}`}
              />
              <span>{days[index].toLocaleDateString('en-US', { weekday: 'short' })}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function TransactionRow({ transaction }) {
  const credit = isCredit(transaction);
  const label = transaction.counterparty_name || (credit ? 'Money received' : 'Money sent');
  const Icon = credit ? ArrowDownLeft : ArrowUpRight;

  return (
    <div className="transaction-row">
      <div className={`transaction-icon ${credit ? 'credit' : 'debit'}`}>
        <Icon size={18} />
      </div>
      <div className="transaction-main">
        <strong>{label}</strong>
        <span>{transaction.note || (credit ? 'Money received' : 'Transfer')}, {new Date(transaction.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</span>
      </div>
      <div className="transaction-amount">
        <strong className={credit ? 'positive' : ''}>{credit ? '+' : '−'}${money(transaction.amount)}</strong>
        <span>{transaction.status || 'COMPLETED'}</span>
      </div>
    </div>
  );
}

export default function WalletView({ user, transactions = [], onOpenSend, onOpenPayPal, onViewActivity, onAskAssistant }) {
  const [balanceVisible, setBalanceVisible] = useState(true);
  const [tagCopied, setTagCopied] = useState(false);
  const [copyError, setCopyError] = useState(false);
  const [today] = useState(() => new Date());

  const currentMonthTransactions = useMemo(() => {
    return transactions.filter((transaction) => {
      const date = new Date(transaction.created_at);
      return date.getMonth() === today.getMonth() && date.getFullYear() === today.getFullYear();
    });
  }, [today, transactions]);

  const monthIncome = currentMonthTransactions
    .filter(isCredit)
    .reduce((sum, transaction) => sum + Number(transaction.amount || 0), 0);
  const monthSpent = currentMonthTransactions
    .filter((transaction) => transaction.type === 'SEND')
    .reduce((sum, transaction) => sum + Number(transaction.amount || 0), 0);
  const recentTransactions = transactions.slice(0, 5);
  const displayName = (user?.name || 'there').trim().split(/\s+/)[0];

  const copyTag = async () => {
    if (!user?.tag || !navigator.clipboard) return;
    try {
      await navigator.clipboard.writeText(user.tag);
      setTagCopied(true);
      setCopyError(false);
      window.setTimeout(() => setTagCopied(false), 1800);
    } catch (error) {
      console.error('Unable to copy account tag:', error);
      setCopyError(true);
      window.setTimeout(() => setCopyError(false), 2500);
    }
  };

  return (
    <div className="dashboard">
      <section className="welcome-row">
        <div>
          <h2>Welcome back, {displayName}</h2>
          <p>Here’s what’s happening with your money today.</p>
        </div>
        <button type="button" className="date-pill">
          {today.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}
        </button>
      </section>

      <section className="overview-grid">
        <article className="balance-card">
          <div className="balance-card-pattern" />
          <div className="balance-card-top">
            <div>
              <span className="balance-label">TOTAL BALANCE</span>
              <button
                className="balance-visibility"
                type="button"
                onClick={() => setBalanceVisible((visible) => !visible)}
                aria-label={balanceVisible ? 'Hide balance' : 'Show balance'}
              >
                {balanceVisible ? <Eye size={16} /> : <EyeOff size={16} />}
              </button>
            </div>
            <span className="balance-currency">USD <ChevronRight size={13} /></span>
          </div>
          <div className="balance-amount">{balanceVisible ? `$${money(user?.balance)}` : 'Hidden'}</div>
          <div className="balance-footer">
            <div>
              <span className="balance-label">PULSE ACCOUNT</span>
              <button type="button" className="account-tag" onClick={copyTag} title="Copy account tag">
                {user?.tag || '@pulseuser'} {tagCopied ? <Check size={14} /> : <Copy size={13} />}
              </button>
              {copyError && <span className="copy-error">Could not copy tag</span>}
            </div>
            <div className="balance-status"><span /> Account active</div>
          </div>
        </article>

        <article className="stat-card">
          <div className="stat-card-heading">
            <span className="stat-icon income"><ArrowDownLeft size={17} /></span>
            <span className="stat-period">THIS MONTH</span>
          </div>
          <span className="stat-label">Money in</span>
          <strong className="stat-value">${money(monthIncome)}</strong>
          <span className="stat-caption">Received + deposits</span>
        </article>

        <article className="stat-card">
          <div className="stat-card-heading">
            <span className="stat-icon spending"><ArrowUpRight size={17} /></span>
            <span className="stat-period">THIS MONTH</span>
          </div>
          <span className="stat-label">Money out</span>
          <strong className="stat-value">${money(monthSpent)}</strong>
          <span className="stat-caption">Sent from your wallet</span>
        </article>
      </section>

      <section className="quick-actions" aria-label="Quick actions">
        <button type="button" className="quick-action primary-action" onClick={onOpenSend}>
          <span className="quick-action-icon"><Send size={17} /></span>
          <span><strong>Send money</strong><small>Pay someone instantly</small></span>
          <ChevronRight className="quick-arrow" size={16} />
        </button>
        <button type="button" className="quick-action" onClick={onOpenPayPal}>
          <span className="quick-action-icon violet"><Plus size={19} /></span>
          <span><strong>Add money</strong><small>Top up with PayPal</small></span>
          <ChevronRight className="quick-arrow" size={16} />
        </button>
        <button type="button" className="quick-action" onClick={onViewActivity}>
          <span className="quick-action-icon blue"><CreditCard size={17} /></span>
          <span><strong>View activity</strong><small>Track every transaction</small></span>
          <ChevronRight className="quick-arrow" size={16} />
        </button>
      </section>

      <section className="dashboard-lower">
        <article className="panel cashflow-panel">
          <div className="panel-heading">
            <div>
              <h3>Cash flow</h3>
              <p>Your outgoing transfers this week</p>
            </div>
            <span className="chart-legend"><i /> Money out</span>
          </div>
          <CashflowChart transactions={transactions} />
        </article>

        <article className="panel insight-panel">
          <div className="insight-decoration"><Sparkles size={20} /></div>
          <h3>Your money,<br />at a glance.</h3>
          <p>You’ve made {currentMonthTransactions.length} transaction{currentMonthTransactions.length === 1 ? '' : 's'} this month. Keep checking in to stay on top of your finances.</p>
          <button type="button" onClick={onAskAssistant}>
            Ask Pulse AI <ChevronRight size={15} />
          </button>
        </article>
      </section>

      <section className="panel recent-panel">
        <div className="panel-heading recent-heading">
          <div>
            <h3>Recent activity</h3>
            <p>Your latest wallet transactions</p>
          </div>
          <button type="button" className="text-link" onClick={onViewActivity}>
            View all <ChevronRight size={16} />
          </button>
        </div>
        {recentTransactions.length ? (
          <div className="transaction-list">
            {recentTransactions.map((transaction) => (
              <TransactionRow key={transaction.id} transaction={transaction} />
            ))}
          </div>
        ) : (
          <div className="empty-transactions">
            <span className="empty-icon"><ArrowLeftRight size={20} /></span>
            <strong>Your activity will show up here</strong>
            <span>Add money or send your first payment to get started.</span>
          </div>
        )}
      </section>
    </div>
  );
}
