const { sendMail } = require('./email');
const { loadDonationForReceipt, buildReceiptNumber, donorDisplayName, formatCurrency, generateReceiptPdf } = require('./receipt');

// Fires the two post-payment emails (donor receipt + NGO admin notification).
// Called fire-and-forget right after a donation flips to "success" — each
// send is individually try/caught so one failing (e.g. bad address) never
// blocks the other, and neither ever propagates back to the caller: a failed
// email must not fail the donation/webhook response. There's no retry queue
// here (no job/worker infra in this stack) — a failure is logged and, for
// now, would need a manual resend; that's judged acceptable for this
// project's scope rather than standing up background job infrastructure for
// a single email step.
async function sendDonationNotifications(donationId) {
  const donation = await loadDonationForReceipt(donationId);
  if (!donation) {
    console.warn(`[notifications] Donation ${donationId} not found — skipping notifications`);
    return;
  }

  const receiptNumber = buildReceiptNumber(donation);
  const donorName = donorDisplayName(donation);
  const donorEmail = donation.donor?.email || donation.guestInfo?.email;
  const campaignTitle = donation.campaign?.title || 'a FundFlow campaign';
  const amountFormatted = formatCurrency(donation.amount, donation.currency);

  if (donorEmail) {
    try {
      const pdfBuffer = await generateReceiptPdf(donation);
      await sendMail({
        to: donorEmail,
        subject: `Your FundFlow donation receipt — ${amountFormatted} to ${campaignTitle}`,
        text:
          `Dear ${donorName},\n\n` +
          `Thank you for your donation of ${amountFormatted} to "${campaignTitle}". ` +
          `Your receipt (${receiptNumber}) is attached.\n\n` +
          '— The FundFlow team',
        attachments: [
          {
            filename: `FundFlow-Receipt-${receiptNumber}.pdf`,
            content: pdfBuffer,
            contentType: 'application/pdf',
          },
        ],
      });
    } catch (err) {
      console.error(`[notifications] Failed to send donor receipt email for donation ${donationId}:`, err.message);
    }
  } else {
    console.warn(`[notifications] Donation ${donationId} has no donor/guest email — skipping receipt email`);
  }

  const ngoAdmin = donation.ngo?.admin;
  if (ngoAdmin?.email) {
    try {
      await sendMail({
        to: ngoAdmin.email,
        subject: `New donation received for ${campaignTitle}`,
        text:
          `Hi ${ngoAdmin.name || 'there'},\n\n` +
          `Your campaign "${campaignTitle}" just received a donation of ${amountFormatted} from ${donorName}.\n\n` +
          `Receipt #: ${receiptNumber}\n\n` +
          '— FundFlow',
      });
    } catch (err) {
      console.error(`[notifications] Failed to send NGO admin notification for donation ${donationId}:`, err.message);
    }
  } else {
    console.warn(`[notifications] Donation ${donationId} has no NGO admin email — skipping NGO notification`);
  }
}

module.exports = { sendDonationNotifications };
