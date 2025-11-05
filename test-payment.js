#!/usr/bin/env node

/**
 * Payment Configuration Test
 * Run this to check if your payment settings are correct
 * Usage: node test-payment.js
 */

require('dotenv').config();

console.log('\n' + '='.repeat(60));
console.log('PAYMENT CONFIGURATION TEST');
console.log('='.repeat(60) + '\n');

let issuesFound = 0;

// Check environment variables
console.log('📋 ENVIRONMENT VARIABLES CHECK:\n');

// 1. Bot Token
if (process.env.TELEGRAM_BOT_TOKEN) {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  if (token.includes('your_') || token.includes('example')) {
    console.log('❌ Bot Token: Using placeholder');
    issuesFound++;
  } else {
    console.log('✅ Bot Token: Set correctly');
  }
} else {
  console.log('❌ Bot Token: NOT SET');
  issuesFound++;
}

// 2. PayMe Token
if (process.env.PAYME_PROVIDER_TOKEN) {
  const token = process.env.PAYME_PROVIDER_TOKEN;
  if (token.includes('your_') || token.includes('example') || token.trim() === '') {
    console.log('❌ PayMe Token: Using placeholder or empty');
    console.log('   Action: Get real token from @BotFather');
    issuesFound++;
  } else if (token.includes(':TEST:')) {
    console.log('✅ PayMe Token: Set (TEST MODE)');
    console.log('   Note: This is for testing only');
  } else if (token.includes(':LIVE:')) {
    console.log('✅ PayMe Token: Set (LIVE MODE)');
    console.log('   Note: Production mode');
  } else {
    console.log('⚠️  PayMe Token: Set but format unusual');
    console.log('   Token preview: ' + token.substring(0, 20) + '...');
    console.log('   Note: Verify this is correct');
  }
} else {
  console.log('❌ PayMe Token: NOT SET');
  console.log('   Action: Add PAYME_PROVIDER_TOKEN to .env');
  issuesFound++;
}

// 3. Conference Price
const priceEnv = process.env.CONFERENCE_PRICE;
if (priceEnv) {
  const price = parseInt(priceEnv);
  if (isNaN(price)) {
    console.log('❌ Conference Price: Invalid (not a number)');
    console.log('   Current value: ' + priceEnv);
    console.log('   Should be: 200000 (no commas!)');
    issuesFound++;
  } else {
    console.log('✅ Conference Price: ' + price.toLocaleString() + ' UZS');
  }
} else {
  console.log('⚠️  Conference Price: Using default (200,000 UZS)');
}

// 4. Currency
if (process.env.CURRENCY) {
  const currency = process.env.CURRENCY;
  if (currency === 'UZS') {
    console.log('✅ Currency: UZS (correct)');
  } else {
    console.log('❌ Currency: ' + currency + ' (should be UZS)');
    issuesFound++;
  }
} else {
  console.log('⚠️  Currency: Using default (UZS)');
}

// 5. Admin User ID
if (process.env.ADMIN_USER_ID) {
  const adminId = process.env.ADMIN_USER_ID;
  if (adminId.includes('your_') || adminId.includes('example')) {
    console.log('⚠️  Admin User ID: Using placeholder (optional feature)');
  } else {
    console.log('✅ Admin User ID: Set (' + adminId + ')');
  }
} else {
  console.log('⚠️  Admin User ID: Not set (optional)');
  console.log('   Note: You won\'t receive admin notifications');
}

// Payment calculation
console.log('\n' + '='.repeat(60));
console.log('💰 PAYMENT AMOUNT CALCULATION:\n');

const price = parseInt(process.env.CONFERENCE_PRICE) || 200000;
const amountInTyiyn = price * 100;

console.log('Price in UZS: ' + price.toLocaleString());
console.log('Amount in tyiyn (smallest unit): ' + amountInTyiyn.toLocaleString());

if (amountInTyiyn === 20000000) {
  console.log('✅ Calculation correct for default price');
} else {
  console.log('⚠️  Using custom price: ' + price.toLocaleString() + ' UZS');
  console.log('   Will charge: ' + amountInTyiyn.toLocaleString() + ' tyiyn');
}

// Database check
console.log('\n' + '='.repeat(60));
console.log('💾 DATABASE CHECK:\n');

const dbPath = process.env.DATABASE_PATH || './data/registrations.db';
const fs = require('fs');
const path = require('path');

const dbDir = path.dirname(dbPath);
if (fs.existsSync(dbPath)) {
  console.log('✅ Database file exists: ' + dbPath);
} else {
  if (fs.existsSync(dbDir)) {
    console.log('⚠️  Database will be created on first run: ' + dbPath);
  } else {
    console.log('⚠️  Database directory doesn\'t exist yet: ' + dbDir);
    console.log('   Will be created automatically');
  }
}

// Provider token detailed check
if (process.env.PAYME_PROVIDER_TOKEN) {
  console.log('\n' + '='.repeat(60));
  console.log('🔑 PROVIDER TOKEN ANALYSIS:\n');

  const token = process.env.PAYME_PROVIDER_TOKEN;

  console.log('Token length: ' + token.length + ' characters');

  if (token.length < 20) {
    console.log('❌ Token seems too short (should be ~50+ chars)');
    issuesFound++;
  } else {
    console.log('✅ Token length looks reasonable');
  }

  if (token.startsWith('284685063:')) {
    console.log('✅ Token starts with correct format');
  } else {
    console.log('⚠️  Token doesn\'t start with expected format');
    console.log('   Expected: 284685063:TEST: or 284685063:LIVE:');
    console.log('   Got: ' + token.substring(0, 15) + '...');
  }

  // Check for common mistakes
  if (token.includes(' ')) {
    console.log('❌ Token contains spaces (remove them)');
    issuesFound++;
  }
  if (token.includes('\n') || token.includes('\r')) {
    console.log('❌ Token contains newlines (remove them)');
    issuesFound++;
  }
}

// Summary
console.log('\n' + '='.repeat(60));
console.log('📊 SUMMARY:\n');

if (issuesFound === 0) {
  console.log('✅ All checks passed! Configuration looks good.');
  console.log('\nNext steps:');
  console.log('1. Start the bot: npm start');
  console.log('2. Test payment: /start → /register → Pay with PayMe');
  console.log('3. Use test card: 8600 4954 7331 6478');
} else {
  console.log('❌ Found ' + issuesFound + ' issue(s) that need fixing.\n');
  console.log('Common fixes:');
  console.log('1. Get real provider token from @BotFather');
  console.log('2. Make sure bot token is set');
  console.log('3. Check CURRENCY=UZS (uppercase)');
  console.log('4. Check CONFERENCE_PRICE=200000 (no commas)');
  console.log('\nSee PAYMENT_TROUBLESHOOTING.md for detailed help.');
}

// Connection test
console.log('\n' + '='.repeat(60));
console.log('🌐 CONNECTIVITY TEST:\n');

if (process.env.TELEGRAM_BOT_TOKEN && !process.env.TELEGRAM_BOT_TOKEN.includes('your_')) {
  console.log('Testing connection to Telegram...');

  const https = require('https');
  const botToken = process.env.TELEGRAM_BOT_TOKEN;

  https.get(`https://api.telegram.org/bot${botToken}/getMe`, (res) => {
    let data = '';

    res.on('data', (chunk) => {
      data += chunk;
    });

    res.on('end', () => {
      try {
        const result = JSON.parse(data);
        if (result.ok) {
          console.log('✅ Connection successful!');
          console.log('   Bot username: @' + result.result.username);
          console.log('   Bot name: ' + result.result.first_name);
        } else {
          console.log('❌ Connection failed: ' + result.description);
        }
      } catch (e) {
        console.log('❌ Connection test failed');
      }

      console.log('\n' + '='.repeat(60) + '\n');
    });
  }).on('error', (err) => {
    console.log('❌ Network error: ' + err.message);
    console.log('\n' + '='.repeat(60) + '\n');
  });
} else {
  console.log('⚠️  Skipping (bot token not set)');
  console.log('\n' + '='.repeat(60) + '\n');
}
