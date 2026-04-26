const express = require('express');
const router = express.Router();
const IndriveRecord = require('../models/IndriveRecord');
const EggsRecord = require('../models/EggsRecord');
const LoanRecord = require('../models/LoanRecord');
const { subDays, startOfMonth, endOfMonth, format } = require('date-fns');

// GET /api/dashboard/kpis
router.get('/kpis', async (req, res) => {
  try {
    const now = new Date();
    const monthStart = new Date(Date.UTC(now.getFullYear(), now.getMonth(), 1));
    const monthEnd = new Date(Date.UTC(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59));

    // Current month
    const [indriveRecords, eggsRecords, loans] = await Promise.all([
      IndriveRecord.find({ date: { $gte: monthStart, $lte: monthEnd } }),
      EggsRecord.find({ date: { $gte: monthStart, $lte: monthEnd } }),
      LoanRecord.find({ status: { $in: ['Outstanding', 'Partially Paid'] } }),
    ]);

    const indriveProfit      = indriveRecords.reduce((s, r) => s + (r.profit || 0), 0);
    const adnanRentCollected = indriveRecords.reduce((s, r) => s + (r.adnanRentCollected || 0), 0);
    const abdullahRent       = indriveRecords.reduce((s, r) => s + (r.totalRent || 0), 0);
    const totalRentCollected = abdullahRent + adnanRentCollected;
    const eggsProfit         = eggsRecords.reduce((s, r) => s + (r.profit || 0), 0);
    const outstandingLoans   = loans.reduce((s, l) => s + (l.amount || 0), 0);
    const fuelSpent          = indriveRecords.reduce((s, r) => s + (r.fuel || 0), 0);

    // Last month for comparison
    const lastMonthStart = new Date(Date.UTC(now.getFullYear(), now.getMonth() - 1, 1));
    const lastMonthEnd = new Date(Date.UTC(now.getFullYear(), now.getMonth(), 0, 23, 59, 59));
    const [lastIndrive, lastEggs] = await Promise.all([
      IndriveRecord.find({ date: { $gte: lastMonthStart, $lte: lastMonthEnd } }),
      EggsRecord.find({ date: { $gte: lastMonthStart, $lte: lastMonthEnd } }),
    ]);
    const lastIndriveProfit  = lastIndrive.reduce((s, r) => s + (r.profit || 0), 0);
    const lastEggsProfit     = lastEggs.reduce((s, r) => s + (r.profit || 0), 0);
    const lastAdnanRent      = lastIndrive.reduce((s, r) => s + (r.adnanRentCollected || 0), 0);
    const lastAbdullahRent   = lastIndrive.reduce((s, r) => s + (r.totalRent || 0), 0);
    const lastTotalRent      = lastAbdullahRent + lastAdnanRent;
    const lastFuelSpent      = lastIndrive.reduce((s, r) => s + (r.fuel || 0), 0);

    const pctChange = (curr, prev) => {
      if (!prev) return curr > 0 ? 100 : 0;
      return Math.round(((curr - prev) / Math.abs(prev)) * 100);
    };

    res.json({
      success: true,
      data: {
        indriveProfit,
        indriveProfit_change: pctChange(indriveProfit, lastIndriveProfit),
        eggsProfit,
        eggsProfit_change: pctChange(eggsProfit, lastEggsProfit),
        adnanRentCollected,
        adnanRentCollected_change: pctChange(adnanRentCollected, lastAdnanRent),
        totalRentCollected,
        totalRentCollected_change: pctChange(totalRentCollected, lastTotalRent),
        outstandingLoans,
        outstandingLoans_count: loans.length,
        fuelSpent,
        fuelSpent_change: pctChange(fuelSpent, lastFuelSpent),
      },
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// GET /api/dashboard/weekly — last 7 days data
router.get('/weekly', async (req, res) => {
  try {
    const now = new Date();
    const days = Array.from({ length: 7 }, (_, i) => {
      const d = new Date(now);
      d.setDate(d.getDate() - (6 - i));
      return new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
    });

    const start = days[0];
    const end = new Date(days[6]);
    end.setUTCHours(23, 59, 59);

    const [indriveRecs, eggsRecs] = await Promise.all([
      IndriveRecord.find({ date: { $gte: start, $lte: end } }),
      EggsRecord.find({ date: { $gte: start, $lte: end } }),
    ]);

    const toMap = (recs, key) => {
      const m = {};
      recs.forEach(r => { m[r.date.toISOString().split('T')[0]] = r[key] || 0; });
      return m;
    };

    const earnedMap = toMap(indriveRecs, 'earned');
    const profitMap = toMap(indriveRecs, 'profit');
    const cashAtHandMap = toMap(eggsRecs, 'cashAtHand');
    const easypaisaMap = toMap(eggsRecs, 'easypaisaBalance');

    const indriveData = days.map(d => {
      const key = d.toISOString().split('T')[0];
      return { date: key, earned: earnedMap[key] || 0, profit: profitMap[key] || 0 };
    });

    const eggsData = days.map(d => {
      const key = d.toISOString().split('T')[0];
      return { date: key, cashAtHand: cashAtHandMap[key] || 0, easypaisa: easypaisaMap[key] || 0 };
    });

    res.json({ success: true, data: { indrive: indriveData, eggs: eggsData } });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// GET /api/dashboard/monthly — current month daily data
router.get('/monthly', async (req, res) => {
  try {
    const now = new Date();
    const { month, year } = req.query;
    const m = parseInt(month) || now.getMonth() + 1;
    const y = parseInt(year) || now.getFullYear();
    const start = new Date(Date.UTC(y, m - 1, 1));
    const end = new Date(Date.UTC(y, m, 0, 23, 59, 59));

    const [indriveRecs, eggsRecs] = await Promise.all([
      IndriveRecord.find({ date: { $gte: start, $lte: end } }).sort({ date: 1 }),
      EggsRecord.find({ date: { $gte: start, $lte: end } }).sort({ date: 1 }),
    ]);

    const mergeByDate = () => {
      const allDates = new Set([
        ...indriveRecs.map(r => r.date.toISOString().split('T')[0]),
        ...eggsRecs.map(r => r.date.toISOString().split('T')[0]),
      ]);
      const iMap = {};
      indriveRecs.forEach(r => { iMap[r.date.toISOString().split('T')[0]] = r; });
      const eMap = {};
      eggsRecs.forEach(r => { eMap[r.date.toISOString().split('T')[0]] = r; });

      return [...allDates].sort().map(date => ({
        date,
        indriveProfit: iMap[date]?.profit || 0,
        eggsNet: eMap[date]?.profit || 0,
        total: (iMap[date]?.profit || 0) + (eMap[date]?.profit || 0),
      }));
    };

    res.json({ success: true, data: mergeByDate() });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

module.exports = router;
