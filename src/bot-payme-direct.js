/**
 * PayMe Direct Payment Bot Extension
 * Add this to your bot.js to enable direct PayMe payment links
 *
 * This approach redirects users to PayMe app/website instead of
 * using Telegram's native payment interface
 */

const PayMePayment = require('./payme-payment');

/**
 * Initialize PayMe Direct Payment
 * Call this in your bot initialization
 */
function initializePayMeDirect(config) {
  const { merchantId, secretKey, endpoint } = config;

  if (!merchantId || !secretKey) {
    console.warn('⚠️  PayMe Direct: Merchant ID or Secret Key not configured');
    return null;
  }

  const payme = new PayMePayment({
    merchantId,
    secretKey,
    endpoint: endpoint || 'https://checkout.paycom.uz'
  });

  console.log('✅ PayMe Direct payment initialized');
  return payme;
}

/**
 * Create payment method keyboard for direct PayMe
 * @param {string} lang - Language code
 */
function getPayMeDirectKeyboard(lang) {
  const getText = require('./languages').getText;

  return {
    inline_keyboard: [
      [
        { text: getText(lang, 'payme_button'), callback_data: 'pay_payme_direct' }
      ],
      [
        { text: getText(lang, 'cancel_button'), callback_data: 'cancel_payment' }
      ]
    ]
  };
}

/**
 * Handle PayMe direct payment request
 * @param {Object} bot - Telegram bot instance
 * @param {Object} payme - PayMe payment instance
 * @param {number} chatId - Chat ID
 * @param {number} userId - User ID
 * @param {string} lang - Language code
 * @param {number} amount - Amount in UZS
 * @param {Object} session - User session data
 */
async function handlePayMeDirectPayment(bot, payme, chatId, userId, lang, amount, session) {
  const getText = require('./languages').getText;

  // Generate unique order ID
  const orderId = `conf_${userId}_${Date.now()}`;

  // Store order ID in session
  session.orderId = orderId;
  session.paymentMethod = 'payme';
  session.providerName = 'PayMe';

  // Amount in tyiyn (smallest unit)
  const amountInTyiyn = amount * 100;

  // Generate payment link
  const paymentUrl = payme.generatePaymentLink({
    amount: amountInTyiyn,
    orderId: orderId,
    description: getText(lang, 'payment_description') || 'Conference Registration',
    // Optional: Add return URL
    // returnUrl: 'https://yourdomain.com/payment-return'
  });

  // Create payment message with button
  const paymentMessage = `
${getText(lang, 'payment_instructions') || '💳 To complete your registration, please click the button below to make payment via PayMe.'}

💰 Amount: ${amount.toLocaleString()} UZS
🆔 Order ID: ${orderId}

After payment, please send the transaction ID or screenshot to confirm your registration.
  `.trim();

  // Send message with PayMe button
  await bot.sendMessage(chatId, paymentMessage, {
    reply_markup: {
      inline_keyboard: [
        [
          { text: '💳 Open PayMe Payment', url: paymentUrl }
        ],
        [
          { text: '✅ I\'ve Paid - Confirm', callback_data: 'confirm_payment' }
        ],
        [
          { text: '❌ Cancel', callback_data: 'cancel_payment' }
        ]
      ]
    },
    parse_mode: 'HTML'
  });

  console.log(`📤 PayMe direct payment link sent to user ${userId}`);
  console.log(`   Order ID: ${orderId}`);
  console.log(`   Amount: ${amount} UZS`);
}

/**
 * Handle payment confirmation from user
 * @param {Object} bot - Telegram bot instance
 * @param {Object} db - Database instance
 * @param {number} chatId - Chat ID
 * @param {number} userId - User ID
 * @param {Object} user - User object from Telegram
 * @param {string} lang - Language code
 * @param {Object} session - User session data
 * @param {number} adminUserId - Admin user ID for notifications
 */
async function handlePaymentConfirmation(bot, db, chatId, userId, user, lang, session, adminUserId) {
  const getText = require('./languages').getText;

  // Ask user for transaction ID or proof
  const confirmMessage = `
📝 Please provide payment confirmation:

1️⃣ Send your PayMe transaction ID
   OR
2️⃣ Send a screenshot of your payment

Order ID: ${session.orderId}
  `.trim();

  await bot.sendMessage(chatId, confirmMessage);

  // Set session state to waiting for confirmation
  session.awaitingPaymentProof = true;

  console.log(`⏳ Waiting for payment confirmation from user ${userId}`);
}

/**
 * Process manual payment verification
 * @param {Object} bot - Telegram bot instance
 * @param {Object} db - Database instance
 * @param {number} chatId - Chat ID
 * @param {number} userId - User ID
 * @param {Object} user - User object
 * @param {string} lang - Language code
 * @param {Object} session - User session data
 * @param {string} proof - Transaction ID or proof text
 * @param {number} adminUserId - Admin user ID
 * @param {number} amount - Payment amount
 * @param {string} currency - Currency code
 */
async function processManualPaymentVerification(bot, db, chatId, userId, user, lang, session, proof, adminUserId, amount, currency) {
  const getText = require('./languages').getText;

  // Generate transaction ID
  const transactionId = session.orderId || `manual_${userId}_${Date.now()}`;

  // Save to database
  try {
    const registrationId = db.addRegistration({
      user_id: userId,
      username: user.username || null,
      first_name: session.firstName || user.first_name || null,
      last_name: session.lastName || user.last_name || null,
      phone_number: session.phone_number || null,
      language_code: user.language_code || lang,
      payment_method: 'payme',
      transaction_id: transactionId,
      provider_payment_charge_id: proof,
      amount: amount * 100, // Store in tyiyn
      currency: currency,
      payload: `payme_direct_${session.orderId}`
    });

    console.log(`✅ Manual payment registered: ID ${registrationId}`);

    // Send confirmation to user
    const userName = session.firstName || user.first_name || 'Participant';
    const confirmationMessage = `
✅ ${getText(lang, 'payment_success', { transaction_id: transactionId })}

📋 Registration Details:
👤 Name: ${userName}${session.lastName ? ' ' + session.lastName : ''}
💳 Payment Method: PayMe (Direct)
💰 Amount: ${(amount).toLocaleString()} ${currency}
🆔 Registration ID: #${registrationId}
📅 Date: ${new Date().toLocaleString()}

⏳ Your payment is being verified. You will receive confirmation shortly.

We look forward to seeing you at the conference! 🎉
    `.trim();

    await bot.sendMessage(chatId, confirmationMessage, {
      parse_mode: 'HTML'
    });

    // Send notification to admin for manual verification
    if (adminUserId) {
      const adminMessage = `
🔔 <b>New Payment Pending Verification!</b>

👤 <b>User Info:</b>
- Name: ${session.firstName || user.first_name || 'N/A'}${session.lastName ? ' ' + session.lastName : ''}
- Username: ${user.username ? '@' + user.username : 'N/A'}
- User ID: <code>${userId}</code>
- Phone: ${session.phone_number || 'N/A'}
- Language: ${lang.toUpperCase()}

💰 <b>Payment Info:</b>
- Method: PayMe (Direct)
- Amount: ${amount.toLocaleString()} ${currency}
- Order ID: <code>${session.orderId}</code>
- Payment Proof: <code>${proof}</code>

⚠️ <b>Action Required:</b>
Please verify this payment manually and confirm with the user.

🆔 Registration ID: #${registrationId}
📅 ${new Date().toLocaleString()}
      `.trim();

      await bot.sendMessage(adminUserId, adminMessage, {
        parse_mode: 'HTML'
      });

      console.log(`📨 Admin notification sent for manual verification`);
    }

    // Clear session
    session.awaitingPaymentProof = false;

    return registrationId;
  } catch (error) {
    console.error('❌ Error processing manual payment:', error);
    await bot.sendMessage(chatId, getText(lang, 'error_occurred'));
    throw error;
  }
}

module.exports = {
  initializePayMeDirect,
  getPayMeDirectKeyboard,
  handlePayMeDirectPayment,
  handlePaymentConfirmation,
  processManualPaymentVerification
};
