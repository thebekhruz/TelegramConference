#!/usr/bin/env node
/**
 * Clear Database Script
 * Deletes all registrations and resets the database
 */

require('dotenv').config();
const Database = require('better-sqlite3');
const path = require('path');
const readline = require('readline');

const DB_PATH = process.env.DATABASE_PATH || './data/registrations.db';

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

console.log('🗑️  Database Clear Script\n');
console.log(`Database: ${DB_PATH}`);

rl.question('\n⚠️  WARNING: This will DELETE ALL REGISTRATIONS!\nAre you sure? (yes/no): ', (answer) => {
  if (answer.toLowerCase() === 'yes') {
    try {
      const db = new Database(DB_PATH);

      // Get count before delete
      const countBefore = db.prepare('SELECT COUNT(*) as count FROM registrations').get();
      console.log(`\n📊 Current registrations: ${countBefore.count}`);

      // Delete all registrations
      db.prepare('DELETE FROM registrations').run();

      // Reset autoincrement counter
      db.prepare('DELETE FROM sqlite_sequence WHERE name="registrations"').run();

      // Verify deletion
      const countAfter = db.prepare('SELECT COUNT(*) as count FROM registrations').get();

      db.close();

      console.log(`✅ Database cleared successfully!`);
      console.log(`📊 Registrations after: ${countAfter.count}`);
      console.log(`\n🔄 You can now start fresh!`);

    } catch (error) {
      console.error('❌ Error clearing database:', error.message);
      process.exit(1);
    }
  } else {
    console.log('\n❌ Cancelled. No changes made.');
  }

  rl.close();
  process.exit(0);
});
