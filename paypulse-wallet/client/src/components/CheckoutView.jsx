import React, { useEffect, useRef, useState } from 'react';
import { AlertTriangle, Leaf, Mic, Plus, ShoppingBag, Users, Volume2, X } from 'lucide-react';
import { api } from '../services/api';
import { loadPayPalScript } from '../services/paypalSdk';

const OVERRIDE_PHRASE = 'I UNDERSTAND THE RISK';
const ordinalIndexes = { first: 0, one: 0, second: 1, two: 1, third: 2, three: 2, fourth: 3, four: 3, fifth: 4, five: 4 };

function dollars(value) {
  return `$${Number(value || 0).toFixed(2)}`;
}

function speak(text) {
  if (!window.speechSynthesis || !window.SpeechSynthesisUtterance) return;
  window.speechSynthesis.cancel();
  window.speechSynthesis.speak(new window.SpeechSynthesisUtterance(text));
}

export default function CheckoutView({ user }) {
  const [cart, setCart] = useState([]);
  const [itemName, setItemName] = useState('');
  const [itemCategory, setItemCategory] = useState('other');
  const [itemPrice, setItemPrice] = useState('');
  const [targetAmount, setTargetAmount] = useState('');
  const [contributionAmount, setContributionAmount] = useState('');
  const [poolId, setPoolId] = useState(() => new URLSearchParams(window.location.search).get('pool'));
  const [pool, setPool] = useState(null);
  const [ecoEstimate, setEcoEstimate] = useState(null);
  const [ecoOptIn, setEcoOptIn] = useState(false);
  const [riskAssessment, setRiskAssessment] = useState(null);
  const [overrideText, setOverrideText] = useState('');
  const [checkoutReady, setCheckoutReady] = useState(false);
  const [isReviewing, setIsReviewing] = useState(false);
  const [isOmniPay, setIsOmniPay] = useState(false);
  const [voiceStatus, setVoiceStatus] = useState('');
  const [status, setStatus] = useState('');
  const [error, setError] = useState('');
  const [shareUrl, setShareUrl] = useState('');
  const paypalContainerRef = useRef(null);
  const recognitionRef = useRef(null);
  const voiceCommandRef = useRef(null);

  useEffect(() => () => {
    recognitionRef.current?.stop();
    window.speechSynthesis?.cancel();
  }, []);

  const cartTotal = Math.round(cart.reduce((sum, item) => sum + item.quantity * Number(item.unitPrice), 0) * 100) / 100;
  const amountToContribute = Number(contributionAmount);
  const paymentCart = poolId && pool
    ? [{ name: `Group contribution ${pool.id.slice(0, 8)}`, category: 'group contribution', quantity: 1, unitPrice: amountToContribute }]
    : cart;

  function resetCheckout() {
    setRiskAssessment(null);
    setOverrideText('');
    setCheckoutReady(false);
    setEcoEstimate(null);
    setEcoOptIn(false);
    setStatus('');
    setError('');
  }

  useEffect(() => {
    if (!poolId) return undefined;
    let active = true;
    const refresh = async () => {
      try {
        const nextPool = await api.getMicroPool(poolId);
        if (!active) return;
        setPool(nextPool);
        setCart(nextPool.cart.map((item, index) => ({ ...item, id: `pool-item-${index}` })));
        setContributionAmount((current) => current || Math.min(25, nextPool.targetAmount).toFixed(2));
        setTargetAmount(nextPool.targetAmount.toFixed(2));
        setError('');
      } catch (err) {
        if (active) setError(err.message);
      }
    };
    refresh();
    const pollId = window.setInterval(refresh, 5000);
    return () => {
      active = false;
      window.clearInterval(pollId);
    };
  }, [poolId]);

  useEffect(() => {
    if (!checkoutReady || !riskAssessment || !paypalContainerRef.current) return undefined;
    const paypalContainer = paypalContainerRef.current;
    let active = true;
    let buttons;

    async function mountPayPal() {
      try {
        const clientId = (await api.getPayPalConfig()).paypalClientId;
        if (!clientId) throw new Error('PayPal Client ID is not configured.');
        await loadPayPalScript(clientId);
        if (!active || !window.paypal || !paypalContainer) return;
        paypalContainer.innerHTML = '';
        buttons = window.paypal.Buttons({
          style: { layout: 'vertical', color: 'black', shape: 'rect', label: 'paypal' },
          createOrder: async () => {
            setError('');
            const payload = {
              amount: amountToContribute,
              assessmentId: riskAssessment.assessmentId,
              overridePhrase: overrideText
            };
            const order = poolId
              ? await api.createPoolContributionOrder(poolId, payload)
              : await api.createCheckoutOrder({
                cart,
                donationAmount: ecoOptIn ? ecoEstimate?.donationAmount || 0 : 0,
                assessmentId: riskAssessment.assessmentId,
                overridePhrase: overrideText
              });
            return order.id;
          },
          onApprove: async (data) => {
            try {
              setStatus('Confirming payment with PayPal...');
              const result = poolId
                ? await api.capturePoolContribution(poolId, data.orderID)
                : await api.captureCheckoutOrder(data.orderID);
              setStatus(poolId
                ? `Contribution received. Pool progress: ${dollars(result.currentPooledAmount)} of ${dollars(result.targetAmount)}.`
                : 'Payment confirmed.');
              if (poolId) setPool((current) => current ? { ...current, currentPooledAmount: result.currentPooledAmount, status: result.status } : current);
              setCheckoutReady(false);
              setRiskAssessment(null);
            } catch (err) {
              setError(err.message);
              setStatus('');
            }
          },
          onError: (err) => {
            setError(err?.message || 'PayPal transaction failed.');
            setStatus('');
          }
        });
        await buttons.render(paypalContainer);
        if (isOmniPay) {
          const message = 'Checkout is ready. Select the PayPal button to open the payment window.';
          setVoiceStatus(message);
          speak(message);
        }
      } catch (err) {
        if (active) setError(err.message || 'Unable to load PayPal checkout.');
      }
    }

    mountPayPal();
    return () => {
      active = false;
      buttons?.close?.();
      paypalContainer.innerHTML = '';
    };
  }, [checkoutReady, riskAssessment, overrideText, cart, ecoOptIn, ecoEstimate, poolId, amountToContribute, isOmniPay]);

  async function estimateEco() {
    if (poolId || cart.length === 0) return;
    setError('');
    setStatus('Estimating the cart footprint...');
    try {
      const estimate = await api.estimateEcoImpact(cart.map(({ name, category, quantity, unitPrice }) => ({ name, category, quantity, unitPrice })));
      setEcoEstimate(estimate);
      setStatus('Eco-Route estimate ready.');
    } catch (err) {
      setError(err.message);
      setStatus('');
    }
  }

  async function beginCheckout() {
    setError('');
    setStatus('Reviewing transaction safety...');
    setIsReviewing(true);
    setCheckoutReady(false);
    setRiskAssessment(null);
    try {
      if (!poolId && cart.length === 0) throw new Error('Add an item before checkout.');
      if (poolId && (!pool || !Number.isFinite(amountToContribute) || amountToContribute < 1)) {
        throw new Error('Enter a contribution of at least $1.00.');
      }
      if (!poolId && !ecoEstimate) {
        try {
          setEcoEstimate(await api.estimateEcoImpact(cart));
        } catch {
          setEcoEstimate(null);
        }
      }
      const assessment = await api.assessCheckoutRisk(paymentCart.map(({ name, category, quantity, unitPrice }) => ({ name, category, quantity, unitPrice })));
      setRiskAssessment(assessment);
      if (assessment.highRisk) {
        setStatus('Review the warning and type the confirmation phrase to continue.');
        if (isOmniPay) speak(`Warning. ${assessment.reason}. Type the confirmation phrase on screen to continue.`);
      } else {
        setStatus('Safety review complete. PayPal checkout is ready.');
        setCheckoutReady(true);
      }
    } catch (err) {
      setError(err.message);
      setStatus('');
      if (isOmniPay) speak(err.message);
    } finally {
      setIsReviewing(false);
    }
  }

  function addItem(event) {
    event.preventDefault();
    const unitPrice = Number(itemPrice);
    if (!itemName.trim() || !Number.isFinite(unitPrice) || unitPrice <= 0) return;
    setCart((current) => [...current, {
      id: `${Date.now()}-${Math.random()}`,
      name: itemName.trim(), category: itemCategory, quantity: 1, unitPrice
    }]);
    setItemName('');
    setItemPrice('');
    resetCheckout();
  }

  function removeItem(itemId) {
    setCart((current) => current.filter((item) => item.id !== itemId));
    resetCheckout();
  }

  async function createPool() {
    setError('');
    try {
      const result = await api.createMicroPool({ userId: user?.id, cart, targetAmount: Number(targetAmount || cartTotal), durationHours: 24 });
      setPoolId(result.id);
      setPool({ ...result, cart, contributorCount: 0 });
      setShareUrl(result.shareUrl);
      window.history.replaceState({}, '', `/?pool=${encodeURIComponent(result.id)}`);
      setContributionAmount(Math.min(25, result.targetAmount).toFixed(2));
      resetCheckout();
    } catch (err) {
      setError(err.message);
    }
  }

  async function copyShareLink() {
    try {
      await navigator.clipboard.writeText(shareUrl || `${window.location.origin}/?pool=${poolId}`);
      setStatus('Group link copied.');
    } catch {
      setError('Could not copy the group link in this browser.');
    }
  }

  function handleVoiceCommand(transcript) {
    const command = transcript.toLowerCase();
    if (command.includes('clear cart')) {
      if (!poolId) {
        setCart([]);
        resetCheckout();
        setVoiceStatus('Cart cleared.');
        speak('Cart cleared.');
      } else {
        speak('Group pool items cannot be changed.');
      }
      return;
    }
    const removeMatch = command.match(/remove(?: the)? (first|one|second|two|third|three|fourth|four|fifth|five|\d+)(?:st|nd|rd|th)?(?: item)?/);
    if (removeMatch) {
      const token = removeMatch[1];
      const index = ordinalIndexes[token] ?? Number(token) - 1;
      if (!poolId && cart[index]) {
        removeItem(cart[index].id);
        const message = `Removed ${cart[index].name}.`;
        setVoiceStatus(message);
        speak(message);
      } else {
        speak('That item could not be removed.');
      }
      return;
    }
    if (command.includes('proceed') || command.includes('pay with paypal') || command.includes('checkout')) {
      beginCheckout();
      return;
    }
    if (command.includes('read') || command.includes('total') || command.includes('cart')) {
      const contents = poolId && pool ? pool.cart : cart;
      const total = poolId ? amountToContribute : cartTotal;
      const summary = contents.length
        ? `${contents.map((item, index) => `Item ${index + 1}, ${item.name}, ${item.quantity} at ${dollars(item.unitPrice)} each`).join('. ')}. Total ${dollars(total)}.`
        : 'Your cart is empty.';
      setVoiceStatus(summary);
      speak(summary);
      return;
    }
    speak('Command not recognized. Say read my cart, remove the second item, clear cart, or proceed to PayPal.');
  }
  useEffect(() => {
    voiceCommandRef.current = handleVoiceCommand;
  });

  function toggleOmniPay() {
    if (isOmniPay) {
      recognitionRef.current?.stop();
      recognitionRef.current = null;
      window.speechSynthesis?.cancel();
      setIsOmniPay(false);
      setVoiceStatus('Voice checkout is off.');
      return;
    }
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition || !window.speechSynthesis) {
      setVoiceStatus('Voice checkout is not supported by this browser.');
      return;
    }
    const recognition = new SpeechRecognition();
    recognition.lang = navigator.language || 'en-US';
    recognition.continuous = true;
    recognition.interimResults = false;
    recognition.onresult = (event) => {
      const transcript = event.results[event.results.length - 1][0].transcript.trim();
      setVoiceStatus(`Heard: ${transcript}`);
      voiceCommandRef.current?.(transcript);
    };
    recognition.onerror = (event) => setVoiceStatus(`Voice input error: ${event.error}.`);
    recognitionRef.current = recognition;
    try {
      recognition.start();
      setIsOmniPay(true);
      const contents = poolId && pool ? pool.cart : cart;
      const total = poolId ? amountToContribute : cartTotal;
      const summary = contents.length
        ? `${contents.map((item, index) => `Item ${index + 1}, ${item.name}, ${item.quantity} at ${dollars(item.unitPrice)} each`).join('. ')}. Total ${dollars(total)}.`
        : 'Your cart is empty.';
      setVoiceStatus(`Listening. ${summary}`);
      speak(`OmniPay is on. ${summary}`);
    } catch {
      setVoiceStatus('Microphone access was not granted.');
    }
  }

  return (
    <div className="checkout-page">
      <section className="checkout-heading">
        <div>
          <span className="checkout-eyebrow">PULSE CHECKOUT</span>
          <h2>Shop with more confidence</h2>
          <p>Voice-guided checkout, transaction screening, optional carbon support, and shared funding.</p>
        </div>
        <button type="button" className={`omni-toggle ${isOmniPay ? 'active' : ''}`} onClick={toggleOmniPay} aria-pressed={isOmniPay}>
          <Mic size={17} /> {isOmniPay ? 'Turn off OmniPay' : 'OmniPay voice'}
        </button>
      </section>

      {isOmniPay && (
        <div className="omni-status" role="status"><Volume2 size={17} /><span>{voiceStatus || 'Listening for a checkout command.'}</span></div>
      )}

      {poolId && pool && (
        <section className="pool-progress" aria-live="polite">
          <div className="pool-progress-top">
            <div><span className="checkout-eyebrow">GROUP BUY</span><h3>{pool.status === 'FUNDED' ? 'Target reached' : `Funding ${dollars(pool.currentPooledAmount)} of ${dollars(pool.targetAmount)}`}</h3></div>
            <Users size={20} />
          </div>
          <progress value={Math.min(pool.currentPooledAmount, pool.targetAmount)} max={pool.targetAmount} />
          <div className="pool-meta"><span>{pool.contributorCount} contributors</span><span>Closes {new Date(pool.expiresAt).toLocaleString()}</span></div>
          <button type="button" className="text-action" onClick={copyShareLink}>Copy group link</button>
        </section>
      )}

      <div className="checkout-columns">
        <section className="checkout-panel">
          <div className="checkout-panel-title"><ShoppingBag size={18} /><h3>{poolId ? 'Group purchase' : 'Your cart'}</h3></div>
          {cart.length === 0 ? <p className="checkout-empty">Add an item to begin.</p> : (
            <div className="checkout-items">
              {cart.map((item, index) => (
                <div className="checkout-item" key={item.id}>
                  <div><strong>{item.name}</strong><span>{item.quantity} × {dollars(item.unitPrice)} · {item.category}</span></div>
                  <strong>{dollars(item.quantity * item.unitPrice)}</strong>
                  {!poolId && <button type="button" onClick={() => removeItem(item.id)} aria-label={`Remove ${item.name}`} title="Remove item"><X size={16} /></button>}
                  {poolId && <span className="checkout-item-index">{index + 1}</span>}
                </div>
              ))}
            </div>
          )}

          {!poolId && <>
            <form className="checkout-add-form" onSubmit={addItem}>
              <label>Item name<input value={itemName} onChange={(event) => setItemName(event.target.value)} maxLength={100} required /></label>
              <label>Category<select value={itemCategory} onChange={(event) => setItemCategory(event.target.value)}><option value="other">Other</option><option value="clothing">Clothing</option><option value="electronics">Electronics</option><option value="food">Food</option><option value="health">Health</option></select></label>
              <label>Price (USD)<input type="number" min="0.01" step="0.01" value={itemPrice} onChange={(event) => setItemPrice(event.target.value)} required /></label>
              <button type="submit" className="icon-action" aria-label="Add item"><Plus size={18} /></button>
            </form>
          </>}

          <div className="checkout-total"><span>{poolId ? 'Contribution' : 'Cart total'}</span><strong>{dollars(poolId ? amountToContribute : cartTotal)}</strong></div>
          {poolId && pool?.status === 'OPEN' && <label className="pool-contribution">Your contribution (USD)<input type="number" min="1" max={Math.max(1, pool.targetAmount - pool.currentPooledAmount)} step="0.01" value={contributionAmount} onChange={(event) => { setContributionAmount(event.target.value); resetCheckout(); }} /></label>}

          {!poolId && cart.length > 0 && <div className="eco-box">
            <div className="eco-box-heading"><Leaf size={17} /><strong>Eco-Route</strong></div>
            {ecoEstimate ? <>
              <p>{ecoEstimate.explanation} Estimated footprint: {ecoEstimate.carbonKg} kg CO2e.</p>
              <label className="eco-opt-in"><input type="checkbox" checked={ecoOptIn} onChange={(event) => setEcoOptIn(event.target.checked)} /><span>Add {dollars(ecoEstimate.donationAmount)} to the configured climate NGO</span></label>
            </> : <button type="button" className="text-action" onClick={estimateEco}>Estimate impact and offset</button>}
          </div>}

          {!poolId && cart.length > 0 && <div className="group-buy-form">
            <label>Group target (USD)<input type="number" min="1" step="0.01" value={targetAmount || cartTotal.toFixed(2)} onChange={(event) => setTargetAmount(event.target.value)} /></label>
            <button type="button" className="secondary-action" onClick={createPool}><Users size={16} /> Create 24-hour group link</button>
          </div>}
          {shareUrl && <p className="pool-share-url">Share link: <a href={shareUrl}>{shareUrl}</a></p>}
        </section>

        <section className="checkout-panel checkout-protection">
          <span className="checkout-eyebrow">SENTINEL FRAUD-SHIELD</span>
          <h3>Review before you pay</h3>
          <p>Checkout stays blocked until the transaction review completes.</p>
          {riskAssessment?.highRisk && (
            <div className="risk-warning" role="alert">
              <div><AlertTriangle size={19} /><strong>Pause: this payment may be risky</strong></div>
              <p>{riskAssessment.reason}</p>
              <p>Only continue if you have independently verified the seller and price.</p>
              <label>Type {OVERRIDE_PHRASE} to override<input value={overrideText} onChange={(event) => setOverrideText(event.target.value)} autoComplete="off" /></label>
              <button type="button" className="danger-action" disabled={overrideText !== OVERRIDE_PHRASE} onClick={() => { setCheckoutReady(true); setStatus('Override recorded. Select PayPal to continue.'); }}>
                Continue despite warning
              </button>
            </div>
          )}
          {!checkoutReady && <button type="button" className="primary-action" onClick={beginCheckout} disabled={isReviewing || (poolId && pool?.status !== 'OPEN')}>
            {isReviewing ? 'Reviewing...' : 'Review and pay with PayPal'}
          </button>}
          {checkoutReady && <div className="checkout-paypal"><div ref={paypalContainerRef} /></div>}
          <p className="checkout-disclaimer">The review is an automated signal, not a guarantee or a substitute for checking the seller yourself.</p>
        </section>
      </div>

      {(status || error) && <div className={`checkout-message ${error ? 'error' : ''}`} role={error ? 'alert' : 'status'}>{error || status}</div>}
      {poolId && <p className="pool-notice">Group contributions are captured when paid and automatically refunded if the target is missed at expiry. This is not a regulated escrow service; successful pools remain captured by the configured PayPal merchant.</p>}
      {!poolId && isOmniPay && <p className="pool-notice">Voice commands can prepare checkout, but browser popup protections require a direct tap on the PayPal button to open payment.</p>}
    </div>
  );
}