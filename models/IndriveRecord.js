const mongoose = require('mongoose');
const { toPKTMidnight } = require('../utils/dateUtils');

const IndriveRecordSchema = new mongoose.Schema({
  date: { type: Date, required: true, unique: true },
  adnanRentCollected: { type: Number, default: 0, min: 0 }, // record only — not deducted from profit
  abdullahRent: { type: Number, default: 0, min: 0 },
  totalRent: { type: Number, default: 0 },                  // = abdullahRent (for ₨75k target tracking)
  earned: { type: Number, default: 0, min: 0 },
  fuel: { type: Number, default: 0, min: 0 },
  topup: { type: Number, default: 0, min: 0 },
  profit: { type: Number, default: 0 },                     // = earned - fuel - topup - abdullahRent
  rentBalance: { type: Number, default: 0 },
  notes: { type: String, default: '' },
  createdBy: { type: String, enum: ['Tanzeela', 'Asad', 'Abdullah'], required: true },
  updatedBy: { type: String, enum: ['Tanzeela', 'Asad', 'Abdullah'] },
}, { timestamps: true });

// Auto-calculate derived fields before save
IndriveRecordSchema.pre('save', function (next) {
  this.totalRent = this.abdullahRent || 0;
  this.profit = (this.earned || 0) - (this.fuel || 0) - (this.topup || 0) - this.totalRent;
  next();
});

// Normalize date to PKT midnight (stored as UTC)
IndriveRecordSchema.pre('save', function (next) {
  if (this.date) this.date = toPKTMidnight(this.date);
  next();
});

module.exports = mongoose.model('IndriveRecord', IndriveRecordSchema);
