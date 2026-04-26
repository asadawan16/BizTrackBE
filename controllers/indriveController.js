const IndriveRecord = require('../models/IndriveRecord');
const { getDaysInMonth } = require('date-fns');
const { toPKTMidnight } = require('../utils/dateUtils');

const MONTHLY_RENT = parseInt(process.env.MONTHLY_RENT) || 75000;

// GET /api/indrive — optionally filter by ?month=4&year=2025
exports.getAll = async (req, res) => {
  try {
    const { month, year } = req.query;
    let filter = {};
    if (month && year) {
      const start = new Date(Date.UTC(parseInt(year), parseInt(month) - 1, 1));
      const end = new Date(Date.UTC(parseInt(year), parseInt(month), 0, 23, 59, 59));
      filter.date = { $gte: start, $lte: end };
    }
    const records = await IndriveRecord.find(filter).sort({ date: -1 });
    // Compute running rent balance for the filtered set (sorted ascending)
    const sorted = [...records].sort((a, b) => a.date - b.date);
    let runningBalance = 0;
    const withBalance = sorted.map((rec) => {
      runningBalance += rec.abdullahRent || 0;
      const obj = rec.toObject();
      obj.rentBalance = runningBalance;
      return obj;
    });
    // Return in desc order
    res.json({ success: true, data: withBalance.reverse() });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// GET /api/indrive/today
exports.getToday = async (req, res) => {
  try {
    const today = toPKTMidnight(new Date());
    const record = await IndriveRecord.findOne({ date: today });
    res.json({ success: true, data: record });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// GET /api/indrive/summary?month=4&year=2025
exports.getSummary = async (req, res) => {
  try {
    const { month, year } = req.query;
    const m = parseInt(month) || new Date().getMonth() + 1;
    const y = parseInt(year) || new Date().getFullYear();
    const start = new Date(Date.UTC(y, m - 1, 1));
    const end = new Date(Date.UTC(y, m, 0, 23, 59, 59));

    const records = await IndriveRecord.find({ date: { $gte: start, $lte: end } });
    const totalEarned = records.reduce((s, r) => s + (r.earned || 0), 0);
    const totalFuel = records.reduce((s, r) => s + (r.fuel || 0), 0);
    const totalTopup = records.reduce((s, r) => s + (r.topup || 0), 0);
    const totalRent = records.reduce((s, r) => s + (r.abdullahRent || 0), 0);
    const totalAdnanRentCollected = records.reduce((s, r) => s + (r.adnanRentCollected || 0), 0);
    const totalProfit = records.reduce((s, r) => s + (r.profit || 0), 0);
    const rentTarget = MONTHLY_RENT;
    const rentRemaining = Math.max(0, rentTarget - totalRent);

    res.json({
      success: true,
      data: {
        totalEarned, totalFuel, totalTopup, totalRent, totalAdnanRentCollected,
        totalProfit, rentTarget, rentRemaining, recordCount: records.length,
      },
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// GET /api/indrive/:id
exports.getOne = async (req, res) => {
  try {
    const record = await IndriveRecord.findById(req.params.id);
    if (!record) return res.status(404).json({ success: false, message: 'Record not found' });
    res.json({ success: true, data: record });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// POST /api/indrive
exports.create = async (req, res) => {
  try {
    const { date, adnanRentCollected, abdullahRent, earned, fuel, topup, notes, createdBy } = req.body;
    const record = new IndriveRecord({ date, adnanRentCollected, abdullahRent, earned, fuel, topup, notes, createdBy });
    await record.save();
    res.status(201).json({ success: true, data: record });
  } catch (err) {
    if (err.code === 11000) {
      return res.status(400).json({ success: false, message: 'A record for this date already exists' });
    }
    res.status(400).json({ success: false, message: err.message });
  }
};

// PUT /api/indrive/:id
exports.update = async (req, res) => {
  try {
    const { adnanRentCollected, abdullahRent, earned, fuel, topup, notes, updatedBy } = req.body;
    const record = await IndriveRecord.findById(req.params.id);
    if (!record) return res.status(404).json({ success: false, message: 'Record not found' });

    if (adnanRentCollected !== undefined) record.adnanRentCollected = adnanRentCollected;
    if (abdullahRent !== undefined) record.abdullahRent = abdullahRent;
    if (earned !== undefined) record.earned = earned;
    if (fuel !== undefined) record.fuel = fuel;
    if (topup !== undefined) record.topup = topup;
    if (notes !== undefined) record.notes = notes;
    if (updatedBy) record.updatedBy = updatedBy;

    await record.save();
    res.json({ success: true, data: record });
  } catch (err) {
    res.status(400).json({ success: false, message: err.message });
  }
};

// DELETE /api/indrive/:id
exports.remove = async (req, res) => {
  try {
    const record = await IndriveRecord.findByIdAndDelete(req.params.id);
    if (!record) return res.status(404).json({ success: false, message: 'Record not found' });
    res.json({ success: true, data: record, message: 'Record deleted' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// Exported helper for audit middleware to fetch old doc
exports.fetchById = async (req) => IndriveRecord.findById(req.params.id);
