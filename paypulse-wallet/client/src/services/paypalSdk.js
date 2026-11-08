export function loadPayPalScript(clientId) {
  if (window.paypal) return Promise.resolve();
  return new Promise((resolve, reject) => {
    const existing = document.getElementById('paypal-sdk-script');
    if (existing) {
      existing.addEventListener('load', resolve, { once: true });
      existing.addEventListener('error', reject, { once: true });
      return;
    }
    const script = document.createElement('script');
    script.id = 'paypal-sdk-script';
    script.src = `https://www.paypal.com/sdk/js?client-id=${encodeURIComponent(clientId)}&currency=USD`;
    script.async = true;
    script.onload = () => resolve();
    script.onerror = (error) => reject(error);
    document.body.appendChild(script);
  });
}