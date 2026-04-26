const { format } = require('date-fns');

const formatPKR = (val) => {
  if (val === null || val === undefined || val === '') return '—';
  const num = Number(val);
  if (isNaN(num)) return String(val);
  return `₨ ${num.toLocaleString('en-PK')}`;
};

const formatDate = (d) => {
  if (!d) return '—';
  try { return format(new Date(d), 'EEE, dd MMM yyyy'); } catch { return String(d); }
};

const baseTemplate = ({ headerColor, headerLabel, icon, body, footerNote }) => `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>BizTrack Notification</title>
</head>
<body style="margin:0;padding:0;background:#0A0F1E;font-family:'Segoe UI',Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#0A0F1E;padding:24px 0;">
    <tr>
      <td align="center">
        <table width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;border-radius:16px;overflow:hidden;box-shadow:0 8px 32px rgba(0,0,0,0.6);">

          <!-- Header -->
          <tr>
            <td style="background:${headerColor};padding:28px 32px;">
              <table width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td>
                    <span style="font-size:28px;font-weight:800;color:#0A0F1E;letter-spacing:-0.5px;">
                      🏦 BizTrack
                    </span>
                    <br/>
                    <span style="font-size:13px;color:rgba(10,15,30,0.7);font-weight:500;">
                      Finance Update Notification
                    </span>
                  </td>
                  <td align="right" style="font-size:36px;">${icon}</td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Label Banner -->
          <tr>
            <td style="background:#111827;padding:12px 32px;border-bottom:1px solid #2A3547;">
              <span style="font-size:12px;font-weight:700;color:${headerColor};text-transform:uppercase;letter-spacing:1px;">
                ${headerLabel}
              </span>
            </td>
          </tr>

          <!-- Body -->
          <tr>
            <td style="background:#111827;padding:24px 32px;">
              ${body}
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="background:#0A0F1E;padding:20px 32px;text-align:center;border-top:1px solid #2A3547;">
              <p style="margin:0;font-size:12px;color:#475569;">
                BizTrack · Personal Finance Manager
              </p>
              <p style="margin:4px 0 0;font-size:11px;color:#334155;">
                ${footerNote || 'This is an automated notification. Do not reply to this email.'}
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>
`;

const metaRow = (label, value, color) => `
  <tr>
    <td style="padding:6px 0;">
      <span style="font-size:13px;color:#94A3B8;">${label}</span>
      <span style="font-size:13px;color:${color || '#F1F5F9'};font-weight:600;margin-left:8px;">${value}</span>
    </td>
  </tr>
`;

const changeRow = (field, oldVal, newVal) => `
  <tr>
    <td style="padding:10px 0;border-bottom:1px solid #1C2537;">
      <div style="font-size:12px;color:#94A3B8;margin-bottom:4px;">${field}</div>
      ${oldVal !== undefined && oldVal !== null ? `
        <div style="font-size:13px;color:#EF4444;text-decoration:line-through;margin-bottom:2px;">
          ${oldVal}
        </div>
      ` : ''}
      <div style="font-size:14px;color:#22C55E;font-weight:600;">${newVal}</div>
    </td>
  </tr>
`;

const buildMetaBlock = (user, time, business, action) => `
  <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:20px;">
    ${metaRow('👤 Action by:', user, '#F5A623')}
    ${metaRow('🕐 Time:', time)}
    ${metaRow('📋 Business:', business)}
    ${metaRow('⚡ Action:', action)}
  </table>
`;

// ── Templates ──────────────────────────────────────────────────

exports.createTemplate = ({ user, business, recordDate, fields }) => {
  const time = formatDate(new Date());
  const rows = Object.entries(fields)
    .filter(([, v]) => v !== undefined && v !== null && v !== '')
    .map(([k, v]) => changeRow(k, null, typeof v === 'number' ? formatPKR(v) : String(v)))
    .join('');

  const body = `
    ${buildMetaBlock(user, time, business, '✅ Record Created')}
    <div style="font-size:13px;font-weight:700;color:#F1F5F9;margin-bottom:12px;text-transform:uppercase;letter-spacing:0.5px;">
      Record Details
    </div>
    <table width="100%" cellpadding="0" cellspacing="0">
      ${changeRow('Date', null, formatDate(recordDate))}
      ${rows}
    </table>
  `;

  return baseTemplate({
    headerColor: '#22C55E',
    headerLabel: 'New Record Created',
    icon: '✅',
    body,
  });
};

exports.updateTemplate = ({ user, business, recordDate, changes }) => {
  const time = formatDate(new Date());
  const rows = changes
    .map(({ field, oldValue, newValue }) => {
      const fmt = (v) => (typeof v === 'number' ? formatPKR(v) : String(v ?? '—'));
      return changeRow(field, fmt(oldValue), fmt(newValue));
    })
    .join('');

  const body = `
    ${buildMetaBlock(user, time, business, '✏️ Record Updated')}
    <div style="font-size:13px;font-weight:700;color:#F1F5F9;margin-bottom:12px;text-transform:uppercase;letter-spacing:0.5px;">
      Changes Made
    </div>
    <table width="100%" cellpadding="0" cellspacing="0">
      ${changeRow('Date', null, formatDate(recordDate))}
      ${rows}
    </table>
  `;

  return baseTemplate({
    headerColor: '#F5A623',
    headerLabel: 'Record Updated',
    icon: '✏️',
    body,
  });
};

exports.deleteTemplate = ({ user, business, recordDate, fields }) => {
  const time = formatDate(new Date());
  const rows = Object.entries(fields)
    .filter(([, v]) => v !== undefined && v !== null)
    .map(([k, v]) => changeRow(k, typeof v === 'number' ? formatPKR(v) : String(v), '(deleted)'))
    .join('');

  const body = `
    ${buildMetaBlock(user, time, business, '🗑️ Record Deleted')}
    <div style="font-size:13px;font-weight:700;color:#EF4444;margin-bottom:12px;text-transform:uppercase;letter-spacing:0.5px;">
      Deleted Record
    </div>
    <table width="100%" cellpadding="0" cellspacing="0">
      ${changeRow('Date', null, formatDate(recordDate))}
      ${rows}
    </table>
  `;

  return baseTemplate({
    headerColor: '#EF4444',
    headerLabel: 'Record Deleted',
    icon: '🗑️',
    body,
  });
};

exports.loanStatusTemplate = ({ user, lenderName, amount, oldStatus, newStatus }) => {
  const time = formatDate(new Date());
  const body = `
    ${buildMetaBlock(user, time, '💳 Loans', '🔄 Loan Status Changed')}
    <table width="100%" cellpadding="0" cellspacing="0">
      ${changeRow('Lender', null, lenderName)}
      ${changeRow('Amount', null, formatPKR(amount))}
      ${changeRow('Status', oldStatus, newStatus)}
    </table>
  `;

  return baseTemplate({
    headerColor: '#A78BFA',
    headerLabel: 'Loan Status Changed',
    icon: '💳',
    body,
  });
};
