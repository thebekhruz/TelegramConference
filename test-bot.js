#!/usr/bin/env node
/**
 * Test Bot Script
 * Checks bot configuration and database
 */

require('dotenv').config();
const Database = require('better-sqlite3');
const path = require('path');
const fs = require('fs');

console.log('🧪 Bot Configuration Test\n');
console.log('━'.repeat(50));

// Check environment variables
console.log('\n📋 Environment Variables:');
console.log(`  ✓ BOT_TOKEN: ${process.env.TELEGRAM_BOT_TOKEN ? '✅ Set' : '❌ NOT SET'}`);
console.log(`  ✓ ADMIN_USER_ID: ${process.env.ADMIN_USER_ID || '❌ NOT SET'}`);
console.log(`  ✓ FINANCE_ADMIN_USER_ID: ${process.env.FINANCE_ADMIN_USER_ID || '❌ NOT SET'}`);
console.log(`  ✓ PAYME_ACCOUNT_NUMBER: ${process.env.PAYME_ACCOUNT_NUMBER || '❌ NOT SET'}`);
console.log(`  ✓ CONFERENCE_PRICE: ${process.env.CONFERENCE_PRICE || '200000'} UZS`);

// Check database
console.log('\n📊 Database:');
const DB_PATH = process.env.DATABASE_PATH || './data/registrations.db';
console.log(`  Path: ${DB_PATH}`);

try {
  // Create database if doesn't exist
  const dir = path.dirname(DB_PATH);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
    console.log(`  ✓ Created directory: ${dir}`);
  }

  const db = new Database(DB_PATH);

  // Initialize table if needed
  db.exec(`
    CREATE TABLE IF NOT EXISTS registrations (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      username TEXT,
      first_name TEXT,
      last_name TEXT,
      phone_number TEXT,
      language_code TEXT,
      payment_method TEXT NOT NULL,
      transaction_id TEXT NOT NULL UNIQUE,
      provider_payment_charge_id TEXT,
      amount INTEGER NOT NULL,
      currency TEXT NOT NULL,
      payload TEXT,
      registration_date DATETIME DEFAULT CURRENT_TIMESTAMP,
      status TEXT DEFAULT 'completed',
      order_id TEXT UNIQUE,
      payme_transaction_id TEXT,
      payment_in_progress BOOLEAN DEFAULT 0,
      payment_completed BOOLEAN DEFAULT 1,
      payment_completed_at DATETIME,
      payment_cancelled BOOLEAN DEFAULT 0,
      cancel_reason INTEGER
    )
  `);

  const count = db.prepare('SELECT COUNT(*) as count FROM registrations').get();
  console.log(`  ✓ Database connected`);
  console.log(`  ✓ Total registrations: ${count.count}`);

  // Show recent registrations
  if (count.count > 0) {
    console.log('\n📋 Recent Registrations:');
    const recent = db.prepare('SELECT * FROM registrations ORDER BY id DESC LIMIT 5').all();
    recent.forEach(reg => {
      console.log(`  #${reg.id}: ${reg.first_name} ${reg.last_name || ''} - ${reg.phone_number || 'N/A'} - ${reg.payment_completed ? '✅ PAID' : '⏳ PENDING'}`);
    });
  }

  db.close();

} catch (error) {
  console.log(`  ❌ Error: ${error.message}`);
}

// Check bot.js file
console.log('\n📄 Bot File:');
const botPath = './src/bot.js';
if (fs.existsSync(botPath)) {
  const stats = fs.statSync(botPath);
  console.log(`  ✓ File exists: ${botPath}`);
  console.log(`  ✓ Size: ${(stats.size / 1024).toFixed(2)} KB`);
  console.log(`  ✓ Last modified: ${stats.mtime.toLocaleString()}`);
} else {
  console.log(`  ❌ Bot file not found: ${botPath}`);
}

console.log('\n━'.repeat(50));
console.log('\n✅ Test complete!\n');

// Recommendations
console.log('💡 Recommendations:');
if (!process.env.TELEGRAM_BOT_TOKEN) {
  console.log('  ⚠️  Set TELEGRAM_BOT_TOKEN in .env file');
}
if (!process.env.ADMIN_USER_ID) {
  console.log('  ⚠️  Set ADMIN_USER_ID in .env file (get from @userinfobot)');
}
if (!process.env.FINANCE_ADMIN_USER_ID) {
  console.log('  ⚠️  Set FINANCE_ADMIN_USER_ID in .env file');
}

console.log('\n📚 Next steps:');
console.log('  1. Make sure .env file is configured');
console.log('  2. Run: npm start');
console.log('  3. Test registration in Telegram');
console.log('  4. If stuck, check bot logs for errors');
console.log('');
