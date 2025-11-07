// ============================================================================
// IMPORTS AND CONFIGURATION
// ============================================================================

require('dotenv').config();
const TelegramBot = require('node-telegram-bot-api');
const { getText } = require('./languages');
const RegistrationDatabase = require('./database');
const PayMeMerchantAPI = require('./payme-merchant-api');
const express = require('express');
const fs = require('fs');
const path = require('path');

// ============================================================================
// BOT INITIALIZATION
// ============================================================================

// Initialize Telegram bot with token from environment variables
const token = process.env.TELEGRAM_BOT_TOKEN;

if (!token) {
  console.error('Error: TELEGRAM_BOT_TOKEN is not set in .env file');
  process.exit(1);
}

const bot = new TelegramBot(token, { polling: true });

// ============================================================================
// DATABASE INITIALIZATION
// ============================================================================

// Initialize SQLite database for storing registrations
const DB_PATH = process.env.DATABASE_PATH || './data/registrations.db';
const db = new RegistrationDatabase(DB_PATH);

// ============================================================================
// USER SESSION MANAGEMENT
// ============================================================================

// Store user language preferences (in-memory, in production use database)
const userLanguages = new Map();

// Store user registration sessions (temporary data during registration flow)
const userSessions = new Map();

// ============================================================================
// APPLICATION CONFIGURATION
// ============================================================================

const CONFERENCE_PRICE = parseInt(process.env.CONFERENCE_PRICE) || 200000; // Price in UZS
const CURRENCY = process.env.CURRENCY || 'UZS';
const ADMIN_USER_ID = process.env.ADMIN_USER_ID ? parseInt(process.env.ADMIN_USER_ID) : null;

// PayMe Merchant API Configuration
const PAYME_MERCHANT_ID = process.env.PAYME_MERCHANT_ID;
const PAYME_SECRET_KEY = process.env.PAYME_SECRET_KEY;
const PAYME_ENDPOINT = process.env.PAYME_ENDPOINT || 'https://checkout.paycom.uz';
const WEBHOOK_PORT = process.env.WEBHOOK_PORT || 3000;
const WEBHOOK_PATH = process.env.WEBHOOK_PATH || '/payme-webhook';

// Initialize PayMe Merchant API
let paymeMerchantAPI = null;
if (PAYME_MERCHANT_ID && PAYME_SECRET_KEY) {
  // Note: bot will be passed after initialization
  console.log('✅ PayMe Merchant API initialized');
  console.log(`   Merchant ID: ${PAYME_MERCHANT_ID}`);
} else {
  console.warn('⚠️  WARNING: PayMe credentials not set. Payment functionality will not work.');
  console.warn('   Set PAYME_MERCHANT_ID and PAYME_SECRET_KEY in .env file');
}
const EVENT_LOCATION_LAT = 41.255280019377366; // Event location latitude
const EVENT_LOCATION_LON = 69.33020330776047; // Event location longitude
const WELCOME_PHOTO_PATH = process.env.WELCOME_PHOTO_PATH || './welcome_photo.jpg';

// ============================================================================
// STARTUP LOGGING
// ============================================================================

console.log('🤖 Telegram Conference Bot started!');
console.log(`💰 Conference Price: ${CONFERENCE_PRICE} ${CURRENCY}`);
console.log(`📊 Database: ${DB_PATH}`);
if (ADMIN_USER_ID) {
  console.log(`👤 Admin User ID: ${ADMIN_USER_ID}`);
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Get user's preferred language (always Russian)
 * @param {number} userId - Telegram user ID
 * @returns {string} Language code (always 'ru')
 */
function getUserLanguage(userId) {
  return 'ru';
}

/**
 * Set user's preferred language
 * @param {number} userId - Telegram user ID
 * @param {string} lang - Language code ('en' or 'ru')
 */
function setUserLanguage(userId, lang) {
  userLanguages.set(userId, lang);
}

/**
 * Check if user is an administrator
 * @param {number} userId - Telegram user ID
 * @returns {boolean} True if user is admin
 */
function isAdmin(userId) {
  return ADMIN_USER_ID && userId === ADMIN_USER_ID;
}

/**
 * Format date string for display
 * @param {string} dateString - ISO date string
 * @returns {string} Formatted date string
 */
function formatDate(dateString) {
  const date = new Date(dateString);
  return date.toLocaleString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
}

/**
 * Format currency amount for display
 * @param {number} amount - Amount in smallest currency unit (tyiyn for UZS)
 * @param {string} currency - Currency code
 * @returns {string} Formatted amount string
 */
function formatAmount(amount, currency) {
  return `${(amount / 100).toLocaleString()} ${currency}`;
}

// ============================================================================
// KEYBOARD CREATION FUNCTIONS
// ============================================================================

/**
 * Create main menu keyboard with registration, schedule, conditions, benefits, and location buttons
 * @param {string} lang - Language code (always 'ru')
 * @returns {Object} Telegram keyboard object
 */
function getMainMenuKeyboard(lang) {
  return {
    keyboard: [
      [{ text: getText(lang, 'register_button') }],
      [
        { text: getText(lang, 'schedule_button') },
        { text: getText(lang, 'conditions_button') }
      ],
      [
        { text: getText(lang, 'benefits_button') },
        { text: getText(lang, 'location_button') }
      ]
    ],
    resize_keyboard: true,
    one_time_keyboard: false
  };
}

/**
 * Create contact request keyboard with share contact button
 * @param {string} lang - Language code
 * @returns {Object} Telegram keyboard object with contact request
 */
function getContactRequestKeyboard(lang) {
  return {
    keyboard: [
      [
        { text: getText(lang, 'contact_button'), request_contact: true }
      ],
      [
        { text: getText(lang, 'cancel_button') }
      ]
    ],
    resize_keyboard: true,
    one_time_keyboard: true
  };
}

/**
 * Create contact confirmation keyboard with edit options
 * @param {string} lang - Language code
 * @returns {Object} Telegram inline keyboard object
 */
function getContactConfirmationKeyboard(lang) {
  return {
    inline_keyboard: [
      [
        { text: getText(lang, 'contact_edit_name'), callback_data: 'edit_name' },
        { text: getText(lang, 'contact_edit_phone'), callback_data: 'edit_phone' }
      ],
      [
        { text: getText(lang, 'contact_confirm_button'), callback_data: 'confirm_contact' }
      ],
      [
        { text: getText(lang, 'cancel_button'), callback_data: 'cancel_contact' }
      ]
    ]
  };
}

/**
 * Create payment method keyboard (PayMe only)
 * @param {string} lang - Language code
 * @returns {Object} Telegram inline keyboard object
 */
function getPaymentMethodKeyboard(lang) {
  return {
    inline_keyboard: [
      [
        { text: getText(lang, 'payme_button'), callback_data: 'pay_payme' }
      ],
      [
        { text: getText(lang, 'cancel_button'), callback_data: 'cancel_payment' }
      ]
    ]
  };
}

// ============================================================================
// BACKUP FUNCTIONALITY
// ============================================================================

/**
 * Create backup of all paid registrations to CSV file
 * Creates both timestamped backup and latest backup file
 * @returns {string|null} Path to backup file or null if error
 */
function createBackup() {
  try {
    const backupDir = path.join(__dirname, '..', 'backups');
    if (!fs.existsSync(backupDir)) {
      fs.mkdirSync(backupDir, { recursive: true });
    }

    const csv = db.exportToCSV();
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const backupFileName = `registrations_backup_${timestamp}.csv`;
    const backupPath = path.join(backupDir, backupFileName);

    fs.writeFileSync(backupPath, csv, 'utf8');
    console.log(`💾 Backup created: ${backupPath}`);

    // Also create a latest backup file for easy access
    const latestBackupPath = path.join(backupDir, 'registrations_latest.csv');
    fs.writeFileSync(latestBackupPath, csv, 'utf8');
    console.log(`💾 Latest backup updated: ${latestBackupPath}`);

    return backupPath;
  } catch (error) {
    console.error('❌ Error creating backup:', error);
    return null;
  }
}

/**
 * Process manual payment verification
 * Handles payment proof submitted by user (transaction ID or screenshot)
 * @param {number} chatId - Chat ID
 * @param {number} userId - User ID
 * @param {Object} user - User object from Telegram
 * @param {string} lang - Language code
 * @param {Object} session - User session data
 * @param {string} proofText - Payment proof (transaction ID or photo file_id)
 */
// ============================================================================
// REMOVED: Manual Payment Proof Processing
// ============================================================================
// The processPaymentProof function is no longer needed because PayMe Merchant API
// webhooks handle payment confirmation automatically. When a user pays via PayMe,
// the webhook (PerformTransaction) will:
// 1. Update the database automatically
// 2. Send confirmation to the user
// 3. Notify the admin
//
// This eliminates the need for manual payment proof submission.

// ============================================================================
// WELCOME MESSAGE FUNCTIONALITY
// ============================================================================

/**
 * Send welcome message with photo and main menu
 * @param {number} chatId - Telegram chat ID
 * @param {number} userId - Telegram user ID
 * @param {string} lang - Current user language (always 'ru')
 */
async function sendWelcomeMessage(chatId, userId, lang) {
  const welcomeText = `<b>Педагогический Форум</b>

<b>«InspireEd Tashkent»</b>

🗓 <b>29 ноября 2025</b>

Русское отделение <b>Oxbridge International School</b> приглашает вас на международный педагогический форум - площадку для обмена ценным опытом и налаживания горизонтальных связей в профессиональном педагогическом сообществе.

👋 <b>Добро пожаловать!</b>

Используйте кнопки ниже для навигации:`;

  // Try to send photo if it exists
  const photoPath = path.resolve(WELCOME_PHOTO_PATH);
  
  try {
    if (fs.existsSync(photoPath)) {
      await bot.sendPhoto(chatId, photoPath, {
        caption: welcomeText,
        reply_markup: getMainMenuKeyboard(lang),
        parse_mode: 'HTML'
      });
    } else {
      // Send without photo if file doesn't exist
      await bot.sendMessage(chatId, welcomeText, {
        reply_markup: getMainMenuKeyboard(lang),
        parse_mode: 'HTML'
      });
      console.log(`⚠️ Welcome photo not found at ${photoPath}. Using text-only welcome.`);
    }
  } catch (error) {
    console.error('Error sending welcome photo:', error);
    // Fallback to text-only message
    await bot.sendMessage(chatId, welcomeText, {
      reply_markup: getMainMenuKeyboard(lang),
      parse_mode: 'HTML'
    });
  }
}

// ============================================================================
// COMMAND HANDLERS - USER COMMANDS
// ============================================================================

/**
 * /start command handler
 * Sends welcome message with event information and language selection
 */
bot.onText(/\/start/, (msg) => {
  const chatId = msg.chat.id;
  const userId = msg.from.id;
  const lang = getUserLanguage(userId);

  sendWelcomeMessage(chatId, userId, lang);
});


/**
 * /register command handler
 * Starts registration flow by requesting contact information
 */
bot.onText(/\/register/, (msg) => {
  const chatId = msg.chat.id;
  const userId = msg.from.id;
  const lang = getUserLanguage(userId);

  // Reset user session to start fresh registration
  userSessions.delete(userId);

  // Request contact information first
  bot.sendMessage(chatId, getText(lang, 'contact_request'), {
    reply_markup: getContactRequestKeyboard(lang)
  });
});

/**
 * /help command handler
 * Shows help information and available commands
 */
bot.onText(/\/help/, (msg) => {
  const chatId = msg.chat.id;
  const userId = msg.from.id;
  const lang = getUserLanguage(userId);

  bot.sendMessage(chatId, getText(lang, 'help_text'), {
    reply_markup: getMainMenuKeyboard(lang)
  });
});

// ============================================================================
// COMMAND HANDLERS - ADMIN COMMANDS
// ============================================================================

/**
 * /stats command handler - Show registration statistics (admin only)
 * Displays total registrations, revenue, and payment method statistics
 */
bot.onText(/\/stats/, (msg) => {
  const chatId = msg.chat.id;
  const userId = msg.from.id;

  if (!isAdmin(userId)) {
    bot.sendMessage(chatId, '❌ Эта команда доступна только администраторам.');
    return;
  }

  try {
    const stats = db.getStatistics();
    const statsMessage = `
📊 <b>Статистика регистраций на конференцию</b>

👥 <b>Регистрации:</b>
• <b>Всего:</b> ${stats.total_registrations}
• <b>PayMe:</b> ${stats.payme_registrations}

💰 <b>Выручка:</b>
• <b>Всего:</b> ${formatAmount(stats.total_revenue, CURRENCY)}

📅 <i>Последнее обновление: ${formatDate(new Date().toISOString())}</i>
`;

    bot.sendMessage(chatId, statsMessage, { parse_mode: 'HTML' });
  } catch (error) {
    console.error('Error fetching statistics:', error);
    bot.sendMessage(chatId, '❌ Ошибка при получении статистики.');
  }
});

/**
 * /recent command handler - Show recent registrations (admin only)
 * @param {number} limit - Optional limit (default: 10, max: 50)
 */
bot.onText(/\/recent(?:\s+(\d+))?/, (msg, match) => {
  const chatId = msg.chat.id;
  const userId = msg.from.id;

  if (!isAdmin(userId)) {
    bot.sendMessage(chatId, '❌ Эта команда доступна только администраторам.');
    return;
  }

  const limit = match[1] ? parseInt(match[1]) : 10;

  try {
    const registrations = db.getRecentRegistrations(Math.min(limit, 50));

    if (registrations.length === 0) {
      bot.sendMessage(chatId, 'Регистрации не найдены.');
      return;
    }

    let message = `📋 <b>Последние ${registrations.length} регистраций:</b>\n\n`;

    registrations.forEach((reg, index) => {
      message += `<b>${index + 1}. #${reg.id}</b>\n`;
      message += `👤 ${reg.first_name || 'N/A'}${reg.last_name ? ' ' + reg.last_name : ''}\n`;
      message += `📱 ${reg.username ? '@' + reg.username : 'Нет username'}\n`;
      message += `📞 ${reg.phone_number || 'Нет телефона'}\n`;
      message += `💳 ${reg.payment_method.toUpperCase()}\n`;
      message += `💰 ${formatAmount(reg.amount, reg.currency)}\n`;
      message += `📅 ${formatDate(reg.registration_date)}\n\n`;
    });

    bot.sendMessage(chatId, message, { parse_mode: 'HTML' });
  } catch (error) {
    console.error('Error fetching recent registrations:', error);
    bot.sendMessage(chatId, '❌ Ошибка при получении регистраций.');
  }
});

/**
 * /export command handler - Export registrations to CSV (admin only)
 * Generates CSV file with all registration data and sends it to admin
 */
bot.onText(/\/export/, (msg) => {
  const chatId = msg.chat.id;
  const userId = msg.from.id;

  if (!isAdmin(userId)) {
    bot.sendMessage(chatId, '❌ Эта команда доступна только администраторам.');
    return;
  }

  try {
    const csv = db.exportToCSV();
    const fileName = `conference_registrations_${Date.now()}.csv`;

    bot.sendDocument(chatId, Buffer.from(csv, 'utf8'), {
      filename: fileName,
      contentType: 'text/csv',
      caption: '📊 Экспорт регистраций на конференцию',
    });
  } catch (error) {
    console.error('Error exporting registrations:', error);
    bot.sendMessage(chatId, '❌ Ошибка при экспорте регистраций.');
  }
});

/**
 * /adminhelp command handler - Show admin commands (admin only)
 * Displays list of available admin commands
 */
bot.onText(/\/adminhelp/, (msg) => {
  const chatId = msg.chat.id;
  const userId = msg.from.id;

  if (!isAdmin(userId)) {
    bot.sendMessage(chatId, '❌ Эта команда доступна только администраторам.');
    return;
  }

  const helpMessage = `
👨‍💼 <b>Команды администратора</b>

📊 /stats - Просмотр статистики регистраций
📋 /recent [число] - Показать последние регистрации (по умолчанию: 10, максимум: 50)
📥 /export - Экспорт всех регистраций в CSV
👨‍💼 /adminhelp - Показать это сообщение

<i>Только администраторы могут использовать эти команды.</i>
`;

  bot.sendMessage(chatId, helpMessage, { parse_mode: 'HTML' });
});

// ============================================================================
// CALLBACK QUERY HANDLING
// ============================================================================

/**
 * Safely answer callback queries, handling expired/invalid queries gracefully
 * @param {string} queryId - Callback query ID
 * @param {Object} options - Optional parameters for answerCallbackQuery
 */
async function answerCallbackQuery(queryId, options = {}) {
  try {
    await bot.answerCallbackQuery(queryId, options);
  } catch (error) {
    // Ignore errors for expired or invalid callback queries
    const errorMessage = error.message || '';
    const errorDescription = error.response?.body?.description || error.description || '';
    const fullErrorText = (errorMessage + ' ' + errorDescription).toLowerCase();
    
    if (fullErrorText.includes('query is too old') || 
        fullErrorText.includes('query id is invalid') ||
        fullErrorText.includes('response timeout expired')) {
      console.log(`⚠️ Callback query ${queryId} expired or invalid, ignoring...`);
      return;
    }
    // Log other errors but don't crash
    console.error('Error answering callback query:', error.message || error);
  }
}

/**
 * Callback query event handler
 * Handles all inline button callbacks: language selection, payment, contact confirmation, etc.
 */
bot.on('callback_query', async (query) => {
  const chatId = query.message.chat.id;
  const userId = query.from.id;
  const data = query.data;
  const messageId = query.message.message_id;

  // --------------------------------------------------------------------------
  // Payment Method Selection Handler (PayMe Direct)
  // --------------------------------------------------------------------------
  if (data.startsWith('pay_')) {
    const lang = getUserLanguage(userId);
    const paymentMethod = data.replace('pay_', '');

    await answerCallbackQuery(query.id);

    // Check if contact information was shared
    const session = userSessions.get(userId) || {};
    if (!session.phone_number) {
      bot.sendMessage(chatId, getText(lang, 'contact_error'), {
        reply_markup: getContactRequestKeyboard(lang)
      });
      return;
    }

    // Only PayMe is supported (Merchant API Integration)
    if (paymentMethod === 'payme') {
      if (!paymeMerchantAPI) {
        bot.sendMessage(chatId, '❌ <b>Ошибка конфигурации</b>\n\nPayMe не настроен. Пожалуйста, свяжитесь с администратором.', {
          parse_mode: 'HTML'
        });
        return;
      }

      // Generate unique order ID
      const orderId = `conf_${userId}_${Date.now()}`;

      // Amount in tyiyn (smallest unit)
      const amountInTyiyn = CONFERENCE_PRICE * 100;

      // Create registration in database immediately (payment pending)
      try {
        db.addRegistration({
          user_id: userId,
          username: query.from.username || null,
          first_name: query.from.first_name || null,
          last_name: query.from.last_name || null,
          phone_number: session.phone_number || null,
          language_code: lang,
          payment_method: 'payme',
          transaction_id: orderId, // Use order_id as transaction_id initially
          provider_payment_charge_id: null,
          amount: amountInTyiyn,
          currency: CURRENCY,
          payload: `payme_merchant_${orderId}`,
          order_id: orderId,
          payment_completed: false // Payment pending
        });

        console.log(`✅ Registration created in database: ${orderId} (payment pending)`);
      } catch (error) {
        console.error('Error creating registration:', error);
        bot.sendMessage(chatId, '❌ <b>Ошибка</b>\n\nНе удалось создать регистрацию. Пожалуйста, попробуйте снова.', {
          parse_mode: 'HTML'
        });
        return;
      }

      // Store order info in session
      session.orderId = orderId;
      session.paymentMethod = 'payme';
      session.providerName = 'PayMe';
      userSessions.set(userId, session);

      // Generate PayMe payment link
      const paymentUrl = paymeMerchantAPI.generatePaymentLink({
        amount: amountInTyiyn,
        orderId: orderId,
        description: getText(lang, 'payment_description') || 'Регистрация на конференцию'
      });

      // Create payment message
      const paymentMessage = `
💳 <b>Оплата регистрации</b>

Для завершения регистрации нажмите кнопку ниже для оплаты через PayMe.

💰 <b>Сумма:</b> ${CONFERENCE_PRICE.toLocaleString()} ${CURRENCY}
🆔 <b>Номер заказа:</b> <code>${orderId}</code>

<i>После успешной оплаты вы автоматически получите подтверждение в течение нескольких секунд.</i>

⚠️ <i>Оплатите в течение 12 часов, иначе заказ будет отменен.</i>
      `.trim();

      // Send message with PayMe button
      bot.sendMessage(chatId, paymentMessage, {
        parse_mode: 'HTML',
        reply_markup: {
          inline_keyboard: [
            [
              { text: '💳 Открыть PayMe', url: paymentUrl }
            ],
            [
              { text: '❌ Отмена', callback_data: 'cancel_payment' }
            ]
          ]
        }
      });

      console.log(`📤 PayMe payment link sent to user ${userId}`);
      console.log(`   Order ID: ${orderId}`);
      console.log(`   Amount: ${CONFERENCE_PRICE} ${CURRENCY}`);
    }
  }

  // --------------------------------------------------------------------------
  // Payment Confirmation Handler - NO LONGER NEEDED
  // PayMe Merchant API webhooks handle payment confirmation automatically
  // --------------------------------------------------------------------------
  // Removed: Manual payment proof submission is replaced by automatic webhooks

  // --------------------------------------------------------------------------
  // Payment Cancellation Handler
  // --------------------------------------------------------------------------
  if (data === 'cancel_payment') {
    const lang = getUserLanguage(userId);
    await answerCallbackQuery(query.id);
    try {
      await bot.editMessageText(getText(lang, 'payment_cancelled'), {
        chat_id: chatId,
        message_id: messageId
      });
    } catch (error) {
      console.error('Error editing message:', error.message);
    }
  }

  // --------------------------------------------------------------------------
  // Contact Confirmation Handler
  // --------------------------------------------------------------------------
  if (data === 'confirm_contact') {
    const lang = getUserLanguage(userId);
    const session = userSessions.get(userId) || {};
    
    await answerCallbackQuery(query.id);
    
    if (!session.phone_number) {
      try {
        await bot.editMessageText(getText(lang, 'contact_error'), {
          chat_id: chatId,
          message_id: messageId
        });
      } catch (error) {
        console.error('Error editing message:', error.message);
      }
      return;
    }

    try {
      await bot.editMessageText(getText(lang, 'contact_confirm'), {
        chat_id: chatId,
        message_id: messageId
      });
    } catch (error) {
      console.error('Error editing message:', error.message);
    }

    // Show payment method selection
    setTimeout(() => {
      bot.sendMessage(chatId, getText(lang, 'registration_info'), {
        reply_markup: getPaymentMethodKeyboard(lang),
        parse_mode: 'HTML'
      });
    }, 500);
  }

  // --------------------------------------------------------------------------
  // Contact Edit Name Handler
  // --------------------------------------------------------------------------
  if (data === 'edit_name') {
    const lang = getUserLanguage(userId);
    const session = userSessions.get(userId) || {};
    session.editing = 'name';
    userSessions.set(userId, session);
    
    await answerCallbackQuery(query.id);
    const promptText = lang === 'ru' ? 'Пожалуйста, отправьте ваше полное имя:' : 'Please send your full name:';
    try {
      await bot.sendMessage(chatId, promptText);
    } catch (error) {
      console.error('Error sending message:', error.message);
    }
  }

  // --------------------------------------------------------------------------
  // Contact Edit Phone Handler
  // --------------------------------------------------------------------------
  if (data === 'edit_phone') {
    const lang = getUserLanguage(userId);
    const session = userSessions.get(userId) || {};
    session.editing = 'phone';
    userSessions.set(userId, session);
    
    await answerCallbackQuery(query.id);
    const promptText = lang === 'ru' ? 'Пожалуйста, отправьте ваш номер телефона:' : 'Please send your phone number:';
    try {
      await bot.sendMessage(chatId, promptText);
    } catch (error) {
      console.error('Error sending message:', error.message);
    }
  }

  // --------------------------------------------------------------------------
  // Contact Cancellation Handler
  // --------------------------------------------------------------------------
  if (data === 'cancel_contact') {
    const lang = getUserLanguage(userId);
    await answerCallbackQuery(query.id);
    try {
      await bot.editMessageText(getText(lang, 'payment_cancelled'), {
        chat_id: chatId,
        message_id: messageId
      });
    } catch (error) {
      console.error('Error editing message:', error.message);
    }
    userSessions.delete(userId);
  }
});

// ============================================================================
// PAYMENT PROCESSING
// ============================================================================

/**
 * Send payment invoice to user via Telegram Payments
 * @param {number} chatId - Telegram chat ID
 * @param {number} userId - Telegram user ID
 * @param {string} lang - User language
 * @param {string} providerToken - PayMe provider token
 * @param {string} providerName - Payment provider name (PayMe)
 */
async function sendInvoice(chatId, userId, lang, providerToken, providerName) {
  const title = getText(lang, 'invoice_title');
  const description = getText(lang, 'payment_description');

  // Ensure provider token is trimmed and valid
  const cleanProviderToken = providerToken ? providerToken.trim() : null;
  
  if (!cleanProviderToken) {
    throw new Error('PayMe provider token is not configured');
  }

  // Prepare invoice payload - must be unique per invoice
  const payload = `conference_${userId}_${Date.now()}`;
  
  // Amount in smallest currency unit (tyiyn for UZS)
  // For UZS: 1 UZS = 100 tyiyn, so 200000 UZS = 20000000 tyiyn
  const amountInTyiyn = CONFERENCE_PRICE * 100;

  try {
    await bot.sendInvoice(
      chatId,
      title,
      description,
      payload,
      cleanProviderToken,
      CURRENCY,
      [
        {
          label: title,
          amount: amountInTyiyn
        }
      ],
      {
        start_parameter: 'conference-registration',
        protect_content: false
      }
    );
    
    console.log(`📤 Invoice sent to user ${userId} for ${CONFERENCE_PRICE} ${CURRENCY}`);
  } catch (error) {
    console.error('❌ Error sending invoice:', error);
    console.error('Error details:', {
      message: error.message,
      response: error.response?.body,
      providerToken: cleanProviderToken ? `${cleanProviderToken.substring(0, 10)}...` : 'missing'
    });
    throw error;
  }
}

/**
 * Pre-checkout query handler
 * Approves payment requests before user confirms payment
 * In production, you might want to verify stock/availability here
 */
bot.on('pre_checkout_query', async (query) => {
  // Always approve pre-checkout
  await bot.answerPreCheckoutQuery(query.id, true);
});

/**
 * Successful payment handler
 * Processes completed payments, saves registration to database, creates backup,
 * sends confirmation to user, and notifies admin
 */
bot.on('successful_payment', async (msg) => {
  const chatId = msg.chat.id;
  const userId = msg.from.id;
  const user = msg.from;
  const lang = getUserLanguage(userId);

  const payment = msg.successful_payment;
  const transactionId = payment.telegram_payment_charge_id;
  const session = userSessions.get(userId) || {};

  console.log('✅ Payment received:', {
    userId: userId,
    username: user.username,
    amount: payment.total_amount / 100,
    currency: payment.currency,
    transactionId: transactionId,
    payload: payment.invoice_payload,
    paymentMethod: session.paymentMethod
  });

  // Save registration to database
  try {
    // Use edited contact name if available, otherwise use Telegram profile name
    let firstName = user.first_name || null;
    let lastName = user.last_name || null;
    
    if (session.contact_name) {
      // If contact name was edited, use it
      const nameParts = session.contact_name.trim().split(/\s+/);
      firstName = nameParts[0] || firstName;
      lastName = nameParts.length > 1 ? nameParts.slice(1).join(' ') : null;
    }

    const registrationId = db.addRegistration({
      user_id: userId,
      username: user.username || null,
      first_name: firstName,
      last_name: lastName,
      phone_number: session.phone_number || null,
      language_code: user.language_code || lang,
      payment_method: session.paymentMethod || 'unknown',
      transaction_id: transactionId,
      provider_payment_charge_id: payment.provider_payment_charge_id || null,
      amount: payment.total_amount,
      currency: payment.currency,
      payload: payment.invoice_payload
    });

    console.log(`📝 Registration saved to database with ID: ${registrationId}`);

    // Create backup after successful payment
    createBackup();

    // Enhanced success message to user
    const userName = user.first_name || 'Участник';
    const confirmationMessage = `
✅ ${getText(lang, 'payment_success', { transaction_id: transactionId })}

📋 <b>Детали регистрации:</b>
👤 <b>Имя:</b> ${userName}${user.last_name ? ' ' + user.last_name : ''}
📞 <b>Телефон:</b> ${session.phone_number || 'N/A'}
💳 <b>Способ оплаты:</b> ${session.providerName || 'N/A'}
💰 <b>Сумма:</b> ${formatAmount(payment.total_amount, payment.currency)}
🆔 <b>ID регистрации:</b> #${registrationId}
📅 <b>Дата:</b> ${formatDate(new Date().toISOString())}

Ждем вас на конференции! 🎉
`;

    await bot.sendMessage(chatId, confirmationMessage, {
      reply_markup: getMainMenuKeyboard(lang),
      parse_mode: 'HTML'
    });

    // Send notification to admin
    if (ADMIN_USER_ID) {
      try {
        const stats = db.getStatistics();
        const adminMessage = `
🔔 <b>Новая регистрация на конференцию!</b>

👤 <b>Информация о пользователе:</b>
• <b>Имя:</b> ${user.first_name || 'N/A'}${user.last_name ? ' ' + user.last_name : ''}
• <b>Username:</b> ${user.username ? '@' + user.username : 'N/A'}
• <b>Телефон:</b> ${session.phone_number || 'N/A'}
• <b>User ID:</b> <code>${userId}</code>
• <b>Язык:</b> ${lang.toUpperCase()}

💰 <b>Информация об оплате:</b>
• <b>Способ:</b> ${session.providerName || 'Неизвестно'}
• <b>Сумма:</b> ${formatAmount(payment.total_amount, payment.currency)}
• <b>ID транзакции:</b> <code>${transactionId}</code>

📊 <b>Текущая статистика:</b>
• <b>Всего регистраций:</b> ${stats.total_registrations}
• <b>Общая выручка:</b> ${formatAmount(stats.total_revenue, payment.currency)}
• <b>PayMe:</b> ${stats.payme_registrations}

🆔 <b>ID регистрации:</b> #${registrationId}
📅 ${formatDate(new Date().toISOString())}
`;

        await bot.sendMessage(ADMIN_USER_ID, adminMessage, {
          parse_mode: 'HTML'
        });

        console.log(`📨 Admin notification sent to user ${ADMIN_USER_ID}`);
      } catch (error) {
        console.error('❌ Error sending admin notification:', error.message);
      }
    }

    // Clear user session
    userSessions.delete(userId);

  } catch (error) {
    console.error('❌ Error saving registration:', error);
    bot.sendMessage(
      chatId,
      `⚠️ <b>Оплата получена, но возникла ошибка при сохранении регистрации.</b>\n\nПожалуйста, свяжитесь с поддержкой и укажите ID транзакции: <code>${transactionId}</code>`,
      { parse_mode: 'HTML' }
    );

    // Still notify admin about the error
    if (ADMIN_USER_ID) {
      try {
        await bot.sendMessage(
          ADMIN_USER_ID,
          `⚠️ <b>Ошибка регистрации!</b>\n\nПользователь ${userId} успешно оплатил, но регистрация не была сохранена.\nТранзакция: <code>${transactionId}</code>\nОшибка: ${error.message}`,
          { parse_mode: 'HTML' }
        );
      } catch (e) {
        console.error('Failed to notify admin about error:', e);
      }
    }
  }
});

// ============================================================================
// MESSAGE HANDLERS
// ============================================================================

/**
 * Message event handler
 * Handles contact sharing, text messages, keyboard button presses, and location requests
 */
bot.on('message', async (msg) => {
  const chatId = msg.chat.id;
  const userId = msg.from.id;
  const lang = getUserLanguage(userId);

  // --------------------------------------------------------------------------
  // Contact Sharing Handler
  // --------------------------------------------------------------------------
  if (msg.contact) {
    const contact = msg.contact;
    const phoneNumber = contact.phone_number;
    const contactName = contact.first_name || (contact.first_name && contact.last_name ? 
      `${contact.first_name} ${contact.last_name}` : contact.first_name) || 'User';

    // Store contact info in session
    if (!userSessions.has(userId)) {
      userSessions.set(userId, {});
    }
    const session = userSessions.get(userId);
    session.phone_number = phoneNumber;
    session.contact_name = contactName;
    session.editing = null; // Clear any editing state

    // Confirm contact received and ask for confirmation
    await bot.sendMessage(chatId, getText(lang, 'contact_shared', {
      contact_name: contactName,
      phone_number: phoneNumber
    }), {
      reply_markup: { remove_keyboard: true },
      parse_mode: 'HTML'
    });

    // Show confirmation buttons
    const confirmPrompt = lang === 'ru' 
      ? 'Пожалуйста, подтвердите вашу информацию или отредактируйте при необходимости:'
      : 'Please confirm your information or edit if needed:';
    await bot.sendMessage(chatId, confirmPrompt, {
      reply_markup: getContactConfirmationKeyboard(lang)
    });

    return;
  }

  // --------------------------------------------------------------------------
  // Payment Proof Submission Handler - REMOVED
  // --------------------------------------------------------------------------
  // Manual payment proof submission is no longer needed. PayMe Merchant API
  // webhooks automatically handle payment verification and confirmation.

  // --------------------------------------------------------------------------
  // Text Message Handler (Keyboard Buttons and Text Input)
  // --------------------------------------------------------------------------
  if (msg.text && !msg.text.startsWith('/')) {
    const text = msg.text;

    // Register button handler (Book a ticket)
    if (text === getText(lang, 'register_button')) {
      // Reset user session
      userSessions.delete(userId);
      // Request contact information first
      bot.sendMessage(chatId, getText(lang, 'contact_request'), {
        reply_markup: getContactRequestKeyboard(lang),
        parse_mode: 'HTML'
      });
    }

    // Cancel button handler (during contact request)
    if (text === getText(lang, 'cancel_button')) {
      const session = userSessions.get(userId);
      // If no contact info is stored, user is cancelling contact request
      if (!session || !session.phone_number) {
        bot.sendMessage(chatId, getText(lang, 'payment_cancelled'), {
          reply_markup: { remove_keyboard: true }
        });
        userSessions.delete(userId);
        return;
      }
    }

    // Schedule button handler
    if (text === getText(lang, 'schedule_button')) {
      bot.sendMessage(chatId, getText(lang, 'schedule_info'), {
        reply_markup: getMainMenuKeyboard(lang),
        parse_mode: 'HTML'
      });
      return;
    }

    // Conditions button handler
    if (text === getText(lang, 'conditions_button')) {
      bot.sendMessage(chatId, getText(lang, 'conditions_info'), {
        reply_markup: getMainMenuKeyboard(lang),
        parse_mode: 'HTML'
      });
      return;
    }

    // Benefits button handler
    if (text === getText(lang, 'benefits_button')) {
      bot.sendMessage(chatId, getText(lang, 'benefits_info'), {
        reply_markup: getMainMenuKeyboard(lang),
        parse_mode: 'HTML'
      });
      return;
    }

    // Location button handler - sends event location
    if (text === getText(lang, 'location_button')) {
      bot.sendLocation(chatId, EVENT_LOCATION_LAT, EVENT_LOCATION_LON, {
        reply_markup: getMainMenuKeyboard(lang)
      });
      return;
    }

    // Text input handler for editing contact information
    if (text && !text.startsWith('/')) {
      const session = userSessions.get(userId);
      
      // Check if user is in edit mode for contact information
      if (session && session.editing) {
        if (session.editing === 'name') {
          session.contact_name = text;
          session.editing = null;
          userSessions.set(userId, session);
          
          // Show updated contact info for confirmation
          await bot.sendMessage(chatId, getText(lang, 'contact_shared', {
            contact_name: session.contact_name,
            phone_number: session.phone_number
          }), {
            reply_markup: getContactConfirmationKeyboard(lang),
            parse_mode: 'HTML'
          });
          return;
        } else if (session.editing === 'phone') {
          // Validate phone number (basic validation)
          const phoneRegex = /^\+?[1-9]\d{1,14}$/;
          const cleanPhone = text.replace(/\D/g, '');
          
          if (!phoneRegex.test(cleanPhone) && !phoneRegex.test(text)) {
            const errorMsg = lang === 'ru'
              ? '❌ Неверный формат номера телефона. Пожалуйста, отправьте действительный номер телефона (например, +998901234567 или 901234567):'
              : '❌ Invalid phone number format. Please send a valid phone number (e.g., +998901234567 or 901234567):';
            await bot.sendMessage(chatId, errorMsg);
            return;
          }
          
          session.phone_number = cleanPhone.startsWith('+') ? text : (text.startsWith('998') ? '+' + text : '+998' + cleanPhone);
          session.editing = null;
          userSessions.set(userId, session);
          
          // Show updated contact info for confirmation
          await bot.sendMessage(chatId, getText(lang, 'contact_shared', {
            contact_name: session.contact_name,
            phone_number: session.phone_number
          }), {
            reply_markup: getContactConfirmationKeyboard(lang),
            parse_mode: 'HTML'
          });
          return;
        }
      }
      
      // If user sends text during contact request, remind them to share contact
      if (!session || !session.phone_number) {
        // Check if this is not one of the recognized buttons
        const recognizedButtons = [
          getText(lang, 'register_button'),
          getText(lang, 'schedule_button'),
          getText(lang, 'conditions_button'),
          getText(lang, 'benefits_button'),
          getText(lang, 'location_button'),
          getText(lang, 'cancel_button')
        ];
        
        if (!recognizedButtons.includes(text)) {
          bot.sendMessage(chatId, getText(lang, 'contact_error'), {
            reply_markup: getContactRequestKeyboard(lang)
          });
        }
      }
    }
  }
});

// ============================================================================
// PAYME WEBHOOK SERVER
// ============================================================================

// Initialize PayMe Merchant API with bot and database
if (PAYME_MERCHANT_ID && PAYME_SECRET_KEY) {
  paymeMerchantAPI = new PayMeMerchantAPI(
    {
      merchantId: PAYME_MERCHANT_ID,
      secretKey: PAYME_SECRET_KEY,
      endpoint: PAYME_ENDPOINT
    },
    db,
    bot,
    ADMIN_USER_ID
  );

  // Create Express app for webhook
  const app = express();
  app.use(express.json());

  // Health check endpoint
  app.get('/health', (req, res) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString() });
  });

  // PayMe webhook endpoint
  app.post(WEBHOOK_PATH, paymeMerchantAPI.createWebhookHandler());

  // Start webhook server
  app.listen(WEBHOOK_PORT, () => {
    console.log(`✅ PayMe webhook server started on port ${WEBHOOK_PORT}`);
    console.log(`   Webhook endpoint: http://localhost:${WEBHOOK_PORT}${WEBHOOK_PATH}`);
    console.log(`   Health check: http://localhost:${WEBHOOK_PORT}/health`);
  });
} else {
  console.warn('⚠️  PayMe webhook server not started (credentials missing)');
}

// ============================================================================
// ERROR HANDLING
// ============================================================================

/**
 * Polling error handler
 * Catches errors from Telegram API polling
 */
bot.on('polling_error', (error) => {
  console.error('Polling error:', error);
});

/**
 * Unhandled promise rejection handler
 * Prevents bot from crashing on unhandled promise rejections
 */
process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason);
  // Don't exit, just log the error
});

/**
 * Uncaught exception handler
 * Catches unexpected errors to prevent bot crashes
 */
process.on('uncaughtException', (error) => {
  console.error('Uncaught Exception:', error);
  // For critical errors, we might want to exit, but for now just log
  // In production, you might want to restart the bot here
});

// ============================================================================
// GRACEFUL SHUTDOWN
// ============================================================================

/**
 * SIGINT handler (Ctrl+C)
 * Gracefully shuts down bot, closes database, and stops polling
 */
process.on('SIGINT', () => {
  console.log('\n🛑 Shutting down bot...');
  db.close();
  bot.stopPolling();
  process.exit(0);
});

/**
 * SIGTERM handler
 * Gracefully shuts down bot, closes database, and stops polling
 */
process.on('SIGTERM', () => {
  console.log('\n🛑 Shutting down bot...');
  db.close();
  bot.stopPolling();
  process.exit(0);
});
