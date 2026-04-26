const mongoose = require('mongoose');
const { toPKTMidnight } = require('../utils/dateUtils');

const EggsRecordSchema = new mongoose.Schema({
  date: { type: Date, required: true, unique: true },
  profit: { type: Number, default: 0 },           // manually entered daily profit

  // Stock availability tracking
  cashAtHand: { type: Number, default: 0, min: 0 },       // physical cash to buy stock
  easypaisaBalance: { type: Number, default: 0, min: 0 }, // digital wallet balance
  totalForStock: { type: Number, default: 0 },             // cashAtHand + easypaisaBalance (computed)

  // Loan tracking for stock purchase
  loan: {
    taken: { type: Boolean, default: false },
    personName: { type: String, default: '' },
    amount: { type: Number, default: 0, min: 0 },
    type: { type: String, enum: ['cash', 'bank', ''], default: '' },
    includedInTotal: { type: Boolean, default: false }, // true = loan already counted in cashAtHand/easypaisa
    loanRecordId: { type: mongoose.Schema.Types.ObjectId, ref: 'LoanRecord' },
  },

  // Net total: if loan is separate, adds loan.amount on top
  netTotalForStock: { type: Number, default: 0 },

  notes: { type: String, default: '' },
  createdBy: { type: String, enum: ['Tanzeela', 'Asad', 'Abdullah'], required: true },
  updatedBy: { type: String, enum: ['Tanzeela', 'Asad', 'Abdullah'] },
}, { timestamps: true });

// Auto-calculate derived fields before save
EggsRecordSchema.pre('save', function (next) {
  this.totalForStock = (this.cashAtHand || 0) + (this.easypaisaBalance || 0);
  if (this.loan?.taken && !this.loan?.includedInTotal) {
    this.netTotalForStock = this.totalForStock + (this.loan?.amount || 0);
  } else {
    this.netTotalForStock = this.totalForStock;
  }
  next();
});

// Normalize date to PKT midnight (stored as UTC)
EggsRecordSchema.pre('save', function (next) {
  if (this.date) this.date = toPKTMidnight(this.date);
  next();
});

module.exports = mongoose.model('EggsRecord', EggsRecordSchema);
