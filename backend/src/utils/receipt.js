const PDFDocument = require('pdfkit');

const Donation = require('../models/Donation');

const BRAND_COLOR = '#0f766e';
const TEXT_COLOR = '#111111';
const MUTED_COLOR = '#6b7280';

function loadDonationForReceipt(donationId) {
  return Donation.findById(donationId)
    .populate('donor', 'name email')
    .populate('campaign', 'title')
    .populate({
      path: 'ngo',
      select: 'name admin',
      populate: { path: 'admin', select: 'name email' },
    });
}

function buildReceiptNumber(donation) {
  return `FF-${donation._id.toString().slice(-8).toUpperCase()}`;
}

// Anonymous donations hide the donor's name on the receipt itself, even
// though we still know it internally (e.g. for the NGO admin notification).
function donorDisplayName(donation) {
  if (donation.isAnonymous) return 'Guest';
  return donation.donor?.name || donation.guestInfo?.name || 'Guest';
}

function formatCurrency(amount, currency) {
  return new Intl.NumberFormat('en-IN', { style: 'currency', currency: currency || 'INR' }).format(amount);
}

// PDFKit's built-in standard fonts (Helvetica etc.) only support WinAnsi
// encoding, which has no glyph for ₹ — it silently renders as a garbled
// superscript-1. Rather than embed a custom Unicode font just for one
// symbol, the PDF uses the ASCII-safe "INR 450.00" form; email text (plain
// UTF-8) renders the real ₹ symbol fine and keeps using formatCurrency.
function formatCurrencyAscii(amount, currency) {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: currency || 'INR',
    currencyDisplay: 'code',
  }).format(amount);
}

// Renders in-memory only — nothing is written to disk. The same generator
// backs both the post-payment email attachment and the on-demand
// GET /:id/receipt download, so there's a single source of truth for layout
// and no stored file to keep in sync with the donation record.
function generateReceiptPdf(donation) {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ size: 'A4', margin: 50 });
    const chunks = [];
    doc.on('data', (chunk) => chunks.push(chunk));
    doc.on('end', () => resolve(Buffer.concat(chunks)));
    doc.on('error', reject);

    const receiptNumber = buildReceiptNumber(donation);
    const paidOn = donation.updatedAt || donation.createdAt;

    // Header band
    doc.rect(0, 0, doc.page.width, 90).fill(BRAND_COLOR);
    doc
      .fillColor('#ffffff')
      .fontSize(24)
      .text('FundFlow', 50, 28)
      .fontSize(10)
      .text('Empowering NGOs. Enabling Change.', 50, 58);

    doc.fillColor(TEXT_COLOR).fontSize(18).text('Donation Receipt', 50, 120);

    doc
      .fontSize(10)
      .fillColor(MUTED_COLOR)
      .text(`Receipt No: ${receiptNumber}`, 50, 148)
      .text(`Date: ${paidOn.toLocaleDateString('en-IN', { year: 'numeric', month: 'long', day: 'numeric' })}`, 50, 163);

    const rows = [
      ['Donor', donorDisplayName(donation)],
      ['Campaign', donation.campaign?.title || '—'],
      ['NGO', donation.ngo?.name || '—'],
      ['Payment ID', donation.razorpayPaymentId || '—'],
      ['Status', 'Paid'],
    ];

    let y = 210;
    doc.fontSize(11);
    rows.forEach(([label, value]) => {
      doc.fillColor(MUTED_COLOR).text(label, 50, y, { width: 120 });
      doc.fillColor(TEXT_COLOR).text(value, 180, y, { width: 350 });
      y += 22;
    });

    y += 15;
    doc
      .fillColor(MUTED_COLOR)
      .fontSize(11)
      .text('Amount Donated', 50, y);
    doc
      .fillColor(BRAND_COLOR)
      .fontSize(26)
      .text(formatCurrencyAscii(donation.amount, donation.currency), 50, y + 16);

    y += 70;
    doc
      .fillColor(TEXT_COLOR)
      .fontSize(11)
      .text(
        `Thank you for your generous contribution to "${donation.campaign?.title || 'this campaign'}". ` +
          'Your support directly helps this NGO carry out its mission.',
        50,
        y,
        { width: 495 }
      );

    doc
      .fontSize(9)
      .fillColor(MUTED_COLOR)
      .text(
        'This is a system-generated receipt from FundFlow and does not require a signature.',
        50,
        doc.page.height - 70,
        { width: 495, align: 'center' }
      );

    doc.end();
  });
}

module.exports = { loadDonationForReceipt, buildReceiptNumber, donorDisplayName, formatCurrency, generateReceiptPdf };
