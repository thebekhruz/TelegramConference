// ============================================================================
// TELEGRAM CONFERENCE BOT - MANUAL PAYMENT VERSION
// ============================================================================
// Simple manual payment flow:
// 1. User registers
// 2. User gets PayMe payment instructions
// 3. User uploads payment screenshot
// 4. Bot sends to 2 admins for confirmation
// 5. Admins confirm
// 6. Bot sends confirmation ticket to user

require('dotenv').config();
const TelegramBot = require('node-telegram-bot-api');
const { getText } = require('./languages');
const RegistrationDatabase = require('./database');
const fs = require('fs');
const path = require('path');

// ============================================================================
// BOT INITIALIZATION
// ============================================================================

const token = process.env.TELEGRAM_BOT_TOKEN;
if (!token) {
  console.error('Error: TELEGRAM_BOT_TOKEN is not set in .env file');
  process.exit(1);
}

const bot = new TelegramBot(token, { polling: true });

// ============================================================================
// DATABASE & CONFIGURATION
// ============================================================================

const DB_PATH = process.env.DATABASE_PATH || './data/registrations.db';
const db = new RegistrationDatabase(DB_PATH);

const CONFERENCE_PRICE = parseInt(process.env.CONFERENCE_PRICE) || 200000;
const CURRENCY = process.env.CURRENCY || 'UZS';
const ADMIN_USER_ID = process.env.ADMIN_USER_ID ? parseInt(process.env.ADMIN_USER_ID) : null;
const FINANCE_ADMIN_USER_ID = process.env.FINANCE_ADMIN_USER_ID ? parseInt(process.env.FINANCE_ADMIN_USER_ID) : null;

// PayMe Account Info
const PAYME_ACCOUNT_NUMBER = process.env.PAYME_ACCOUNT_NUMBER || 'YOUR_PAYME_ACCOUNT';
const PAYME_ACCOUNT_NAME = process.env.PAYME_ACCOUNT_NAME || 'Your Business Name';

const EVENT_LOCATION_LAT = 41.255280019377366;
const EVENT_LOCATION_LON = 69.33020330776047;
const WELCOME_PHOTO_PATH = process.env.WELCOME_PHOTO_PATH || './welcome_photo.jpg';

// ============================================================================
// SESSION STORAGE
// ============================================================================

const userSessions = new Map(); // Temporary user registration data
const pendingConfirmations = new Map(); // registrationId -> {userId, photoId, adminConfirmed, financeConfirmed}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

function getUserLanguage(userId) {
  return 'ru'; // Always Russian
}

function isAdmin(userId) {
  return userId === ADMIN_USER_ID || userId === FINANCE_ADMIN_USER_ID;
}

function formatAmount(amount, currency) {
  return `${(amount / 100).toLocaleString('ru-RU')} ${currency}`;
}

function formatDate(dateString) {
  const date = new Date(dateString);
  return date.toLocaleString('ru-RU', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
}

// ============================================================================
// KEYBOARD HELPERS
// ============================================================================

function getMainMenuKeyboard(lang) {
  return {
    keyboard: [
      [{ text: getText(lang, 'register_button') }],
      [{ text: getText(lang, 'schedule_button') }, { text: getText(lang, 'conditions_button') }],
      [{ text: getText(lang, 'benefits_button') }, { text: getText(lang, 'location_button') }]
    ],
    resize_keyboard: true
  };
}

function getContactRequestKeyboard(lang) {
  return {
    keyboard: [
      [{ text: getText(lang, 'share_contact_button'), request_contact: true }],
      [{ text: getText(lang, 'cancel_button') }]
    ],
    resize_keyboard: true,
    one_time_keyboard: true
  };
}

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

// ============================================================================
// WELCOME MESSAGE
// ============================================================================

async function sendWelcomeMessage(chatId, userId, lang) {
  const welcomeText = `<b>Педагогический Форум</b>

<b>«InspireEd Tashkent»</b>

🗓 <b>29 ноября 2025</b>

Русское отделение <b>Oxbridge International School</b> приглашает вас на международный педагогический форум - площадку для обмена ценным опытом и налаживания горизонтальных связей в профессиональном педагогическом сообществе.

👋 <b>Добро пожаловать!</b>

Используйте кнопки ниже для навигации:`;

  const photoPath = path.resolve(WELCOME_PHOTO_PATH);

  try {
    if (fs.existsSync(photoPath)) {
      await bot.sendPhoto(chatId, photoPath, {
        caption: welcomeText,
        parse_mode: 'HTML',
        reply_markup: getMainMenuKeyboard(lang)
      });
    } else {
      await bot.sendMessage(chatId, welcomeText, {
        parse_mode: 'HTML',
        reply_markup: getMainMenuKeyboard(lang)
      });
    }
  } catch (error) {
    console.error('Error sending welcome message:', error);
    await bot.sendMessage(chatId, welcomeText, {
      parse_mode: 'HTML',
      reply_markup: getMainMenuKeyboard(lang)
    });
  }
}

// ============================================================================
// PAYMENT INSTRUCTIONS
// ============================================================================

function getPaymentInstructions(lang, orderId) {
  return `
💳 <b>Инструкция по оплате</b>

Пожалуйста, выполните следующие шаги:

<b>1️⃣ Откройте приложение PayMe</b>

<b>2️⃣ Сделайте перевод на счет:</b>
   • <b>Счет:</b> <code>${PAYME_ACCOUNT_NUMBER}</code>
   • <b>Получатель:</b> ${PAYME_ACCOUNT_NAME}
   • <b>Сумма:</b> ${CONFERENCE_PRICE.toLocaleString()} ${CURRENCY}

<b>3️⃣ В комментарии к переводу укажите:</b>
   "Conference 2025 - [Ваше ФИО]"
   Например: "Conference 2025 - Иванов Иван"

<b>4️⃣ После оплаты сделайте скриншот</b>
   (скриншот должен показывать сумму, дату и получателя)

<b>5️⃣ Отправьте скриншот в этот чат</b>

🆔 <b>Номер вашего заказа:</b> <code>${orderId}</code>

⏳ После получения скриншота, ваш платеж будет проверен администраторами.
Вы получите подтверждение в течение нескольких часов.
  `.trim();
}

// ============================================================================
// CONFIRMATION TICKET GENERATOR
// ============================================================================

function generateConfirmationTicket(registration) {
  const ticketNumber = `CONF2025-${String(registration.id).padStart(4, '0')}`;

  return `
🎫 <b>БИЛЕТ НА КОНФЕРЕНЦИЮ</b>

╔════════════════════════════╗
   <b>InspireEd Tashkent 2025</b>
╚════════════════════════════╝

🆔 <b>Номер билета:</b> <code>${ticketNumber}</code>

👤 <b>Участник:</b>
${registration.first_name || 'N/A'}${registration.last_name ? ' ' + registration.last_name : ''}

📞 <b>Телефон:</b> ${registration.phone_number || 'N/A'}

💰 <b>Оплата:</b> ${formatAmount(registration.amount, registration.currency)}
✅ <b>Статус:</b> ПОДТВЕРЖДЕНО

📅 <b>Дата конференции:</b> 29 ноября 2025
📍 <b>Место:</b> Oxbridge International School

━━━━━━━━━━━━━━━━━━━━━━━━━━

<b>⚠️ ВАЖНО:</b>
• Покажите этот билет на входе
• Приходите за 30 минут до начала
• При себе иметь документ, удостоверяющий личность

Ждем вас на конференции! 🎉

<i>Дата выдачи: ${formatDate(new Date().toISOString())}</i>
  `.trim();
}

// ============================================================================
// ADMIN CONFIRMATION
// ============================================================================

async function sendToAdminsForConfirmation(registration, photoFileId) {
  const orderId = registration.order_id || registration.transaction_id;

  // Store pending confirmation
  pendingConfirmations.set(registration.id, {
    userId: registration.user_id,
    photoFileId: photoFileId,
    adminConfirmed: false,
    financeConfirmed: false,
    registration: registration
  });

  const adminMessage = `
🔔 <b>НОВАЯ ЗАЯВКА НА ПОДТВЕРЖДЕНИЕ</b>

👤 <b>Участник:</b>
• <b>Имя:</b> ${registration.first_name || 'N/A'}${registration.last_name ? ' ' + registration.last_name : ''}
• <b>Username:</b> ${registration.username ? '@' + registration.username : 'N/A'}
• <b>Телефон:</b> ${registration.phone_number || 'N/A'}
• <b>User ID:</b> <code>${registration.user_id}</code>

💰 <b>Платеж:</b>
• <b>Сумма:</b> ${CONFERENCE_PRICE.toLocaleString()} ${CURRENCY}
• <b>ID регистрации:</b> #${registration.id}
• <b>Номер заказа:</b> <code>${orderId}</code>

📸 <b>Скриншот оплаты:</b> (см. выше)

⬇️ <b>Подтвердите платеж:</b>
  `.trim();

  const keyboard = {
    inline_keyboard: [
      [
        { text: '✅ Подтвердить', callback_data: `confirm_${registration.id}` },
        { text: '❌ Отклонить', callback_data: `reject_${registration.id}` }
      ]
    ]
  };

  // Send to main admin
  if (ADMIN_USER_ID) {
    try {
      await bot.sendPhoto(ADMIN_USER_ID, photoFileId, {
        caption: adminMessage + '\n\n👤 <b>Вы:</b> Главный администратор',
        parse_mode: 'HTML',
        reply_markup: keyboard
      });
    } catch (error) {
      console.error('Error sending to main admin:', error);
    }
  }

  // Send to finance admin
  if (FINANCE_ADMIN_USER_ID) {
    try {
      await bot.sendPhoto(FINANCE_ADMIN_USER_ID, photoFileId, {
        caption: adminMessage + '\n\n💼 <b>Вы:</b> Финансовый отдел',
        parse_mode: 'HTML',
        reply_markup: keyboard
      });
    } catch (error) {
      console.error('Error sending to finance admin:', error);
    }
  }
}

async function handleAdminConfirmation(callbackQuery, registrationId, isConfirming) {
  const userId = callbackQuery.from.id;
  const pending = pendingConfirmations.get(registrationId);

  if (!pending) {
    await bot.answerCallbackQuery(callbackQuery.id, {
      text: '❌ Заявка не найдена или уже обработана',
      show_alert: true
    });
    return;
  }

  // Check if rejecting
  if (!isConfirming) {
    // Delete from pending
    pendingConfirmations.delete(registrationId);

    // Update message for both admins
    try {
      await bot.editMessageCaption(
        `❌ <b>ЗАЯВКА ОТКЛОНЕНА</b>\n\n` +
        `Отклонил: ${callbackQuery.from.first_name}\n` +
        `Дата: ${new Date().toLocaleString('ru-RU')}`,
        {
          chat_id: callbackQuery.message.chat.id,
          message_id: callbackQuery.message.message_id,
          parse_mode: 'HTML'
        }
      );
    } catch (error) {
      console.error('Error updating message:', error);
    }

    // Notify user
    try {
      await bot.sendMessage(pending.userId,
        '❌ <b>Платеж отклонен</b>\n\n' +
        'К сожалению, ваш платеж не был подтвержден.\n' +
        'Пожалуйста, свяжитесь с администратором для уточнения деталей.',
        { parse_mode: 'HTML' }
      );
    } catch (error) {
      console.error('Error notifying user:', error);
    }

    await bot.answerCallbackQuery(callbackQuery.id, {
      text: '✅ Заявка отклонена'
    });
    return;
  }

  // Mark who confirmed
  if (userId === ADMIN_USER_ID) {
    pending.adminConfirmed = true;
  } else if (userId === FINANCE_ADMIN_USER_ID) {
    pending.financeConfirmed = true;
  }

  // Check if both confirmed
  const bothConfirmed = pending.adminConfirmed && pending.financeConfirmed;

  if (bothConfirmed) {
    // Both confirmed - process registration
    pendingConfirmations.delete(registrationId);

    // Update database - mark as completed
    try {
      db.updateRegistrationPaymentStatus(pending.registration.order_id, {
        payment_completed: true,
        payment_completed_at: new Date().toISOString()
      });
    } catch (error) {
      console.error('Error updating database:', error);
    }

    // Send ticket to user
    try {
      const ticket = generateConfirmationTicket(pending.registration);
      await bot.sendMessage(pending.userId, ticket, {
        parse_mode: 'HTML',
        reply_markup: getMainMenuKeyboard('ru')
      });
    } catch (error) {
      console.error('Error sending ticket to user:', error);
    }

    // Update messages for both admins
    const finalMessage =
      `✅ <b>ЗАЯВКА ПОДТВЕРЖДЕНА</b>\n\n` +
      `✓ Главный администратор\n` +
      `✓ Финансовый отдел\n\n` +
      `Билет отправлен пользователю\n` +
      `Дата: ${new Date().toLocaleString('ru-RU')}`;

    try {
      await bot.editMessageCaption(finalMessage, {
        chat_id: callbackQuery.message.chat.id,
        message_id: callbackQuery.message.message_id,
        parse_mode: 'HTML'
      });
    } catch (error) {
      console.error('Error updating message:', error);
    }

    await bot.answerCallbackQuery(callbackQuery.id, {
      text: '✅ Билет отправлен пользователю!',
      show_alert: true
    });

  } else {
    // Only one confirmed - waiting for second
    const waitingFor = pending.adminConfirmed ? 'финансового отдела' : 'главного администратора';

    try {
      await bot.editMessageCaption(
        callbackQuery.message.caption +
        `\n\n⏳ <b>Ожидание подтверждения от ${waitingFor}</b>`,
        {
          chat_id: callbackQuery.message.chat.id,
          message_id: callbackQuery.message.message_id,
          parse_mode: 'HTML',
          reply_markup: callbackQuery.message.reply_markup
        }
      );
    } catch (error) {
      console.error('Error updating message:', error);
    }

    await bot.answerCallbackQuery(callbackQuery.id, {
      text: `✅ Подтверждено. Ожидание ${waitingFor}`
    });
  }
}

// ============================================================================
// BOT COMMANDS
// ============================================================================

bot.onText(/\/start/, async (msg) => {
  const chatId = msg.chat.id;
  const userId = msg.from.id;
  const lang = getUserLanguage(userId);

  await sendWelcomeMessage(chatId, userId, lang);
});

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
📊 <b>Статистика регистраций</b>

👥 <b>Всего регистраций:</b> ${stats.total_registrations}
💰 <b>Общая выручка:</b> ${formatAmount(stats.total_revenue, CURRENCY)}
⏳ <b>В ожидании:</b> ${pendingConfirmations.size}

📅 ${formatDate(new Date().toISOString())}
    `.trim();

    bot.sendMessage(chatId, statsMessage, { parse_mode: 'HTML' });
  } catch (error) {
    console.error('Error fetching statistics:', error);
    bot.sendMessage(chatId, '❌ Ошибка при получении статистики.');
  }
});

// ============================================================================
// CONTACT SHARING
// ============================================================================

bot.on('contact', async (msg) => {
  const chatId = msg.chat.id;
  const userId = msg.from.id;
  const lang = getUserLanguage(userId);
  const contact = msg.contact;

  let session = userSessions.get(userId) || {};

  session.phone_number = contact.phone_number;
  session.contact_name = `${contact.first_name || ''}${contact.last_name ? ' ' + contact.last_name : ''}`.trim();

  userSessions.set(userId, session);

  await bot.sendMessage(chatId, getText(lang, 'contact_shared', {
    contact_name: session.contact_name,
    phone_number: session.phone_number
  }), {
    reply_markup: getContactConfirmationKeyboard(lang),
    parse_mode: 'HTML'
  });
});

// ============================================================================
// CALLBACK QUERY HANDLER
// ============================================================================

bot.on('callback_query', async (query) => {
  const chatId = query.message.chat.id;
  const userId = query.from.id;
  const data = query.data;
  const lang = getUserLanguage(userId);

  // Admin confirmation callbacks
  if (data.startsWith('confirm_') || data.startsWith('reject_')) {
    const registrationId = parseInt(data.split('_')[1]);
    const isConfirming = data.startsWith('confirm_');
    await handleAdminConfirmation(query, registrationId, isConfirming);
    return;
  }

  // Contact confirmation
  if (data === 'confirm_contact') {
    const session = userSessions.get(userId) || {};

    if (!session.phone_number) {
      await bot.answerCallbackQuery(query.id);
      await bot.sendMessage(chatId, getText(lang, 'contact_error'), {
        reply_markup: getContactRequestKeyboard(lang)
      });
      return;
    }

    // Generate order ID
    const orderId = `conf_${userId}_${Date.now()}`;
    session.orderId = orderId;
    session.awaitingScreenshot = true;
    userSessions.set(userId, session);

    // Send payment instructions
    await bot.answerCallbackQuery(query.id);
    await bot.sendMessage(chatId, getPaymentInstructions(lang, orderId), {
      parse_mode: 'HTML',
      reply_markup: { remove_keyboard: true }
    });

    // Create registration in database (payment pending)
    try {
      db.addRegistration({
        user_id: userId,
        username: query.from.username || null,
        first_name: query.from.first_name || null,
        last_name: query.from.last_name || null,
        phone_number: session.phone_number || null,
        language_code: lang,
        payment_method: 'payme_manual',
        transaction_id: orderId,
        provider_payment_charge_id: null,
        amount: CONFERENCE_PRICE * 100,
        currency: CURRENCY,
        payload: `manual_${orderId}`,
        order_id: orderId,
        payment_completed: false
      });
    } catch (error) {
      console.error('Error creating registration:', error);
    }

    return;
  }

  // Edit name
  if (data === 'edit_name') {
    await bot.answerCallbackQuery(query.id);
    await bot.sendMessage(chatId, '✏️ Введите ваше полное имя (Имя Фамилия):');
    let session = userSessions.get(userId) || {};
    session.editing = 'name';
    userSessions.set(userId, session);
    return;
  }

  // Edit phone
  if (data === 'edit_phone') {
    await bot.answerCallbackQuery(query.id);
    await bot.sendMessage(chatId, '✏️ Введите ваш номер телефона (+998901234567):');
    let session = userSessions.get(userId) || {};
    session.editing = 'phone';
    userSessions.set(userId, session);
    return;
  }

  // Cancel contact
  if (data === 'cancel_contact') {
    await bot.answerCallbackQuery(query.id);
    userSessions.delete(userId);
    await bot.sendMessage(chatId, 'Регистрация отменена.', {
      reply_markup: getMainMenuKeyboard(lang)
    });
    return;
  }
});

// ============================================================================
// MESSAGE HANDLER
// ============================================================================

bot.on('message', async (msg) => {
  if (msg.text && msg.text.startsWith('/')) return; // Skip commands
  if (msg.contact) return; // Skip contacts (handled separately)

  const chatId = msg.chat.id;
  const userId = msg.from.id;
  const lang = getUserLanguage(userId);
  const session = userSessions.get(userId) || {};

  // Handle screenshot upload
  if (session.awaitingScreenshot && msg.photo) {
    const photoFileId = msg.photo[msg.photo.length - 1].file_id;

    // Get registration from database
    const registration = db.getRegistrationByOrderId(session.orderId);

    if (!registration) {
      await bot.sendMessage(chatId, '❌ Ошибка: регистрация не найдена');
      return;
    }

    // Send confirmation to user
    await bot.sendMessage(chatId,
      '✅ <b>Скриншот получен!</b>\n\n' +
      'Ваш платеж отправлен на проверку администраторам.\n' +
      'Вы получите подтверждение в течение нескольких часов.\n\n' +
      `🆔 Номер заказа: <code>${session.orderId}</code>`,
      { parse_mode: 'HTML', reply_markup: getMainMenuKeyboard(lang) }
    );

    // Send to admins for confirmation
    await sendToAdminsForConfirmation(registration, photoFileId);

    // Clear session
    session.awaitingScreenshot = false;
    userSessions.set(userId, session);
    return;
  }

  // Handle text input (name/phone editing)
  if (msg.text && session.editing) {
    if (session.editing === 'name') {
      session.contact_name = msg.text;
      session.editing = null;
      userSessions.set(userId, session);

      await bot.sendMessage(chatId, getText(lang, 'contact_shared', {
        contact_name: session.contact_name,
        phone_number: session.phone_number
      }), {
        reply_markup: getContactConfirmationKeyboard(lang),
        parse_mode: 'HTML'
      });
      return;
    } else if (session.editing === 'phone') {
      session.phone_number = msg.text;
      session.editing = null;
      userSessions.set(userId, session);

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

  // Handle menu buttons
  if (msg.text === getText(lang, 'register_button')) {
    userSessions.delete(userId);
    await bot.sendMessage(chatId, getText(lang, 'contact_request'), {
      reply_markup: getContactRequestKeyboard(lang),
      parse_mode: 'HTML'
    });
    return;
  }

  if (msg.text === getText(lang, 'schedule_button')) {
    await bot.sendMessage(chatId, getText(lang, 'schedule_info'), {
      reply_markup: getMainMenuKeyboard(lang),
      parse_mode: 'HTML'
    });
    return;
  }

  if (msg.text === getText(lang, 'conditions_button')) {
    await bot.sendMessage(chatId, getText(lang, 'conditions_info'), {
      reply_markup: getMainMenuKeyboard(lang),
      parse_mode: 'HTML'
    });
    return;
  }

  if (msg.text === getText(lang, 'benefits_button')) {
    await bot.sendMessage(chatId, getText(lang, 'benefits_info'), {
      reply_markup: getMainMenuKeyboard(lang),
      parse_mode: 'HTML'
    });
    return;
  }

  if (msg.text === getText(lang, 'location_button')) {
    await bot.sendLocation(chatId, EVENT_LOCATION_LAT, EVENT_LOCATION_LON, {
      reply_markup: getMainMenuKeyboard(lang)
    });
    return;
  }
});

// ============================================================================
// ERROR HANDLING
// ============================================================================

bot.on('polling_error', (error) => {
  console.error('Polling error:', error);
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection:', reason);
});

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

// ============================================================================
// STARTUP LOG
// ============================================================================

console.log('🤖 Telegram Conference Bot started! (MANUAL PAYMENT MODE)');
console.log(`💰 Conference Price: ${CONFERENCE_PRICE} ${CURRENCY}`);
console.log(`📊 Database: ${DB_PATH}`);
console.log(`👤 Main Admin: ${ADMIN_USER_ID || 'NOT SET'}`);
console.log(`💼 Finance Admin: ${FINANCE_ADMIN_USER_ID || 'NOT SET'}`);
console.log(`💳 PayMe Account: ${PAYME_ACCOUNT_NUMBER}`);
console.log('');
console.log('📝 Manual payment flow:');
console.log('   1. User registers → Gets payment instructions');
console.log('   2. User pays manually → Uploads screenshot');
console.log('   3. Both admins confirm → User gets ticket');
console.log('');
