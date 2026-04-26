const mongoose = require('mongoose');

const AuditLogSchema = new mongoose.Schema({
  user: { type: String, enum: ['Tanzeela', 'Asad', 'Abdullah'], required: true },
  action: { type: String, enum: ['CREATE', 'UPDATE', 'DELETE'], required: true },
  business: { type: String, enum: ['Indrive', 'Eggs', 'Loans'], required: true },
  recordId: { type: mongoose.Schema.Types.ObjectId },
  recordDate: { type: Date },
  changes: [{
    field: { type: String },
    oldValue: { type: mongoose.Schema.Types.Mixed },
    newValue: { type: mongoose.Schema.Types.Mixed },
  }],
  summary: { type: String },
  timestamp: { type: Date, default: Date.now },
  ipAddress: { type: String },
});

AuditLogSchema.index({ timestamp: -1 });
AuditLogSchema.index({ user: 1 });
AuditLogSchema.index({ business: 1 });

module.exports = mongoose.model('AuditLog', AuditLogSchema);
