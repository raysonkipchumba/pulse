import React, { useState, useEffect, useRef } from 'react';
import { CreditCard } from 'lucide-react';
import { api } from '../services/api';

function loadPayPalScript(clientId) {
  if (window.paypal) return Promise.resolve();
  return new Promise((resolve, reject) => {
    const existing = document.getElementById('paypal-sdk-script');
    if (existing) {
      existing.addEventListener('load', resolve);
      existing.addEventListener('error', reject);
      return;
    }
    const script = document.createElement('script');
    script.id = 'paypal-sdk-script';
    script.src = `https://www.paypal.com/sdk/js?client-id=${clientId}&currency=USD`;
    script.async = true;
    script.onload = () => resolve();
    script.onerror = (err) => reject(err);
    document.body.appendChild(script);
  });
}

export default function PayPalView({ user, onDepositSuccess }) {
  const [amount, setAmount] = useState('25.00');
  const [statusMessage, setStatusMessage] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [sdkReady, setSdkReady] = useState(false);
  const paypalContainerRef = useRef(null);

  useEffect(() => {
    let isMounted = true;

    async function initSdk() {
      try {
        let clientId = import.meta.env.VITE_PAYPAL_CLIENT_ID;
        if (!clientId) {
          const cfgRes = await fetch('/api/config');
          const cfg = await cfgRes.json();
          clientId = cfg.paypalClientId;
        }

        if (!clientId) {
          if (isMounted) setStatusMessage('PayPal Client ID not configured.');
          return;
        }

        await loadPayPalScript(clientId);
        if (isMounted) setSdkReady(true);
      } catch (err) {
        if (isMounted) setStatusMessage(`PayPal SDK load error: ${err.message}`);
      }
    }

    initSdk();

    return () => {
      isMounted = false;
    };
  }, []);

  useEffect(() => {
    if (!sdkReady || !window.paypal || !paypalContainerRef.current) return;

    paypalContainerRef.current.innerHTML = '';

    window.paypal.Buttons({
      style: {
        layout: 'vertical',
        color: 'black',
        shape: 'rect',
        label: 'paypal'
      },
      createOrder: async () => {
        setIsProcessing(true);
        setStatusMessage('');
        try {
          const data = await api.createPayPalOrder(amount);
          return data.id;
        } catch (err) {
          setIsProcessing(false);
          setStatusMessage(`Order error: ${err.message}`);
          throw err;
        }
      },
      onApprove: async (data) => {
        try {
          setStatusMessage('Capturing payment...');
          const capture = await api.capturePayPalOrder(data.orderID, user.id);
          setIsProcessing(false);
          setStatusMessage(`Payment confirmed. Ref: ${capture.reference}`);
          if (onDepositSuccess) {
            onDepositSuccess(capture);
          }
        } catch (err) {
          setIsProcessing(false);
          setStatusMessage(`Capture error: ${err.message}`);
        }
      },
      onError: (err) => {
        setIsProcessing(false);
        setStatusMessage('PayPal transaction error.');
        console.error(err);
      }
    }).render(paypalContainerRef.current);
  }, [sdkReady, amount, user.id, onDepositSuccess]);

  return (
    <div className="deposit-page">
      <div className="deposit-hero">
        <div className="deposit-hero-copy">
          <h2>Add money to Pulse</h2>
          <p>Choose an amount and securely complete your deposit with PayPal.</p>
        </div>
        <div className="deposit-hero-icon"><CreditCard size={22} /></div>
      </div>

      <div className="deposit-panel">
        <div>
          <label htmlFor="deposit-amount">
            Deposit amount <span>(USD)</span>
          </label>
          <input
            id="deposit-amount"
            type="number"
            min="1.00"
            step="0.01"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
          />
        </div>

        <div className="deposit-presets">
          {['10.00', '25.00', '50.00', '100.00'].map((preset) => (
            <button
              key={preset}
              type="button"
              onClick={() => setAmount(preset)}
              className={amount === preset ? 'selected' : ''}
            >
              ${preset}
            </button>
          ))}
        </div>

        {statusMessage && (
          <div className="deposit-status" role="status">
            {statusMessage}
          </div>
        )}

        {isProcessing && <div className="deposit-status" role="status">Payment in progress…</div>}
        <div className="paypal-button-wrap">
          <div ref={paypalContainerRef} />
        </div>
      </div>
    </div>
  );
}
