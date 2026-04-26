const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const userSchema = new mongoose.Schema({
  name: {
    type: String,
    enum: ['Tanzeela', 'Asad', 'Abdullah'],
    required: true,
    unique: true,
  },
  pin: {
    type: String, // bcrypt hash of 4-digit PIN
    required: true,
  },
  role: {
    type: String,
    default: 'admin',
  },
}, { timestamps: true });

userSchema.methods.comparePin = async function (pin) {
  return bcrypt.compare(String(pin), this.pin);
};

module.exports = mongoose.model('User', userSchema);
