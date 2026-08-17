const nodemailer = require('nodemailer');

// In development we use Ethereal (https://ethereal.email) — a fake SMTP
// service that never actually delivers mail anywhere. Instead it gives us a
// "preview URL" we can open in a browser to see exactly what the email
// looked like. This means password-reset emails work fully on localhost
// with zero setup (no real Gmail/SMTP account needed).
//
// To switch to real email later (production), replace the transporter below
// with your real SMTP credentials (e.g. Gmail, SendGrid, Mailgun) and this
// function's return value will just have previewUrl = null.

let transporterPromise = null;

async function getTransporter() {
  if (transporterPromise) return transporterPromise;

  if (process.env.SMTP_HOST) {
    // Real SMTP configured via .env — use it.
    transporterPromise = Promise.resolve(
      nodemailer.createTransport({
        host: process.env.SMTP_HOST,
        port: Number(process.env.SMTP_PORT || 587),
        secure: process.env.SMTP_SECURE === 'true',
        auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS },
      })
    );
  } else {
    // No SMTP configured — fall back to Ethereal test account (dev only)
    transporterPromise = nodemailer.createTestAccount().then((testAccount) =>
      nodemailer.createTransport({
        host: 'smtp.ethereal.email',
        port: 587,
        secure: false,
        auth: { user: testAccount.user, pass: testAccount.pass },
      })
    );
  }
  return transporterPromise;
}

async function sendPasswordResetEmail(toEmail, resetLink) {
  const transporter = await getTransporter();

  const info = await transporter.sendMail({
    from: '"Motor Rental System" <no-reply@motorrental.local>',
    to: toEmail,
    subject: 'Reset Password - Motor Rental System',
    html: `
      <div style="font-family: sans-serif; max-width: 480px; margin: 0 auto;">
        <h2 style="color:#ff6b35;">Reset Password</h2>
        <p>Kami terima permintaan untuk reset password akaun anda.</p>
        <p><a href="${resetLink}" style="background:#ff6b35;color:white;padding:10px 20px;border-radius:8px;text-decoration:none;display:inline-block;">Reset Password</a></p>
        <p>Atau copy link ni ke browser:</p>
        <p style="word-break:break-all;color:#666;">${resetLink}</p>
        <p style="color:#999;font-size:0.85rem;">Link ni sah untuk 1 jam sahaja. Kalau anda tak minta reset password, abaikan email ni.</p>
      </div>
    `,
  });

  const previewUrl = nodemailer.getTestMessageUrl(info); // only works for Ethereal, null for real SMTP
  return { previewUrl };
}

module.exports = { sendPasswordResetEmail };
