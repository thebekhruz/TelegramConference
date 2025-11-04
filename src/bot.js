require('dotenv').config();
const TelegramBot = require('node-telegram-bot-api');
const { getText } = require('./languages');

// Initialize bot
const token = process.env.TELEGRAM_BOT_TOKEN;

if (!token) {
  console.error('Error: TELEGRAM_BOT_TOKEN is not set in .env file');
  process.exit(1);
}

const bot = new TelegramBot(token, { polling: true });

// Store user preferences (in production, use a database)
const userLanguages = new Map();
const userSessions = new Map();

// Configuration
const CONFERENCE_PRICE = parseInt(process.env.CONFERENCE_PRICE) || 200000;
const CURRENCY = process.env.CURRENCY || 'UZS';
const PAYME_TOKEN = process.env.PAYME_PROVIDER_TOKEN;
const CLICK_TOKEN = process.env.CLICK_PROVIDER_TOKEN;

console.log('🤖 Telegram Conference Bot started!');
console.log(`💰 Conference Price: ${CONFERENCE_PRICE} ${CURRENCY}`);

// Helper function to get user language
function getUserLanguage(userId) {
  return userLanguages.get(userId) || 'en';
}

// Helper function to set user language
function setUserLanguage(userId, lang) {
  userLanguages.set(userId, lang);
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
  const lang = getUserLanguage(userId);

  const payment = msg.successful_payment;
  const transactionId = payment.telegram_payment_charge_id;

  console.log('✅ Payment received:', {
    userId: userId,
    amount: payment.total_amount / 100,
    currency: payment.currency,
    transactionId: transactionId,
    payload: payment.invoice_payload
  });

  // Send success message
  bot.sendMessage(
    chatId,
    getText(lang, 'payment_success', { transaction_id: transactionId }),
    {
      reply_markup: getMainMenuKeyboard(lang)
    }
  );

  // Here you can:
  // - Store registration in database
  // - Send confirmation email
  // - Generate ticket/certificate
  // - Add user to conference participants list
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
  bot.stopPolling();
  process.exit(0);
});

process.on('SIGTERM', () => {
  console.log('\n🛑 Shutting down bot...');
  bot.stopPolling();
  process.exit(0);
});
