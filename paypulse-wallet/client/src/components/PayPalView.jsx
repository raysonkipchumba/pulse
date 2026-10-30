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
  }, [sdkReady, amount, user.id]);

  return (
    <div className="space-y-6">
      {/* 100% Opaque Header Card with color #5a3bbe */}
      <div className="bg-[#5a3bbe] text-white p-6 rounded-2xl">
        <div className="flex items-center justify-between mb-2">
          <h2 className="text-xl font-black text-white">PayPal Integration</h2>
          <CreditCard className="w-5 h-5 text-white" />
        </div>
        <p className="text-xs font-bold text-white">
          Deposit funds directly into Pulse wallet using PayPal JavaScript SDK
        </p>
      </div>

      {/* Amount Selector */}
      <div className="border-2 border-black rounded-2xl p-5 bg-white space-y-4">
        <div>
          <label className="block text-xs font-black uppercase text-black mb-1">
            Deposit Amount (USD)
          </label>
          <input
            type="number"
            min="1.00"
            step="0.01"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            className="w-full text-2xl font-black px-4 py-2 bg-white border-2 border-black rounded-xl text-black outline-none focus:border-[#5a3bbe]"
          />
        </div>

        {/* Quick Amounts */}
        <div className="grid grid-cols-4 gap-2">
          {['10.00', '25.00', '50.00', '100.00'].map((preset) => (
            <button
              key={preset}
              type="button"
              onClick={() => setAmount(preset)}
              className={`py-2 text-xs font-bold rounded-lg border transition-all ${
                amount === preset
                  ? 'bg-[#5a3bbe] text-white border-[#5a3bbe]'
                  : 'bg-white text-black border-black hover:border-[#5a3bbe]'
              }`}
            >
              ${preset}
            </button>
          ))}
        </div>

        {statusMessage && (
          <div className="p-3 border-2 border-black rounded-xl text-xs font-bold text-black bg-white">
            {statusMessage}
          </div>
        )}

        {/* PayPal SDK Button Container */}
        <div className="pt-2">
          <div ref={paypalContainerRef} className="w-full min-h-[120px]" />
        </div>
      </div>
    </div>
  );
}
