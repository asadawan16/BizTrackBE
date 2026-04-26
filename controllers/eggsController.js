const EggsRecord = require('../models/EggsRecord');
const LoanRecord = require('../models/LoanRecord');
const { toPKTMidnight } = require('../utils/dateUtils');

// Helper — sync loan record when eggs loan changes
async function syncLoanRecord({ loan, eggsId, date, createdBy }) {
  if (!loan?.taken) return null;
  const loanData = {
    dateTaken: date,
    amount: loan.amount || 0,
    lenderName: loan.personName || 'Unknown',
    purpose: 'Stock purchase — Eggs Supply',
    notes: `Type: ${loan.type || 'N/A'}. Included in total: ${loan.includedInTotal ? 'Yes' : 'No'}.`,
    source: 'eggs',
    sourceId: eggsId,
    status: 'Outstanding',
    createdBy,
  };

  if (loan.loanRecordId) {
    // Update existing
    const existing = await LoanRecord.findById(loan.loanRecordId);
    if (existing) {
      Object.assign(existing, { amount: loanData.amount, lenderName: loanData.lenderName, notes: loanData.notes });
      await existing.save();
      return existing._id;
    }
  }
  // Create new
  const record = new LoanRecord(loanData);
  await record.save();
  return record._id;
}

// GET /api/eggs
exports.getAll = async (req, res) => {
  try {
    const { month, year } = req.query;
    let filter = {};
    if (month && year) {
      const start = new Date(Date.UTC(parseInt(year), parseInt(month) - 1, 1));
      const end = new Date(Date.UTC(parseInt(year), parseInt(month), 0, 23, 59, 59));
      filter.date = { $gte: start, $lte: end };
    }
    const records = await EggsRecord.find(filter).sort({ date: -1 });
    res.json({ success: true, data: records });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// GET /api/eggs/today
exports.getToday = async (req, res) => {
  try {
    const today = toPKTMidnight(new Date());
    const record = await EggsRecord.findOne({ date: today });
    res.json({ success: true, data: record });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// GET /api/eggs/profit-split?month=4&year=2025
exports.getProfitSplit = async (req, res) => {
  try {
    const { month, year } = req.query;
    const m = parseInt(month) || new Date().getMonth() + 1;
    const y = parseInt(year) || new Date().getFullYear();
    const start = new Date(Date.UTC(y, m - 1, 1));
    const end = new Date(Date.UTC(y, m, 0, 23, 59, 59));

    const records = await EggsRecord.find({ date: { $gte: start, $lte: end } }).sort({ date: 1 });
    const totalProfit = records.reduce((s, r) => s + (r.profit || 0), 0);
    const netProfit = totalProfit;
    const abdullahShare = Math.round(netProfit / 2);
    const imranShare = netProfit - abdullahShare;

    res.json({
      success: true,
      data: { period: { month: m, year: y }, totalProfit, netProfit, abdullahShare, imranShare, records: records.length },
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// GET /api/eggs/:id
exports.getOne = async (req, res) => {
  try {
    const record = await EggsRecord.findById(req.params.id);
    if (!record) return res.status(404).json({ success: false, message: 'Record not found' });
    res.json({ success: true, data: record });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// POST /api/eggs
exports.create = async (req, res) => {
  try {
    const { date, profit, cashAtHand, easypaisaBalance, loan, notes, createdBy } = req.body;

    const record = new EggsRecord({
      date, profit: profit || 0, cashAtHand, easypaisaBalance,
      loan: loan || {}, notes, createdBy,
    });
    await record.save();

    // Auto-create linked loan record if loan was taken
    if (loan?.taken && loan?.amount > 0) {
      const loanRecordId = await syncLoanRecord({ loan, eggsId: record._id, date: record.date, createdBy });
      if (loanRecordId) {
        await EggsRecord.updateOne({ _id: record._id }, { 'loan.loanRecordId': loanRecordId });
        record.loan.loanRecordId = loanRecordId;
      }
    }

    res.status(201).json({ success: true, data: record });
  } catch (err) {
    if (err.code === 11000) {
      return res.status(400).json({ success: false, message: 'A record for this date already exists' });
    }
    res.status(400).json({ success: false, message: err.message });
  }
};

// GET /api/eggs/previous-closing — get previous day's totalForStock (for form reference)
exports.getPreviousClosing = async (req, res) => {
  try {
    const { date } = req.query;
    const d = toPKTMidnight(date || new Date());
    const prevDay = new Date(d);
    prevDay.setUTCDate(prevDay.getUTCDate() - 1);
    const prev = await EggsRecord.findOne({ date: prevDay });
    res.json({ success: true, data: { totalForStock: prev?.totalForStock || 0, hasRecord: !!prev } });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// PUT /api/eggs/:id
exports.update = async (req, res) => {
  try {
    const { profit, cashAtHand, easypaisaBalance, loan, notes, updatedBy } = req.body;
    const record = await EggsRecord.findById(req.params.id);
    if (!record) return res.status(404).json({ success: false, message: 'Record not found' });

    const prevLoanTaken = record.loan?.taken;
    const prevLoanRecordId = record.loan?.loanRecordId;

    if (profit !== undefined) record.profit = profit;
    if (cashAtHand !== undefined) record.cashAtHand = cashAtHand;
    if (easypaisaBalance !== undefined) record.easypaisaBalance = easypaisaBalance;
    if (loan !== undefined) record.loan = { ...record.loan.toObject?.() || {}, ...loan };
    if (notes !== undefined) record.notes = notes;
    if (updatedBy) record.updatedBy = updatedBy;

    await record.save();

    // Sync loan record
    if (loan !== undefined) {
      const nowLoanTaken = record.loan?.taken;
      if (nowLoanTaken && record.loan?.amount > 0) {
        // Create or update
        const loanRecordId = await syncLoanRecord({
          loan: record.loan,
          eggsId: record._id,
          date: record.date,
          createdBy: record.createdBy,
        });
        if (loanRecordId && String(loanRecordId) !== String(prevLoanRecordId)) {
          await EggsRecord.updateOne({ _id: record._id }, { 'loan.loanRecordId': loanRecordId });
          record.loan.loanRecordId = loanRecordId;
        }
      } else if (!nowLoanTaken && prevLoanTaken && prevLoanRecordId) {
        // Loan was removed — delete the linked record
        await LoanRecord.findByIdAndDelete(prevLoanRecordId);
        await EggsRecord.updateOne({ _id: record._id }, { 'loan.loanRecordId': null });
        record.loan.loanRecordId = null;
      }
    }

    res.json({ success: true, data: record });
  } catch (err) {
    res.status(400).json({ success: false, message: err.message });
  }
};

// DELETE /api/eggs/:id
exports.remove = async (req, res) => {
  try {
    const record = await EggsRecord.findByIdAndDelete(req.params.id);
    if (!record) return res.status(404).json({ success: false, message: 'Record not found' });
    // Clean up linked loan if any
    if (record.loan?.loanRecordId) {
      await LoanRecord.findByIdAndDelete(record.loan.loanRecordId);
    }
    res.json({ success: true, data: record, message: 'Record deleted' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

exports.fetchById = async (req) => EggsRecord.findById(req.params.id);
