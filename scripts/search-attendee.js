#!/usr/bin/env node

/**
 * Search for Attendee in Database
 * Usage: node scripts/search-attendee.js "search term"
 */

require('dotenv').config();
const Database = require('../src/database');

const DB_PATH = process.env.DATABASE_PATH || './data/registrations.db';
const db = new Database(DB_PATH);

const searchTerm = process.argv[2];

if (!searchTerm) {
  console.log('Usage: node scripts/search-attendee.js "search term"');
  console.log('Example: node scripts/search-attendee.js "John Doe"');
  console.log('Example: node scripts/search-attendee.js "@johndoe"');
  process.exit(1);
}

// Get all registrations and search
const registrations = db.getAllRegistrations(10000);
const searchLower = searchTerm.toLowerCase().replace('@', '');

const results = registrations.filter(reg => {
  const firstName = (reg.first_name || '').toLowerCase();
  const lastName = (reg.last_name || '').toLowerCase();
  const username = (reg.username || '').toLowerCase();
  const fullName = `${firstName} ${lastName}`.trim();
  const userId = reg.user_id.toString();

  return fullName.includes(searchLower) ||
         username.includes(searchLower) ||
         userId.includes(searchLower);
});

console.log('\n' + '='.repeat(60));
console.log(`Search Results for: "${searchTerm}"`);
console.log('='.repeat(60));

if (results.length === 0) {
  console.log('\n❌ No attendees found matching your search.\n');
} else {
  console.log(`\n✅ Found ${results.length} attendee(s):\n`);

  results.forEach((reg, index) => {
    const name = `${reg.first_name || 'N/A'}${reg.last_name ? ' ' + reg.last_name : ''}`;
    const username = reg.username ? `@${reg.username}` : 'No username';
    const date = new Date(reg.registration_date).toLocaleString();

    console.log(`${index + 1}. ${name}`);
    console.log(`   Registration ID: #${reg.id}`);
    console.log(`   Username: ${username}`);
    console.log(`   User ID: ${reg.user_id}`);
    console.log(`   Payment Method: ${reg.payment_method.toUpperCase()}`);
    console.log(`   Transaction ID: ${reg.transaction_id}`);
    console.log(`   Registration Date: ${date}`);
    console.log(`   Status: ✅ REGISTERED`);
    console.log();
  });
}

console.log('='.repeat(60) + '\n');

db.close();
