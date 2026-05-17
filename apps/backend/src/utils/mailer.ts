import nodemailer from 'nodemailer';

const SMTP_HOST = process.env.SMTP_HOST;
const SMTP_PORT = Number(process.env.SMTP_PORT || 0);
const SMTP_USER = process.env.SMTP_USER;
const SMTP_PASS = process.env.SMTP_PASS;
const SUPPORT_EMAIL = process.env.SUPPORT_EMAIL || 'manvitha3626@gmail.com';

if (!SMTP_HOST || !SMTP_PORT || !SMTP_USER || !SMTP_PASS) {
  // Fail fast in development if SMTP is misconfigured
  // In production, the app should log and avoid starting without proper env configuration.
  // We don't throw here to keep the server bootable for other non-email features,
  // but `sendSupportEmail` will throw if transporter is missing.
  console.warn('SMTP environment variables are not fully configured. Email sending will fail.');
}

let transporter: nodemailer.Transporter | null = null;

function createTransporter() {
  // In tests, use a JSON transport to avoid network sockets and open handles
  if (process.env.NODE_ENV === 'test') {
    return nodemailer.createTransport({ jsonTransport: true });
  }

  if (!SMTP_HOST || !SMTP_PORT || !SMTP_USER || !SMTP_PASS) {
    console.warn('SMTP environment variables are not fully configured. Email sending will fail.');
  }

  // Log which host/port are being used for debugging (do not log credentials)
  console.info(`mailer: creating transporter -> host=${SMTP_HOST ?? 'unset'} port=${SMTP_PORT ?? 'unset'} NODE_ENV=${process.env.NODE_ENV}`);

  return nodemailer.createTransport({
    host: SMTP_HOST,
    port: SMTP_PORT,
    secure: SMTP_PORT === 465, // true for 465, false for other ports
    auth: SMTP_USER && SMTP_PASS ? { user: SMTP_USER, pass: SMTP_PASS } : undefined,
  });
}

function escapeHtml(str: string) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

export async function sendSupportEmail(payload: {
  name: string;
  email: string;
  subject: string;
  description: string;
}) {
  if (!transporter) transporter = createTransporter();
  if (!transporter) throw new Error('Email transporter is not configured');

  const { name, email, subject, description } = payload;
  const timestamp = new Date().toISOString();

  const html = `
    <div style="font-family: Inter, system-ui, -apple-system, 'Segoe UI', Roboto, 'Helvetica Neue', Arial; color:#111">
      <h2 style="margin-bottom:8px">New Support Report</h2>
      <p style="color:#666;margin-top:0">A new issue was reported via the InDaZone admin Help Center.</p>
      <table cellpadding="0" cellspacing="0" style="width:100%;margin-top:16px;border-collapse:collapse">
        <tr><td style="padding:8px;border:1px solid #eee"><strong>Reporter</strong></td><td style="padding:8px;border:1px solid #eee">${escapeHtml(name)} &lt;${escapeHtml(email)}&gt;</td></tr>
        <tr><td style="padding:8px;border:1px solid #eee"><strong>Subject</strong></td><td style="padding:8px;border:1px solid #eee">${escapeHtml(subject)}</td></tr>
        <tr><td style="padding:8px;border:1px solid #eee;vertical-align:top"><strong>Description</strong></td><td style="padding:8px;border:1px solid #eee;white-space:pre-wrap">${escapeHtml(description)}</td></tr>
        <tr><td style="padding:8px;border:1px solid #eee"><strong>Timestamp</strong></td><td style="padding:8px;border:1px solid #eee">${timestamp}</td></tr>
      </table>
      <p style="color:#888;font-size:12px;margin-top:16px">This message was generated automatically by InDaZone.</p>
    </div>
  `;

  const fromAddress = SMTP_USER ? SMTP_USER : `no-reply@${SMTP_HOST}`;

  const info = await transporter.sendMail({
    from: `InDaZone Support <${fromAddress}>`,
    to: SUPPORT_EMAIL,
    subject: `Support Report: ${subject}`,
    html,
    replyTo: email,
  });

  return info;
}
