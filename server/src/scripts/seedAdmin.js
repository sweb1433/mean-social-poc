// One-off script to create the first admin account, since signup always
// creates a plain 'user' and every other admin action requires an admin.
// Usage: npm run seed:admin
require('dotenv').config();
const connectDB = require('../config/db');
const User = require('../models/User');

async function run() {
  await connectDB();

  const email = process.env.ADMIN_EMAIL;
  const password = process.env.ADMIN_PASSWORD;
  const name = process.env.ADMIN_NAME || 'Admin';

  if (!email || !password) {
    throw new Error('Set ADMIN_EMAIL and ADMIN_PASSWORD in .env before running this script');
  }

  const existing = await User.findOne({ email });
  if (existing) {
    console.log(`User ${email} already exists (role: ${existing.role}). Nothing to do.`);
  } else {
    await User.create({ name, email, password, role: 'admin' });
    console.log(`Admin account created: ${email}`);
  }

  process.exit(0);
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
