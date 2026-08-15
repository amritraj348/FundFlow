const nodemailer = require('nodemailer');

const config = require('../config/env');

let transporterPromise = null;
let usingEthereal = false;

// Lazily creates (and caches) a transporter. If real SMTP_* vars are set we
// use those; otherwise we spin up a free, disposable Ethereal test inbox on
// the fly (nodemailer.createTestAccount()) — nothing to sign up for, no
// credentials to configure, and every send gets a shareable preview URL.
// This only ever runs against Ethereal's fake mail network — no real inboxes
// are reachable this way, which is exactly what we want before real SMTP
// creds exist.
function getTransporter() {
  if (transporterPromise) return transporterPromise;

  transporterPromise = (async () => {
    if (config.smtp.host && config.smtp.user) {
      return nodemailer.createTransport({
        host: config.smtp.host,
        port: config.smtp.port,
        secure: config.smtp.port === 465,
        auth: { user: config.smtp.user, pass: config.smtp.pass },
      });
    }

    const testAccount = await nodemailer.createTestAccount();
    usingEthereal = true;
    console.log(
      `[email] No SMTP_HOST configured — using a disposable Ethereal test inbox (${testAccount.user}). ` +
        'Emails are not delivered to real addresses; each send logs a preview URL instead.'
    );
    return nodemailer.createTransport({
      host: 'smtp.ethereal.email',
      port: 587,
      secure: false,
      auth: { user: testAccount.user, pass: testAccount.pass },
    });
  })();

  return transporterPromise;
}

async function sendMail(options) {
  const transporter = await getTransporter();
  const info = await transporter.sendMail({ from: config.smtp.from, ...options });

  if (usingEthereal) {
    console.log(`[email] Preview URL: ${nodemailer.getTestMessageUrl(info)}`);
  }

  return info;
}

module.exports = { sendMail };
