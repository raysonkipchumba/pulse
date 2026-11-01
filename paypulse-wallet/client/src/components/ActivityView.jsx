import React, { useMemo, useState } from 'react';
import {
  ArrowDownLeft, ArrowUpRight, Download, Search, SlidersHorizontal
} from 'lucide-react';

const filters = [
  { id: 'all', label: 'All activity' },
  { id: 'incoming', label: 'Money in' },
  { id: 'outgoing', label: 'Money out' }
];

const isIncoming = (transaction) => ['RECEIVE', 'DEPOSIT_PAYPAL'].includes(transaction.type);
const formatAmount = (amount) => Number(amount || 0).toLocaleString('en-US', {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2
});

function exportTransactions(transactions) {
  const columns = ['Date', 'Name', 'Type', 'Amount', 'Currency', 'Status', 'Reference'];
  const rows = transactions.map((transaction) => [
    transaction.created_at,
    transaction.counterparty_name || '',
    transaction.type,
    transaction.amount,
    transaction.currency || 'USD',
    transaction.status || '',
    transaction.reference_id || transaction.id
  ]);
  const csv = [columns, ...rows]
    .map((row) => row.map((value) => `"${String(value ?? '').replaceAll('"', '""')}"`).join(','))
    .join('\r\n');
  const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8;' }));
  const link = document.createElement('a');
  link.href = url;
  link.download = 'pulse-transactions.csv';
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

export default function ActivityView({ transactions = [], onOpenSend, onOpenPayPal }) {
  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState('all');

  const filteredTransactions = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();
    return transactions.filter((transaction) => {
      const directionMatches = filter === 'all'
        || (filter === 'incoming' && isIncoming(transaction))
        || (filter === 'outgoing' && transaction.type === 'SEND');
      const searchableText = [
        transaction.counterparty_name,
        transaction.note,
        transaction.reference_id,
        transaction.type,
        transaction.status
      ].filter(Boolean).join(' ').toLowerCase();
      return directionMatches && searchableText.includes(normalizedQuery);
    });
  }, [filter, query, transactions]);

  return (
    <div className="activity-page">
      <section className="activity-summary">
        <div>
          <span className="summary-eyebrow">YOUR WALLET HISTORY</span>
          <h2>Every move, in one place.</h2>
          <p>Search, review, and export your Pulse transactions.</p>
        </div>
        <button
          type="button"
          className="export-button"
          onClick={() => exportTransactions(filteredTransactions)}
          disabled={!filteredTransactions.length}
        >
          <Download size={17} /> Export CSV
        </button>
      </section>

      <section className="panel activity-panel">
        <div className="activity-tools">
          <label className="activity-search">
            <Search size={17} />
            <input
              type="search"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search name, note, or reference"
              aria-label="Search transactions"
            />
          </label>
          <div className="filter-label"><SlidersHorizontal size={15} /> Filter</div>
        </div>
        <div className="filter-tabs" role="group" aria-label="Filter transactions">
          {filters.map((option) => (
            <button
              type="button"
              key={option.id}
              onClick={() => setFilter(option.id)}
              className={filter === option.id ? 'selected' : ''}
              aria-pressed={filter === option.id}
            >
              {option.label}
            </button>
          ))}
          <span className="result-count">
            {filteredTransactions.length} {filteredTransactions.length === 1 ? 'transaction' : 'transactions'}
          </span>
        </div>

        {filteredTransactions.length ? (
          <div className="transaction-list activity-list">
            {filteredTransactions.map((transaction) => {
              const incoming = isIncoming(transaction);
              const Icon = incoming ? ArrowDownLeft : ArrowUpRight;
              return (
                <div className="transaction-row" key={transaction.id}>
                  <div className={`transaction-icon ${incoming ? 'credit' : 'debit'}`}>
                    <Icon size={18} />
                  </div>
                  <div className="transaction-main">
                    <strong>{transaction.counterparty_name || (incoming ? 'Money received' : 'Money sent')}</strong>
                    <span>{transaction.note || (incoming ? 'Money received' : 'Transfer sent')}</span>
                    <span className="transaction-reference">
                      {transaction.reference_id ? `Ref ${transaction.reference_id}` : transaction.type}
                    </span>
                  </div>
                  <div className="activity-date">
                    {new Date(transaction.created_at).toLocaleDateString('en-US', {
                      month: 'short', day: 'numeric', year: 'numeric'
                    })}
                  </div>
                  <div className="transaction-amount">
                    <strong className={incoming ? 'positive' : ''}>
                      {incoming ? '+' : '−'}${formatAmount(transaction.amount)}
                    </strong>
                    <span className="status-label">{transaction.status || 'COMPLETED'}</span>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="activity-empty">
            <span className="empty-icon"><Search size={20} /></span>
            <strong>{transactions.length ? 'No matching transactions' : 'No activity yet'}</strong>
            <span>{transactions.length ? 'Try another search or filter.' : 'Your payments will appear here once you get started.'}</span>
            {!transactions.length && (
              <div className="empty-actions">
                <button type="button" onClick={onOpenSend}>Send money</button>
                <button type="button" onClick={onOpenPayPal}>Add money</button>
              </div>
            )}
          </div>
        )}
      </section>
    </div>
  );
}
