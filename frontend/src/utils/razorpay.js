const SCRIPT_SRC = 'https://checkout.razorpay.com/v1/checkout.js';

let loadPromise = null;

// Loads Razorpay's hosted checkout script once and caches the promise —
// repeat calls (e.g. donating to a second campaign in the same session)
// reuse the already-loaded script instead of injecting it again.
export function loadRazorpayScript() {
  if (window.Razorpay) return Promise.resolve(true);
  if (loadPromise) return loadPromise;

  loadPromise = new Promise((resolve, reject) => {
    const script = document.createElement('script');
    script.src = SCRIPT_SRC;
    script.onload = () => resolve(true);
    script.onerror = () => {
      loadPromise = null;
      reject(new Error('Could not load the Razorpay checkout script. Check your connection and try again.'));
    };
    document.body.appendChild(script);
  });

  return loadPromise;
}
