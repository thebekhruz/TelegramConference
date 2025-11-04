const Database = require('better-sqlite3');
const path = require('path');
const fs = require('fs');

class RegistrationDatabase {
  constructor(dbPath) {
    // Ensure data directory exists
    const dir = path.dirname(dbPath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }

    this.db = new Database(dbPath);
    this.initDatabase();
  }

  initDatabase() {
    // Create registrations table
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS registrations (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER NOT NULL,
        username TEXT,
        first_name TEXT,
        last_name TEXT,
        language_code TEXT,
        payment_method TEXT NOT NULL,
        transaction_id TEXT NOT NULL UNIQUE,
        provider_payment_charge_id TEXT,
        amount INTEGER NOT NULL,
        currency TEXT NOT NULL,
        payload TEXT,
        registration_date DATETIME DEFAULT CURRENT_TIMESTAMP,
        status TEXT DEFAULT 'completed'
      )
    `);

    // Create index for faster lookups
    this.db.exec(`
      CREATE INDEX IF NOT EXISTS idx_user_id ON registrations(user_id);
      CREATE INDEX IF NOT EXISTS idx_transaction_id ON registrations(transaction_id);
      CREATE INDEX IF NOT EXISTS idx_registration_date ON registrations(registration_date);
    `);

    console.log('✅ Database initialized successfully');
  }

  // Add new registration
  addRegistration(data) {
    const stmt = this.db.prepare(`
      INSERT INTO registrations (
        user_id, username, first_name, last_name, language_code,
        payment_method, transaction_id, provider_payment_charge_id,
        amount, currency, payload
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    const result = stmt.run(
      data.user_id,
      data.username,
      data.first_name,
      data.last_name,
      data.language_code,
      data.payment_method,
      data.transaction_id,
      data.provider_payment_charge_id,
      data.amount,
      data.currency,
      data.payload
    );

    return result.lastInsertRowid;
  }

  // Get registration by transaction ID
  getRegistrationByTransactionId(transactionId) {
    const stmt = this.db.prepare('SELECT * FROM registrations WHERE transaction_id = ?');
    return stmt.get(transactionId);
  }

  // Get all registrations for a user
  getRegistrationsByUserId(userId) {
    const stmt = this.db.prepare('SELECT * FROM registrations WHERE user_id = ? ORDER BY registration_date DESC');
    return stmt.all(userId);
  }

  // Get all registrations
  getAllRegistrations(limit = 100, offset = 0) {
    const stmt = this.db.prepare('SELECT * FROM registrations ORDER BY registration_date DESC LIMIT ? OFFSET ?');
    return stmt.all(limit, offset);
  }

  // Get registration count
  getRegistrationCount() {
    const stmt = this.db.prepare('SELECT COUNT(*) as count FROM registrations');
    return stmt.get().count;
  }

  // Get recent registrations
  getRecentRegistrations(limit = 10) {
    const stmt = this.db.prepare('SELECT * FROM registrations ORDER BY registration_date DESC LIMIT ?');
    return stmt.all(limit);
  }

  // Get registrations by payment method
  getRegistrationsByPaymentMethod(paymentMethod) {
    const stmt = this.db.prepare('SELECT * FROM registrations WHERE payment_method = ? ORDER BY registration_date DESC');
    return stmt.all(paymentMethod);
  }

  // Get total revenue
  getTotalRevenue() {
    const stmt = this.db.prepare('SELECT SUM(amount) as total FROM registrations WHERE status = "completed"');
    const result = stmt.get();
    return result.total || 0;
  }

  // Get statistics
  getStatistics() {
    const total = this.getRegistrationCount();
    const revenue = this.getTotalRevenue();

    const paymeCount = this.db.prepare('SELECT COUNT(*) as count FROM registrations WHERE payment_method = "payme"').get().count;
    const clickCount = this.db.prepare('SELECT COUNT(*) as count FROM registrations WHERE payment_method = "click"').get().count;

    return {
      total_registrations: total,
      total_revenue: revenue,
      payme_registrations: paymeCount,
      click_registrations: clickCount
    };
  }

  // Check if user is already registered
  isUserRegistered(userId) {
    const stmt = this.db.prepare('SELECT COUNT(*) as count FROM registrations WHERE user_id = ?');
    return stmt.get(userId).count > 0;
  }

  // Export registrations to CSV format
  exportToCSV() {
    const registrations = this.getAllRegistrations(10000); // Get all

    const headers = ['ID', 'User ID', 'Username', 'First Name', 'Last Name', 'Payment Method',
                     'Transaction ID', 'Amount', 'Currency', 'Registration Date'];

    const rows = registrations.map(reg => [
      reg.id,
      reg.user_id,
      reg.username || '',
      reg.first_name || '',
      reg.last_name || '',
      reg.payment_method,
      reg.transaction_id,
      reg.amount,
      reg.currency,
      reg.registration_date
    ]);

    return [headers, ...rows].map(row => row.join(',')).join('\n');
  }

  // Close database connection
  close() {
    this.db.close();
  }
}

module.exports = RegistrationDatabase;
