const bcrypt = require('bcryptjs');
const User = require('../models/User');

const DEFAULT_NAMES = ['Tanzeela', 'Asad', 'Abdullah'];
const DEFAULT_PIN = '1234';

async function seedUsers() {
  try {
    for (const name of DEFAULT_NAMES) {
      const exists = await User.findOne({ name });
      if (!exists) {
        const hashedPin = await bcrypt.hash(DEFAULT_PIN, 10);
        await User.create({ name, pin: hashedPin });
        console.log(`✅ Seeded user: ${name} (default PIN: 1234)`);
      }
    }
  } catch (err) {
    console.error('User seed error:', err.message);
  }
}

module.exports = { seedUsers };
