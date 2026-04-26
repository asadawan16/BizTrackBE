const nodemailer = require('nodemailer');
const templates = require('../utils/emailTemplates');

const createTransporter = () => {
  if (!process.env.GMAIL_USER || !process.env.GMAIL_APP_PASSWORD) {
    return null;
  }
  return nodemailer.createTransport({
    service: 'gmail',
    auth: {
      user: process.env.GMAIL_USER,
      pass: process.env.GMAIL_APP_PASSWORD,
    },
  });
};

const sendEmail = async ({ subject, html }) => {
  const transporter = createTransporter();
  if (!transporter) {
    console.log('📧 Email not configured — skipping notification');
    return;
  }
  try {
    await transporter.sendMail({
      from: `"BizTrack" <${process.env.GMAIL_USER}>`,
      to: process.env.NOTIFY_EMAIL,
      subject,
      html,
    });
    console.log(`📧 Email sent: ${subject}`);
  } catch (err) {
    console.error('📧 Email send failed:', err.message);
  }
};

exports.notifyCreate = ({ user, business, recordDate, fields }) => {
  const html = templates.createTemplate({ user, business, recordDate, fields });
  setImmediate(() => sendEmail({
    subject: `[BizTrack] New ${business} record added by ${user}`,
    html,
  }));
};

exports.notifyUpdate = ({ user, business, recordDate, changes }) => {
  if (!changes || changes.length === 0) return;
  const html = templates.updateTemplate({ user, business, recordDate, changes });
  setImmediate(() => sendEmail({
    subject: `[BizTrack] ${business} record updated by ${user}`,
    html,
  }));
};

exports.notifyDelete = ({ user, business, recordDate, fields }) => {
  const html = templates.deleteTemplate({ user, business, recordDate, fields });
  setImmediate(() => sendEmail({
    subject: `[BizTrack] ${business} record deleted by ${user}`,
    html,
  }));
};

exports.notifyLoanStatus = ({ user, lenderName, amount, oldStatus, newStatus }) => {
  const html = templates.loanStatusTemplate({ user, lenderName, amount, oldStatus, newStatus });
  setImmediate(() => sendEmail({
    subject: `[BizTrack] Loan status changed to ${newStatus} by ${user}`,
    html,
  }));
};
