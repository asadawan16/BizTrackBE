const mongoose = require('mongoose');

const LoanRecordSchema = new mongoose.Schema({
  dateTaken: { type: Date, required: true },
  amount: { type: Number, required: true, min: 0 },
  lenderName: { type: String, required: true, trim: true },
  purpose: { type: String, default: '', trim: true },
  dateRepaid: { type: Date },
  status: {
    type: String,
    enum: ['Outstanding', 'Partially Paid', 'Paid'],
    default: 'Outstanding',
  },
  notes: { type: String, default: '', trim: true },
  // Optional cross-reference when loan is auto-created from another module
  source: { type: String, enum: ['manual', 'eggs'], default: 'manual' },
  sourceId: { type: mongoose.Schema.Types.ObjectId },
  createdBy: { type: String, enum: ['Tanzeela', 'Asad', 'Abdullah'], required: true },
  updatedBy: { type: String, enum: ['Tanzeela', 'Asad', 'Abdullah'] },
}, { timestamps: true });

module.exports = mongoose.model('LoanRecord', LoanRecordSchema);
