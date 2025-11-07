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

    // Add columns if they don't exist (for existing databases)
    const columnsToAdd = [
      'phone_number TEXT',
      'order_id TEXT UNIQUE',
      'payme_transaction_id TEXT',
      'payment_in_progress BOOLEAN DEFAULT 0',
      'payment_completed BOOLEAN DEFAULT 1',
      'payment_completed_at DATETIME',
      'payment_cancelled BOOLEAN DEFAULT 0',
      'cancel_reason INTEGER'
    ];

    for (const column of columnsToAdd) {
      try {
        this.db.exec(`ALTER TABLE registrations ADD COLUMN ${column}`);
      } catch (error) {
        // Column already exists, ignore error
      }
    }

    // Create index for faster lookups
    this.db.exec(`
      CREATE INDEX IF NOT EXISTS idx_user_id ON registrations(user_id);
      CREATE INDEX IF NOT EXISTS idx_transaction_id ON registrations(transaction_id);
      CREATE INDEX IF NOT EXISTS idx_registration_date ON registrations(registration_date);
      CREATE INDEX IF NOT EXISTS idx_order_id ON registrations(order_id);
      CREATE INDEX IF NOT EXISTS idx_payme_transaction_id ON registrations(payme_transaction_id);
    `);

    console.log('✅ Database initialized successfully');
  }

  // Add new registration
  addRegistration(data) {
    const stmt = this.db.prepare(`
      INSERT INTO registrations (
        user_id, username, first_name, last_name, phone_number, language_code,
        payment_method, transaction_id, provider_payment_charge_id,
        amount, currency, payload, order_id, payment_completed
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    const result = stmt.run(
      data.user_id,
      data.username,
      data.first_name,
      data.last_name,
      data.phone_number || null,
      data.language_code,
      data.payment_method,
      data.transaction_id,
      data.provider_payment_charge_id,
      data.amount,
      data.currency,
      data.payload,
      data.order_id || null,
      data.payment_completed !== undefined ? (data.payment_completed ? 1 : 0) : 1
    );

    return result.lastInsertRowid;
  }

  // Get registration by transaction ID
  getRegistrationByTransactionId(transactionId) {
    const stmt = this.db.prepare('SELECT * FROM registrations WHERE transaction_id = ?');
    return stmt.get(transactionId);
  }

  // Get registration by order ID
  getRegistrationByOrderId(orderId) {
    const stmt = this.db.prepare('SELECT * FROM registrations WHERE order_id = ?');
    return stmt.get(orderId);
  }

  // Update payment status (for PayMe Merchant API callbacks)
  updateRegistrationPaymentStatus(orderId, statusData) {
    const registration = this.getRegistrationByOrderId(orderId);
    if (!registration) {
      throw new Error(`Registration not found for order_id: ${orderId}`);
    }

    const updates = [];
    const values = [];

    if (statusData.payme_transaction_id !== undefined) {
      updates.push('payme_transaction_id = ?');
      values.push(statusData.payme_transaction_id);
    }

    if (statusData.payment_in_progress !== undefined) {
      updates.push('payment_in_progress = ?');
      values.push(statusData.payment_in_progress ? 1 : 0);
    }

    if (statusData.payment_completed !== undefined) {
      updates.push('payment_completed = ?');
      values.push(statusData.payment_completed ? 1 : 0);
    }

    if (statusData.payment_completed_at !== undefined) {
      updates.push('payment_completed_at = ?');
      values.push(statusData.payment_completed_at);
    }

    if (statusData.payment_cancelled !== undefined) {
      updates.push('payment_cancelled = ?');
      values.push(statusData.payment_cancelled ? 1 : 0);
    }

    if (statusData.cancel_reason !== undefined) {
      updates.push('cancel_reason = ?');
      values.push(statusData.cancel_reason);
    }

    if (updates.length === 0) {
      return; // Nothing to update
    }

    values.push(orderId);
    const sql = `UPDATE registrations SET ${updates.join(', ')} WHERE order_id = ?`;
    const stmt = this.db.prepare(sql);
    stmt.run(...values);
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

    const headers = ['ID', 'User ID', 'Username', 'First Name', 'Last Name', 'Phone Number', 'Payment Method',
                     'Transaction ID', 'Amount', 'Currency', 'Registration Date'];

    const rows = registrations.map(reg => [
      reg.id,
      reg.user_id,
      reg.username || '',
      reg.first_name || '',
      reg.last_name || '',
      reg.phone_number || '',
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
