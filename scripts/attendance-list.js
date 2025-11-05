#!/usr/bin/env node

/**
 * Generate Attendance List from Database
 * Usage: node scripts/attendance-list.js [format]
 * Formats: console, csv, markdown
 */

require('dotenv').config();
const Database = require('../src/database');
const fs = require('fs');
const path = require('path');

const DB_PATH = process.env.DATABASE_PATH || './data/registrations.db';
const db = new Database(DB_PATH);

// Get format from command line argument
const format = process.argv[2] || 'console';

// Get all registrations
const registrations = db.getAllRegistrations(10000);

if (registrations.length === 0) {
  console.log('No registrations found.');
  process.exit(0);
}

// Format date
function formatDate(dateString) {
  const date = new Date(dateString);
  return date.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
}

// Console output
function outputConsole() {
  console.log('\n='.repeat(80));
  console.log('CONFERENCE ATTENDANCE LIST');
  console.log(`Total Registrations: ${registrations.length}`);
  console.log('='.repeat(80));
  console.log();

  registrations.forEach((reg, index) => {
    const name = `${reg.first_name || 'N/A'}${reg.last_name ? ' ' + reg.last_name : ''}`;
    const username = reg.username ? `@${reg.username}` : 'No username';
    const paymentMethod = reg.payment_method.toUpperCase();
    const date = formatDate(reg.registration_date);

    console.log(`${index + 1}. [ID: ${reg.id}]`);
    console.log(`   Name: ${name}`);
    console.log(`   Username: ${username}`);
    console.log(`   Payment: ${paymentMethod}`);
    console.log(`   Date: ${date}`);
    console.log(`   Attended: [ ]`);
    console.log();
  });

  console.log('='.repeat(80));
}

// CSV output
function outputCSV() {
  const headers = [
    'ID',
    'First Name',
    'Last Name',
    'Username',
    'User ID',
    'Payment Method',
    'Registration Date',
    'Attended (✓)'
  ];

  const rows = registrations.map(reg => [
    reg.id,
    reg.first_name || '',
    reg.last_name || '',
    reg.username || '',
    reg.user_id,
    reg.payment_method.toUpperCase(),
    formatDate(reg.registration_date),
    '' // Empty for manual checkmark
  ]);

  const csvContent = [
    headers.join(','),
    ...rows.map(row => row.map(cell => `"${cell}"`).join(','))
  ].join('\n');

  const filename = `attendance_${Date.now()}.csv`;
  const filepath = path.join(__dirname, '..', filename);

  fs.writeFileSync(filepath, csvContent);
  console.log(`✅ CSV file created: ${filename}`);
  console.log(`📍 Location: ${filepath}`);
  console.log(`📊 Total registrations: ${registrations.length}`);
}

// Markdown output (for printing)
function outputMarkdown() {
  let markdown = '# Conference Attendance List\n\n';
  markdown += `**Total Registrations:** ${registrations.length}\n\n`;
  markdown += `**Generated:** ${new Date().toLocaleString()}\n\n`;
  markdown += '---\n\n';

  registrations.forEach((reg, index) => {
    const name = `${reg.first_name || 'N/A'}${reg.last_name ? ' ' + reg.last_name : ''}`;
    const username = reg.username ? `@${reg.username}` : 'No username';

    markdown += `## ${index + 1}. ${name}\n\n`;
    markdown += `- **ID:** #${reg.id}\n`;
    markdown += `- **Username:** ${username}\n`;
    markdown += `- **Payment:** ${reg.payment_method.toUpperCase()}\n`;
    markdown += `- **Date:** ${formatDate(reg.registration_date)}\n`;
    markdown += `- **Attended:** ☐\n\n`;
    markdown += '---\n\n';
  });

  const filename = `attendance_${Date.now()}.md`;
  const filepath = path.join(__dirname, '..', filename);

  fs.writeFileSync(filepath, markdown);
  console.log(`✅ Markdown file created: ${filename}`);
  console.log(`📍 Location: ${filepath}`);
  console.log(`📊 Total registrations: ${registrations.length}`);
  console.log('\nYou can convert this to PDF using:');
  console.log(`- pandoc ${filename} -o attendance.pdf`);
  console.log(`- Or open in any markdown viewer`);
}

// Alphabetically sorted list
function outputAlphabetical() {
  const sorted = [...registrations].sort((a, b) => {
    const nameA = `${a.first_name || ''} ${a.last_name || ''}`.trim().toLowerCase();
    const nameB = `${b.first_name || ''} ${b.last_name || ''}`.trim().toLowerCase();
    return nameA.localeCompare(nameB);
  });

  console.log('\n='.repeat(80));
  console.log('ALPHABETICAL ATTENDANCE LIST');
  console.log(`Total Registrations: ${sorted.length}`);
  console.log('='.repeat(80));
  console.log();

  sorted.forEach((reg, index) => {
    const name = `${reg.first_name || 'N/A'}${reg.last_name ? ' ' + reg.last_name : ''}`;
    const username = reg.username ? `@${reg.username}` : '';

    console.log(`${(index + 1).toString().padStart(3, ' ')}. ${name.padEnd(30, ' ')} ${username.padEnd(20, ' ')} [ ]`);
  });

  console.log('\n' + '='.repeat(80));
}

// Execute based on format
switch (format.toLowerCase()) {
  case 'csv':
    outputCSV();
    break;
  case 'markdown':
  case 'md':
    outputMarkdown();
    break;
  case 'alpha':
  case 'alphabetical':
    outputAlphabetical();
    break;
  case 'console':
  default:
    outputConsole();
    break;
}

db.close();
