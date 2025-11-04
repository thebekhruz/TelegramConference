require('dotenv').config();
const TelegramBot = require('node-telegram-bot-api');
const { getText } = require('./languages');
const RegistrationDatabase = require('./database');

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
      [{ text: getText(lang, 'change_language') }, { text: getText(lang, 'help_button') }]
    ],
    resize_keyboard: true,
    one_time_keyboard: false
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

// /start command
bot.onText(/\/start/, (msg) => {
  const chatId = msg.chat.id;
  const userId = msg.from.id;
  const lang = getUserLanguage(userId);

  bot.sendMessage(chatId, getText(lang, 'welcome'), {
    reply_markup: getLanguageKeyboard()
  });
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

  bot.sendMessage(chatId, getText(lang, 'registration_info'), {
    reply_markup: getPaymentMethodKeyboard(lang)
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

    await bot.answerCallbackQuery(query.id);
    await bot.editMessageText(getText(selectedLang, 'language_changed'), {
      chat_id: chatId,
      message_id: messageId
    });

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

    await bot.answerCallbackQuery(query.id);

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

    // Store payment method in session
    userSessions.set(userId, {
      paymentMethod: paymentMethod,
      providerName: providerName
    });

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
    await bot.answerCallbackQuery(query.id);
    await bot.editMessageText(getText(lang, 'payment_cancelled'), {
      chat_id: chatId,
      message_id: messageId
    });
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
    const registrationId = db.addRegistration({
      user_id: userId,
      username: user.username || null,
      first_name: user.first_name || null,
      last_name: user.last_name || null,
      language_code: user.language_code || lang,
      payment_method: session.paymentMethod || 'unknown',
      transaction_id: transactionId,
      provider_payment_charge_id: payment.provider_payment_charge_id || null,
      amount: payment.total_amount,
      currency: payment.currency,
      payload: payment.invoice_payload
    });

    console.log(`📝 Registration saved to database with ID: ${registrationId}`);

    // Enhanced success message to user
    const userName = user.first_name || 'Participant';
    const confirmationMessage = `
✅ ${getText(lang, 'payment_success', { transaction_id: transactionId })}

📋 Registration Details:
👤 Name: ${userName}${user.last_name ? ' ' + user.last_name : ''}
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

// Handle text messages (for keyboard buttons)
bot.on('message', async (msg) => {
  if (msg.text && !msg.text.startsWith('/')) {
    const chatId = msg.chat.id;
    const userId = msg.from.id;
    const lang = getUserLanguage(userId);
    const text = msg.text;

    // Register button
    if (text === getText(lang, 'register_button')) {
      bot.sendMessage(chatId, getText(lang, 'registration_info'), {
        reply_markup: getPaymentMethodKeyboard(lang)
      });
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
  }
});

// Error handling
bot.on('polling_error', (error) => {
  console.error('Polling error:', error);
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
