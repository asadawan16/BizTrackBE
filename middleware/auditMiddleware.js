const AuditLog = require('../models/AuditLog');
const emailService = require('../services/emailService');

const BUSINESS_MAP = {
  '/api/indrive': 'Indrive',
  '/api/eggs': 'Eggs',
  '/api/loans': 'Loans',
};

const getBusiness = (path) => {
  for (const prefix of Object.keys(BUSINESS_MAP)) {
    if (path.startsWith(prefix)) return BUSINESS_MAP[prefix];
  }
  return 'Unknown';
};

const diffObjects = (oldObj, newObj) => {
  if (!oldObj || !newObj) return [];
  const ignoredFields = ['_id', '__v', 'createdAt', 'updatedAt', 'createdBy', 'updatedBy'];
  const changes = [];
  for (const key of Object.keys(newObj)) {
    if (ignoredFields.includes(key)) continue;
    const oldVal = oldObj[key];
    const newVal = newObj[key];
    const oldStr = JSON.stringify(oldVal);
    const newStr = JSON.stringify(newVal);
    if (oldStr !== newStr) {
      changes.push({ field: key, oldValue: oldVal, newValue: newVal });
    }
  }
  return changes;
};

const auditMiddleware = (getOldDoc) => async (req, res, next) => {
  const method = req.method.toUpperCase();
  if (!['POST', 'PUT', 'DELETE'].includes(method)) return next();

  const user = req.user?.name || req.headers['x-user'] || req.body?.createdBy || req.body?.updatedBy || 'Unknown';
  const business = getBusiness(req.path);
  const ipAddress = req.ip || req.connection?.remoteAddress;

  let oldDoc = null;
  if (['PUT', 'DELETE'].includes(method) && getOldDoc) {
    try {
      oldDoc = await getOldDoc(req);
    } catch (e) {
      // If we can't fetch old doc, continue without it
    }
  }

  // Capture original res.json to intercept response
  const originalJson = res.json.bind(res);
  res.json = function (data) {
    originalJson(data);

    if (!data?.success) return;

    const newDoc = data?.data;
    let action, changes, recordDate, summary;

    if (method === 'POST') {
      action = 'CREATE';
      recordDate = newDoc?.date || newDoc?.dateTaken;
      const dateStr = recordDate ? new Date(recordDate).toLocaleDateString('en-PK') : '';
      summary = `Created ${business} record${dateStr ? ` for ${dateStr}` : ''}`;

      emailService.notifyCreate({
        user,
        business,
        recordDate,
        fields: newDoc || {},
      });

    } else if (method === 'PUT') {
      action = 'UPDATE';
      recordDate = newDoc?.date || newDoc?.dateTaken || oldDoc?.date || oldDoc?.dateTaken;
      changes = diffObjects(
        oldDoc?.toObject ? oldDoc.toObject() : oldDoc,
        newDoc?.toObject ? newDoc.toObject() : newDoc
      );
      const dateStr = recordDate ? new Date(recordDate).toLocaleDateString('en-PK') : '';
      summary = `Updated ${business} record${dateStr ? ` for ${dateStr}` : ''}`;

      if (changes.length > 0) {
        emailService.notifyUpdate({ user, business, recordDate, changes });

        // Check for loan status change
        if (business === 'Loans') {
          const statusChange = changes.find(c => c.field === 'status');
          if (statusChange) {
            emailService.notifyLoanStatus({
              user,
              lenderName: newDoc?.lenderName || oldDoc?.lenderName,
              amount: newDoc?.amount || oldDoc?.amount,
              oldStatus: statusChange.oldValue,
              newStatus: statusChange.newValue,
            });
          }
        }
      }

    } else if (method === 'DELETE') {
      action = 'DELETE';
      recordDate = oldDoc?.date || oldDoc?.dateTaken;
      const dateStr = recordDate ? new Date(recordDate).toLocaleDateString('en-PK') : '';
      summary = `Deleted ${business} record${dateStr ? ` for ${dateStr}` : ''}`;

      emailService.notifyDelete({
        user,
        business,
        recordDate,
        fields: oldDoc?.toObject ? oldDoc.toObject() : (oldDoc || {}),
      });
    }

    if (!action) return;

    AuditLog.create({
      user,
      action,
      business,
      recordId: newDoc?._id || oldDoc?._id,
      recordDate,
      changes: changes || [],
      summary,
      ipAddress,
    }).catch((err) => console.error('Audit log save error:', err));
  };

  next();
};

module.exports = auditMiddleware;
