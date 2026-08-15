import { useState } from 'react';
import { Link } from 'react-router-dom';

import { useAuth } from '../../context/AuthContext';
import { createDonationOrder, verifyDonationPayment, downloadReceipt } from '../../api/donations';
import { loadRazorpayScript } from '../../utils/razorpay';
import { EMAIL_REGEX } from '../../utils/validation';

const PRESET_AMOUNTS = [100, 500, 1000, 2500, 5000];

// status machine: idle (form) -> creating-order -> awaiting-payment
// (Razorpay's own modal owns the UI at this point) -> verifying -> success | error.
// On error, "Try again" just resets status back to idle — amount/message/
// guest fields are never cleared, so nothing entered is lost on retry.
export default function DonationPanel({ campaign, onDonationSuccess }) {
  const { user, isAuthenticated } = useAuth();

  const [amount, setAmount] = useState('500');
  const [message, setMessage] = useState('');
  const [isAnonymous, setIsAnonymous] = useState(false);
  const [guestName, setGuestName] = useState('');
  const [guestEmail, setGuestEmail] = useState('');

  const [status, setStatus] = useState('idle');
  const [fieldErrors, setFieldErrors] = useState({});
  const [errorMessage, setErrorMessage] = useState('');
  const [successInfo, setSuccessInfo] = useState(null);
  const [isDownloading, setIsDownloading] = useState(false);

  function validate() {
    const errors = {};
    const numericAmount = Number(amount);
    if (!amount || Number.isNaN(numericAmount) || numericAmount < 1) {
      errors.amount = 'Enter an amount of at least ₹1';
    }
    if (!isAuthenticated) {
      if (!guestName.trim()) errors.guestName = 'Name is required';
      if (!guestEmail || !EMAIL_REGEX.test(guestEmail)) errors.guestEmail = 'Enter a valid email address';
    }
    return errors;
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setErrorMessage('');

    const errors = validate();
    setFieldErrors(errors);
    if (Object.keys(errors).length > 0) return;

    setStatus('creating-order');
    try {
      await loadRazorpayScript();
    } catch (err) {
      setStatus('error');
      setErrorMessage(err.message);
      return;
    }

    let order;
    try {
      order = await createDonationOrder({
        campaignId: campaign._id,
        amount: Number(amount),
        isAnonymous,
        message: message.trim() || undefined,
        guestInfo: isAuthenticated ? undefined : { name: guestName.trim(), email: guestEmail.trim() },
      });
    } catch (err) {
      setStatus('error');
      setErrorMessage(err.response?.data?.message || 'Could not start checkout. Please try again.');
      return;
    }

    setStatus('awaiting-payment');

    const rzp = new window.Razorpay({
      key: order.keyId,
      amount: order.amount,
      currency: order.currency,
      order_id: order.orderId,
      name: 'FundFlow',
      description: campaign.title,
      prefill: {
        name: isAuthenticated ? user.name : guestName,
        email: isAuthenticated ? user.email : guestEmail,
      },
      theme: { color: '#0f766e' },
      handler: (response) => handlePaymentSuccess(response, order),
      modal: {
        ondismiss: () => {
          setStatus('error');
          setErrorMessage('Checkout was closed before the payment finished. No amount was charged — you can try again.');
        },
      },
    });

    rzp.on('payment.failed', (response) => {
      setStatus('error');
      setErrorMessage(response.error?.description || 'Payment failed. Please try again.');
    });

    rzp.open();
  }

  async function handlePaymentSuccess(response, order) {
    setStatus('verifying');
    try {
      await verifyDonationPayment({
        razorpay_order_id: response.razorpay_order_id,
        razorpay_payment_id: response.razorpay_payment_id,
        razorpay_signature: response.razorpay_signature,
      });
      setStatus('success');
      setSuccessInfo({ donationId: order.donationId, amount: Number(amount) });
      onDonationSuccess?.();
    } catch {
      setStatus('error');
      setErrorMessage(
        `Your payment went through, but we couldn't confirm it automatically. If you were charged, ` +
          `contact support with reference ${response.razorpay_order_id}.`
      );
    }
  }

  async function handleDownloadReceipt() {
    setIsDownloading(true);
    try {
      await downloadReceipt(successInfo.donationId);
    } catch {
      setErrorMessage('Could not download the receipt right now — please try again in a moment.');
    } finally {
      setIsDownloading(false);
    }
  }

  function resetToForm() {
    setStatus('idle');
    setErrorMessage('');
  }

  if (status === 'success') {
    return (
      <div className="mt-6 rounded-lg border border-teal-200 bg-teal-50 p-6 text-center">
        <p className="text-lg font-semibold text-teal-800">Thank you for your donation! 🎉</p>
        <p className="mt-1 text-sm text-teal-700">
          ₹{successInfo.amount.toLocaleString('en-IN')} to {campaign.title}
        </p>
        {isAuthenticated ? (
          <button
            type="button"
            onClick={handleDownloadReceipt}
            disabled={isDownloading}
            className="mt-4 rounded-md bg-teal-700 px-4 py-2 text-sm font-medium text-white hover:bg-teal-800 disabled:opacity-60"
          >
            {isDownloading ? 'Preparing receipt…' : 'Download receipt'}
          </button>
        ) : (
          <p className="mt-4 text-sm text-teal-700">A receipt has been emailed to {guestEmail}.</p>
        )}
      </div>
    );
  }

  const isBusy = status === 'creating-order' || status === 'awaiting-payment' || status === 'verifying';

  return (
    <form onSubmit={handleSubmit} className="mt-6 flex flex-col gap-4" noValidate>
      {status === 'error' && errorMessage && (
        <div className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700" role="alert">
          {errorMessage}
          <button type="button" onClick={resetToForm} className="ml-2 font-medium underline">
            Try again
          </button>
        </div>
      )}

      {status !== 'error' && (
        <>
          <div>
            <span className="block text-sm font-medium text-gray-700">Amount (INR)</span>
            <div className="mt-2 flex flex-wrap gap-2">
              {PRESET_AMOUNTS.map((preset) => (
                <button
                  key={preset}
                  type="button"
                  onClick={() => setAmount(String(preset))}
                  className={`rounded-md border px-3 py-1.5 text-sm font-medium transition-colors ${
                    amount === String(preset)
                      ? 'border-teal-600 bg-teal-50 text-teal-800'
                      : 'border-gray-300 text-gray-600 hover:border-gray-400'
                  }`}
                >
                  ₹{preset.toLocaleString('en-IN')}
                </button>
              ))}
            </div>
            <input
              type="number"
              min="1"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="Custom amount"
              className="mt-2 w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-teal-600 focus:outline-none focus:ring-1 focus:ring-teal-600"
            />
            {fieldErrors.amount && <p className="mt-1 text-sm text-red-600">{fieldErrors.amount}</p>}
          </div>

          {!isAuthenticated && (
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div>
                <label htmlFor="guestName" className="block text-sm font-medium text-gray-700">
                  Your name
                </label>
                <input
                  id="guestName"
                  type="text"
                  value={guestName}
                  onChange={(e) => setGuestName(e.target.value)}
                  className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-teal-600 focus:outline-none focus:ring-1 focus:ring-teal-600"
                />
                {fieldErrors.guestName && <p className="mt-1 text-sm text-red-600">{fieldErrors.guestName}</p>}
              </div>
              <div>
                <label htmlFor="guestEmail" className="block text-sm font-medium text-gray-700">
                  Your email
                </label>
                <input
                  id="guestEmail"
                  type="email"
                  value={guestEmail}
                  onChange={(e) => setGuestEmail(e.target.value)}
                  className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-teal-600 focus:outline-none focus:ring-1 focus:ring-teal-600"
                />
                {fieldErrors.guestEmail && <p className="mt-1 text-sm text-red-600">{fieldErrors.guestEmail}</p>}
              </div>
              <p className="col-span-full text-xs text-gray-500">
                <Link to="/login" className="text-teal-700 hover:text-teal-800">
                  Log in
                </Link>{' '}
                to track this donation in your dashboard, or continue as a guest.
              </p>
            </div>
          )}

          {isAuthenticated && (
            <p className="text-sm text-gray-500">
              Donating as <span className="font-medium text-gray-700">{user.name}</span> ({user.email})
            </p>
          )}

          <div>
            <label htmlFor="message" className="block text-sm font-medium text-gray-700">
              Message <span className="text-gray-400">(optional)</span>
            </label>
            <textarea
              id="message"
              rows={2}
              maxLength={500}
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="Say something to the NGO…"
              className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-teal-600 focus:outline-none focus:ring-1 focus:ring-teal-600"
            />
          </div>

          <label className="flex items-center gap-2 text-sm text-gray-600">
            <input
              type="checkbox"
              checked={isAnonymous}
              onChange={(e) => setIsAnonymous(e.target.checked)}
              className="rounded border-gray-300 text-teal-600 focus:ring-teal-600"
            />
            Give anonymously
          </label>

          <button
            type="submit"
            disabled={isBusy}
            className="w-full rounded-md bg-teal-700 px-4 py-2.5 text-sm font-medium text-white hover:bg-teal-800 disabled:opacity-60"
          >
            {status === 'creating-order' && 'Preparing checkout…'}
            {status === 'awaiting-payment' && 'Waiting for payment…'}
            {status === 'verifying' && 'Confirming payment…'}
            {status === 'idle' && `Donate ₹${Number(amount || 0).toLocaleString('en-IN')}`}
          </button>
        </>
      )}
    </form>
  );
}
