require('dotenv').config();
const TelegramBot = require('node-telegram-bot-api');
const { getText } = require('./languages');
const RegistrationDatabase = require('./database');
const fs = require('fs');
const path = require('path');

// Initialize bot
const token = process.env.TELEGRAM_BOT_TOKEN;

if (!token) {
  console.error('Error: TELEGRAM_BOT_TOKEN is not set in .env file');
  process.exit(1);
}

const bot = new TelegramBot(token, { polling: true });

// Initialize database
const DB_PATH = process.env.DATABASE_PATH || './data/registrations.db';
const db = new RegistrationDatabase(DB_PATH);

// Store user preferences (in production, use a database)
const userLanguages = new Map();
const userSessions = new Map();

// Configuration
const CONFERENCE_PRICE = parseInt(process.env.CONFERENCE_PRICE) || 200000;
const CURRENCY = process.env.CURRENCY || 'UZS';
const PAYME_TOKEN = process.env.PAYME_PROVIDER_TOKEN;
const CLICK_TOKEN = process.env.CLICK_PROVIDER_TOKEN;
const ADMIN_USER_ID = process.env.ADMIN_USER_ID ? parseInt(process.env.ADMIN_USER_ID) : null;
const EVENT_LOCATION_LAT = 41.255280019377366;
const EVENT_LOCATION_LON = 69.33020330776047;
const WELCOME_PHOTO_PATH = process.env.WELCOME_PHOTO_PATH || './welcome_photo.jpg';

console.log('🤖 Telegram Conference Bot started!');
console.log(`💰 Conference Price: ${CONFERENCE_PRICE} ${CURRENCY}`);
console.log(`📊 Database: ${DB_PATH}`);
if (ADMIN_USER_ID) {
  console.log(`👤 Admin User ID: ${ADMIN_USER_ID}`);
}

// Helper function to get user language
function getUserLanguage(userId) {
  return userLanguages.get(userId) || 'en';
}

// Helper function to set user language
function setUserLanguage(userId, lang) {
  userLanguages.set(userId, lang);
}

// Helper function to check if user is admin
function isAdmin(userId) {
  return ADMIN_USER_ID && userId === ADMIN_USER_ID;
}

// Format date for display
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

// Format currency amount
function formatAmount(amount, currency) {
  return `${(amount / 100).toLocaleString()} ${currency}`;
}

// Create language selection keyboard
function getLanguageKeyboard() {
  return {
    inline_keyboard: [
      [
        { text: '🇬🇧 English', callback_data: 'lang_en' },
        { text: '🇷🇺 Русский', callback_data: 'lang_ru' }
      ]
    ]
  };
}

// Create main menu keyboard
function getMainMenuKeyboard(lang) {
  return {
    keyboard: [
      [{ text: getText(lang, 'register_button') }],
      [{ text: getText(lang, 'location_button') }],
      [{ text: getText(lang, 'change_language') }, { text: getText(lang, 'help_button') }]
    ],
    resize_keyboard: true,
    one_time_keyboard: false
  };
}

// Create contact request keyboard
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

// Create contact confirmation keyboard
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

// Create payment method selection keyboard
function getPaymentMethodKeyboard(lang) {
  return {
    inline_keyboard: [
      [
        { text: getText(lang, 'payme_button'), callback_data: 'pay_payme' }
      ],
      [
        { text: getText(lang, 'click_button'), callback_data: 'pay_click' }
      ],
      [
        { text: getText(lang, 'cancel_button'), callback_data: 'cancel_payment' }
      ]
    ]
  };
}

// Create backup of paid registrations
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

    // Also create a latest backup file
    const latestBackupPath = path.join(backupDir, 'registrations_latest.csv');
    fs.writeFileSync(latestBackupPath, csv, 'utf8');
    console.log(`💾 Latest backup updated: ${latestBackupPath}`);

    return backupPath;
  } catch (error) {
    console.error('❌ Error creating backup:', error);
    return null;
  }
}

// Send welcome message with photo and location
async function sendWelcomeMessage(chatId, userId, lang) {
  const welcomeText = `Педагогический Форум

«InspireEd Tashkent»

29 ноября 2025

Русское отделение Oxbridge International
School приглашает вас на
международный педагогический форум
- площадку для обмена ценным опытом и налаживания горизонтальных связей в профессиональном педагогическом сообществе.

${getText(lang, 'welcome')}`;

  // Try to send photo if it exists
  const photoPath = path.resolve(WELCOME_PHOTO_PATH);
  
  try {
    if (fs.existsSync(photoPath)) {
      await bot.sendPhoto(chatId, photoPath, {
        caption: welcomeText,
        reply_markup: getLanguageKeyboard()
      });
    } else {
      // Send without photo if file doesn't exist
      await bot.sendMessage(chatId, welcomeText, {
        reply_markup: getLanguageKeyboard()
      });
      console.log(`⚠️ Welcome photo not found at ${photoPath}. Using text-only welcome.`);
    }
  } catch (error) {
    console.error('Error sending welcome photo:', error);
    // Fallback to text-only message
    await bot.sendMessage(chatId, welcomeText, {
      reply_markup: getLanguageKeyboard()
    });
  }
}

// /start command
bot.onText(/\/start/, (msg) => {
  const chatId = msg.chat.id;
  const userId = msg.from.id;
  const lang = getUserLanguage(userId);

  sendWelcomeMessage(chatId, userId, lang);
});

// /language command
bot.onText(/\/language/, (msg) => {
  const chatId = msg.chat.id;
  const userId = msg.from.id;
  const lang = getUserLanguage(userId);

  bot.sendMessage(chatId, getText(lang, 'select_language'), {
    reply_markup: getLanguageKeyboard()
  });
});

// /register command
bot.onText(/\/register/, (msg) => {
  const chatId = msg.chat.id;
  const userId = msg.from.id;
  const lang = getUserLanguage(userId);

  // Reset user session
  userSessions.delete(userId);

  // Request contact information first
  bot.sendMessage(chatId, getText(lang, 'contact_request'), {
    reply_markup: getContactRequestKeyboard(lang)
  });
});

// /help command
bot.onText(/\/help/, (msg) => {
  const chatId = msg.chat.id;
  const userId = msg.from.id;
  const lang = getUserLanguage(userId);

  bot.sendMessage(chatId, getText(lang, 'help_text'), {
    reply_markup: getMainMenuKeyboard(lang)
  });
});

// Admin Commands
// /stats command - Show registration statistics (admin only)
bot.onText(/\/stats/, (msg) => {
  const chatId = msg.chat.id;
  const userId = msg.from.id;

  if (!isAdmin(userId)) {
    bot.sendMessage(chatId, '❌ This command is only available to administrators.');
    return;
  }

  try {
    const stats = db.getStatistics();
    const statsMessage = `
📊 <b>Conference Registration Statistics</b>

👥 <b>Registrations:</b>
- Total: ${stats.total_registrations}
- PayMe: ${stats.payme_registrations}
- Click: ${stats.click_registrations}

💰 <b>Revenue:</b>
- Total: ${formatAmount(stats.total_revenue, CURRENCY)}

📅 <i>Last updated: ${formatDate(new Date().toISOString())}</i>
`;

    bot.sendMessage(chatId, statsMessage, { parse_mode: 'HTML' });
  } catch (error) {
    console.error('Error fetching statistics:', error);
    bot.sendMessage(chatId, '❌ Error fetching statistics.');
  }
});

// /recent command - Show recent registrations (admin only)
bot.onText(/\/recent(?:\s+(\d+))?/, (msg, match) => {
  const chatId = msg.chat.id;
  const userId = msg.from.id;

  if (!isAdmin(userId)) {
    bot.sendMessage(chatId, '❌ This command is only available to administrators.');
    return;
  }

  const limit = match[1] ? parseInt(match[1]) : 10;

  try {
    const registrations = db.getRecentRegistrations(Math.min(limit, 50));

    if (registrations.length === 0) {
      bot.sendMessage(chatId, 'No registrations found.');
      return;
    }

    let message = `📋 <b>Recent ${registrations.length} Registration(s):</b>\n\n`;

    registrations.forEach((reg, index) => {
      message += `<b>${index + 1}. #${reg.id}</b>\n`;
      message += `👤 ${reg.first_name || 'N/A'}${reg.last_name ? ' ' + reg.last_name : ''}\n`;
      message += `📱 ${reg.username ? '@' + reg.username : 'No username'}\n`;
      message += `📞 ${reg.phone_number || 'No phone'}\n`;
      message += `💳 ${reg.payment_method.toUpperCase()}\n`;
      message += `💰 ${formatAmount(reg.amount, reg.currency)}\n`;
      message += `📅 ${formatDate(reg.registration_date)}\n\n`;
    });

    bot.sendMessage(chatId, message, { parse_mode: 'HTML' });
  } catch (error) {
    console.error('Error fetching recent registrations:', error);
    bot.sendMessage(chatId, '❌ Error fetching registrations.');
  }
});

// /export command - Export registrations to CSV (admin only)
bot.onText(/\/export/, (msg) => {
  const chatId = msg.chat.id;
  const userId = msg.from.id;

  if (!isAdmin(userId)) {
    bot.sendMessage(chatId, '❌ This command is only available to administrators.');
    return;
  }

  try {
    const csv = db.exportToCSV();
    const fileName = `conference_registrations_${Date.now()}.csv`;

    bot.sendDocument(chatId, Buffer.from(csv, 'utf8'), {
      caption: '📊 Conference Registrations Export',
    }, {
      filename: fileName,
      contentType: 'text/csv',
    });
  } catch (error) {
    console.error('Error exporting registrations:', error);
    bot.sendMessage(chatId, '❌ Error exporting registrations.');
  }
});

// /adminhelp command - Show admin commands (admin only)
bot.onText(/\/adminhelp/, (msg) => {
  const chatId = msg.chat.id;
  const userId = msg.from.id;

  if (!isAdmin(userId)) {
    bot.sendMessage(chatId, '❌ This command is only available to administrators.');
    return;
  }

  const helpMessage = `
👨‍💼 <b>Admin Commands</b>

📊 /stats - View registration statistics
📋 /recent [number] - Show recent registrations (default: 10, max: 50)
📥 /export - Export all registrations to CSV
👨‍💼 /adminhelp - Show this help message

<i>Only administrators can use these commands.</i>
`;

  bot.sendMessage(chatId, helpMessage, { parse_mode: 'HTML' });
});

// Helper function to safely answer callback queries
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

// Handle callback queries
bot.on('callback_query', async (query) => {
  const chatId = query.message.chat.id;
  const userId = query.from.id;
  const data = query.data;
  const messageId = query.message.message_id;

  // Language selection
  if (data.startsWith('lang_')) {
    const selectedLang = data.replace('lang_', '');
    setUserLanguage(userId, selectedLang);

    await answerCallbackQuery(query.id);
    try {
      await bot.editMessageText(getText(selectedLang, 'language_changed'), {
        chat_id: chatId,
        message_id: messageId
      });
    } catch (error) {
      console.error('Error editing message:', error.message);
    }

    setTimeout(() => {
      bot.sendMessage(chatId, getText(selectedLang, 'main_menu'), {
        reply_markup: getMainMenuKeyboard(selectedLang)
      });
    }, 1000);
  }

  // Payment method selection
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

    let providerToken;
    let providerName;

    if (paymentMethod === 'payme') {
      providerToken = PAYME_TOKEN;
      providerName = 'PayMe';
    } else if (paymentMethod === 'click') {
      providerToken = CLICK_TOKEN;
      providerName = 'Click';
    }

    if (!providerToken) {
      bot.sendMessage(chatId, `❌ ${providerName} provider token is not configured. Please contact the administrator.`);
      return;
    }

    // Store payment method in session (preserving existing session data like phone_number)
    session.paymentMethod = paymentMethod;
    session.providerName = providerName;
    userSessions.set(userId, session);

    // Send invoice
    try {
      await sendInvoice(chatId, userId, lang, providerToken, providerName);
    } catch (error) {
      console.error('Error sending invoice:', error);
      bot.sendMessage(chatId, getText(lang, 'error_occurred'));
    }
  }

  // Cancel payment
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

  // Contact confirmation flow
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
        reply_markup: getPaymentMethodKeyboard(lang)
      });
    }, 500);
  }

  // Edit name
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

  // Edit phone
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

  // Cancel contact
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

// Send invoice function
async function sendInvoice(chatId, userId, lang, providerToken, providerName) {
  const title = getText(lang, 'invoice_title');
  const description = getText(lang, 'payment_description');

  const invoice = {
    chat_id: chatId,
    title: title,
    description: description,
    payload: `conference_${userId}_${Date.now()}`,
    provider_token: providerToken,
    currency: CURRENCY,
    prices: [
      {
        label: title,
        amount: CONFERENCE_PRICE * 100 // Amount in smallest currency unit (tyiyn for UZS)
      }
    ],
    start_parameter: 'conference-registration',
    protect_content: false
  };

  await bot.sendInvoice(
    invoice.chat_id,
    invoice.title,
    invoice.description,
    invoice.payload,
    invoice.provider_token,
    invoice.currency,
    invoice.prices,
    {
      start_parameter: invoice.start_parameter,
      protect_content: invoice.protect_content
    }
  );
}

// Handle pre-checkout query
bot.on('pre_checkout_query', async (query) => {
  // Always approve pre-checkout
  // In production, you might want to verify stock/availability here
  await bot.answerPreCheckoutQuery(query.id, true);
});

// Handle successful payment
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
    const userName = user.first_name || 'Participant';
    const confirmationMessage = `
✅ ${getText(lang, 'payment_success', { transaction_id: transactionId })}

📋 Registration Details:
👤 Name: ${userName}${user.last_name ? ' ' + user.last_name : ''}
📞 Phone: ${session.phone_number || 'N/A'}
💳 Payment Method: ${session.providerName || 'N/A'}
💰 Amount: ${formatAmount(payment.total_amount, payment.currency)}
🆔 Registration ID: #${registrationId}
📅 Date: ${formatDate(new Date().toISOString())}

We look forward to seeing you at the conference! 🎉
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
🔔 <b>New Conference Registration!</b>

👤 <b>User Info:</b>
- Name: ${user.first_name || 'N/A'}${user.last_name ? ' ' + user.last_name : ''}
- Username: ${user.username ? '@' + user.username : 'N/A'}
- Phone: ${session.phone_number || 'N/A'}
- User ID: <code>${userId}</code>
- Language: ${lang.toUpperCase()}

💰 <b>Payment Info:</b>
- Method: ${session.providerName || 'Unknown'}
- Amount: ${formatAmount(payment.total_amount, payment.currency)}
- Transaction ID: <code>${transactionId}</code>

📊 <b>Current Statistics:</b>
- Total Registrations: ${stats.total_registrations}
- Total Revenue: ${formatAmount(stats.total_revenue, payment.currency)}
- PayMe: ${stats.payme_registrations} | Click: ${stats.click_registrations}

🆔 Registration ID: #${registrationId}
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
      '⚠️ Payment received but there was an error saving your registration. Please contact support with your transaction ID: ' + transactionId
    );

    // Still notify admin about the error
    if (ADMIN_USER_ID) {
      try {
        await bot.sendMessage(
          ADMIN_USER_ID,
          `⚠️ <b>Registration Error!</b>\n\nUser ${userId} paid successfully but registration failed to save.\nTransaction: <code>${transactionId}</code>\nError: ${error.message}`,
          { parse_mode: 'HTML' }
        );
      } catch (e) {
        console.error('Failed to notify admin about error:', e);
      }
    }
  }
});

// Handle contact sharing
bot.on('message', async (msg) => {
  const chatId = msg.chat.id;
  const userId = msg.from.id;
  const lang = getUserLanguage(userId);

  // Handle contact sharing
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

  // Handle text messages (for keyboard buttons)
  if (msg.text && !msg.text.startsWith('/')) {
    const text = msg.text;

    // Register button
    if (text === getText(lang, 'register_button')) {
      // Reset user session
      userSessions.delete(userId);
      // Request contact information first
      bot.sendMessage(chatId, getText(lang, 'contact_request'), {
        reply_markup: getContactRequestKeyboard(lang)
      });
    }

    // Cancel button during contact request
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

    // Location button
    if (text === getText(lang, 'location_button')) {
      bot.sendLocation(chatId, EVENT_LOCATION_LAT, EVENT_LOCATION_LON, {
        reply_markup: getMainMenuKeyboard(lang)
      });
      return;
    }

    // Change language button
    if (text === getText(lang, 'change_language')) {
      bot.sendMessage(chatId, getText(lang, 'select_language'), {
        reply_markup: getLanguageKeyboard()
      });
    }

    // Help button
    if (text === getText(lang, 'help_button')) {
      bot.sendMessage(chatId, getText(lang, 'help_text'), {
        reply_markup: getMainMenuKeyboard(lang)
      });
    }

    // Handle text input for editing contact info
    if (text && !text.startsWith('/')) {
      const session = userSessions.get(userId);
      
      // Check if user is editing contact info
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
          getText(lang, 'location_button'),
          getText(lang, 'change_language'),
          getText(lang, 'help_button'),
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

// Error handling
bot.on('polling_error', (error) => {
  console.error('Polling error:', error);
});

// Catch unhandled promise rejections
process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason);
  // Don't exit, just log the error
});

// Catch uncaught exceptions
process.on('uncaughtException', (error) => {
  console.error('Uncaught Exception:', error);
  // For critical errors, we might want to exit, but for now just log
  // In production, you might want to restart the bot here
});

// Graceful shutdown
process.on('SIGINT', () => {
  console.log('\n🛑 Shutting down bot...');
  db.close();
  bot.stopPolling();
  process.exit(0);
});

process.on('SIGTERM', () => {
  console.log('\n🛑 Shutting down bot...');
  db.close();
  bot.stopPolling();
  process.exit(0);
});
