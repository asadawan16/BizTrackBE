const express = require('express');
const jwt = require('jsonwebtoken');
const User = require('../models/User');

const router = express.Router();
const JWT_SECRET = process.env.JWT_SECRET || 'biztrack_secret_key_2024';

// POST /api/auth/login  { name, pin }
router.post('/login', async (req, res) => {
  const { name, pin } = req.body;

  if (!name || !pin) {
    return res.status(400).json({ success: false, message: 'Name and PIN are required' });
  }

  try {
    const user = await User.findOne({ name });
    if (!user) {
      return res.status(401).json({ success: false, message: 'Incorrect PIN' });
    }

    const isMatch = await user.comparePin(String(pin));
    if (!isMatch) {
      return res.status(401).json({ success: false, message: 'Incorrect PIN' });
    }

    const token = jwt.sign(
      { id: user._id, name: user.name, role: user.role },
      JWT_SECRET,
      { expiresIn: '5d' }
    );

    res.json({
      success: true,
      data: { token, user: { name: user.name, role: user.role } },
    });
  } catch (err) {
    console.error('Auth login error:', err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

module.exports = router;
