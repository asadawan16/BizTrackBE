const LoanRecord = require('../models/LoanRecord');

// GET /api/loans
exports.getAll = async (req, res) => {
  try {
    const { status, page = '1', limit = '20' } = req.query;
    const filter = status ? { status } : {};
    const pageNum = Math.max(1, parseInt(page) || 1);
    const limitNum = Math.min(100, Math.max(1, parseInt(limit) || 20));
    const skip = (pageNum - 1) * limitNum;

    const [loans, total] = await Promise.all([
      LoanRecord.find(filter).sort({ dateTaken: -1 }).skip(skip).limit(limitNum),
      LoanRecord.countDocuments(filter),
    ]);

    res.json({
      success: true,
      data: loans,
      pagination: {
        page: pageNum,
        limit: limitNum,
        total,
        totalPages: Math.ceil(total / limitNum),
      },
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// GET /api/loans/summary
exports.getSummary = async (req, res) => {
  try {
    const loans = await LoanRecord.find();
    const totalBorrowed = loans.reduce((s, l) => s + (l.amount || 0), 0);
    const outstanding = loans.filter(l => l.status === 'Outstanding');
    const partiallyPaid = loans.filter(l => l.status === 'Partially Paid');
    const paid = loans.filter(l => l.status === 'Paid');
    const totalOutstanding = outstanding.reduce((s, l) => s + (l.amount || 0), 0);
    const totalPartial = partiallyPaid.reduce((s, l) => s + (l.amount || 0), 0);
    const totalPaid = paid.reduce((s, l) => s + (l.amount || 0), 0);
    const activeLoansCount = outstanding.length + partiallyPaid.length;

    res.json({
      success: true,
      data: {
        totalBorrowed,
        totalOutstanding,
        totalPartial,
        totalPaid,
        activeLoansCount,
        paidCount: paid.length,
      },
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// GET /api/loans/:id
exports.getOne = async (req, res) => {
  try {
    const loan = await LoanRecord.findById(req.params.id);
    if (!loan) return res.status(404).json({ success: false, message: 'Loan not found' });
    res.json({ success: true, data: loan });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// POST /api/loans
exports.create = async (req, res) => {
  try {
    const loan = new LoanRecord(req.body);
    await loan.save();
    res.status(201).json({ success: true, data: loan });
  } catch (err) {
    res.status(400).json({ success: false, message: err.message });
  }
};

// PUT /api/loans/:id
exports.update = async (req, res) => {
  try {
    const loan = await LoanRecord.findById(req.params.id);
    if (!loan) return res.status(404).json({ success: false, message: 'Loan not found' });

    const fields = ['dateTaken', 'amount', 'lenderName', 'purpose', 'dateRepaid', 'status', 'notes', 'updatedBy'];
    fields.forEach(f => { if (req.body[f] !== undefined) loan[f] = req.body[f]; });

    await loan.save();
    res.json({ success: true, data: loan });
  } catch (err) {
    res.status(400).json({ success: false, message: err.message });
  }
};

// DELETE /api/loans/:id
exports.remove = async (req, res) => {
  try {
    const loan = await LoanRecord.findByIdAndDelete(req.params.id);
    if (!loan) return res.status(404).json({ success: false, message: 'Loan not found' });
    res.json({ success: true, data: loan, message: 'Loan deleted' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

exports.fetchById = async (req) => LoanRecord.findById(req.params.id);
