# PayMe Direct Integration Guide

This guide shows you how to redirect users to PayMe app/website instead of using Telegram's native payment interface.

## ✅ Benefits of Direct PayMe Integration

**Advantages:**
- ✅ No need for provider token from @BotFather
- ✅ Simpler setup - just Merchant ID and Secret Key
- ✅ Users can use full PayMe app features
- ✅ Direct integration with PayMe
- ✅ Better error handling
- ✅ More control over payment flow
- ✅ Works even if Telegram native payments have issues

**Payment Flow:**
1. User clicks "Register"
2. Bot generates PayMe payment link
3. User clicks button → Opens PayMe app/website
4. User completes payment in PayMe
5. User confirms payment in bot
6. Admin verifies and approves registration

---

## 🚀 Quick Setup (5 Minutes)

### Step 1: Get PayMe Merchant Credentials

You need two things from PayMe:

1. **Merchant ID** - Your unique merchant identifier
2. **Secret Key** - API key for authentication

**Where to get them:**

#### Option A: PayMe Merchant Dashboard
1. Go to https://checkout.paycom.uz
2. Log in with your merchant credentials
3. Navigate to **Settings** → **API Settings**
4. Copy your **Merchant ID** and **Secret Key**

#### Option B: Contact PayMe Support
- Email: support@paycom.uz
- Phone: +998 71 200 0 500
- Ask for: "My Merchant ID and API Secret Key for integration"

---

### Step 2: Update .env File

```bash
# Open .env
nano .env

# or
code .env
```

Add these lines:

```env
# Choose payment method
PAYMENT_METHOD=payme_direct

# PayMe Direct Integration
PAYME_MERCHANT_ID=12345
PAYME_SECRET_KEY=your_secret_key_here
PAYME_ENDPOINT=https://checkout.paycom.uz
```

**Replace:**
- `12345` with your actual Merchant ID
- `your_secret_key_here` with your actual Secret Key

---

### Step 3: Add Direct Payment Support to Bot

I've already created the modules for you! Just add this code to your `src/bot.js`:

#### At the top (after other requires):

```javascript
// Add after: const RegistrationDatabase = require('./database');

// PayMe Direct Integration
const PayMeDirect = require('./bot-payme-direct');
const PayMePayment = require('./payme-payment');

// Initialize PayMe Direct (if configured)
const PAYMENT_METHOD = process.env.PAYMENT_METHOD || 'telegram_native';
let paymeDirectInstance = null;

if (PAYMENT_METHOD === 'payme_direct') {
  paymeDirectInstance = PayMeDirect.initializePayMeDirect({
    merchantId: process.env.PAYME_MERCHANT_ID,
    secretKey: process.env.PAYME_SECRET_KEY,
    endpoint: process.env.PAYME_ENDPOINT
  });
}
```

#### Modify the payment callback handler:

Find this section in your `bot.js`:

```javascript
// Handle callback queries
bot.on('callback_query', async (query) => {
  // ... existing code ...

  // Payment method selection
  if (data.startsWith('pay_')) {
    const lang = getUserLanguage(userId);
    const paymentMethod = data.replace('pay_', '');

    await bot.answerCallbackQuery(query.id);

    // ADD THIS: Check if using direct PayMe
    if (paymentMethod === 'payme' && PAYMENT_METHOD === 'payme_direct') {
      // Use direct PayMe payment
      await PayMeDirect.handlePayMeDirectPayment(
        bot,
        paymeDirectInstance,
        chatId,
        userId,
        lang,
        CONFERENCE_PRICE,
        session
      );
      userSessions.set(userId, session);
      return;
    }

    // Otherwise use existing Telegram native payment code
    // ... rest of existing payment code ...
  }

  // ADD THIS: Handle payment confirmation
  if (data === 'confirm_payment') {
    const session = userSessions.get(userId) || {};
    const lang = getUserLanguage(userId);

    await bot.answerCallbackQuery(query.id);
    await PayMeDirect.handlePaymentConfirmation(
      bot,
      db,
      chatId,
      userId,
      query.from,
      lang,
      session,
      ADMIN_USER_ID
    );
    userSessions.set(userId, session);
    return;
  }
});
```

#### Add message handler for payment proof:

```javascript
// Add this in your message handlers section:

// Handle payment proof submission
bot.on('message', async (msg) => {
  const chatId = msg.chat.id;
  const userId = msg.from.id;
  const session = userSessions.get(userId) || {};

  // Check if user is submitting payment proof
  if (session.awaitingPaymentProof && msg.text) {
    const lang = getUserLanguage(userId);

    try {
      await PayMeDirect.processManualPaymentVerification(
        bot,
        db,
        chatId,
        userId,
        msg.from,
        lang,
        session,
        msg.text, // Transaction ID or proof
        ADMIN_USER_ID,
        CONFERENCE_PRICE,
        CURRENCY
      );

      userSessions.delete(userId);
    } catch (error) {
      console.error('Error processing payment proof:', error);
    }
    return;
  }

  // ... rest of your existing message handlers ...
});
```

---

### Step 4: Restart Bot

```bash
npm start
```

You should see:

```
✅ PayMe Direct payment initialized
🤖 Telegram Conference Bot started!
💰 Conference Price: 200000 UZS
```

---

## 📱 How It Works for Users

### User Experience:

1. **User sends `/start` to bot**
   - Bot greets user in selected language

2. **User sends `/register`**
   - Bot shows registration options

3. **User clicks "Pay with PayMe"**
   - Bot generates unique payment link
   - Shows button: "💳 Open PayMe Payment"

4. **User clicks the button**
   - **If PayMe app installed**: Opens in app
   - **If not installed**: Opens PayMe website
   - User completes payment in PayMe

5. **After payment, user returns to bot**
   - Clicks "✅ I've Paid - Confirm"
   - Bot asks for transaction ID or screenshot

6. **User sends proof**
   - Bot registers them
   - Admin gets notification to verify
   - User receives confirmation

---

## 🎨 Customization Options

### Option 1: Simple Payment Link (Current Implementation)

**User Flow:**
- Click button → PayMe opens → Pay → Return to bot → Confirm

**Best for:**
- Manual verification
- Small conferences
- Testing

---

### Option 2: Automatic Verification (Advanced)

To add automatic payment verification:

1. **Set up webhook endpoint** to receive PayMe callbacks
2. **Implement PayMe API integration** for checking payment status
3. **Automatic registration** after payment confirmed

**Requires:**
- A server with public URL (for webhooks)
- PayMe API integration (see PayMe docs)

I can help you implement this if needed!

---

## 🔧 Configuration Options

### Switch Between Payment Methods

In `.env`:

```env
# Use Telegram native payments
PAYMENT_METHOD=telegram_native

# Use direct PayMe links
PAYMENT_METHOD=payme_direct
```

No code changes needed - just change the config!

---

### Customize Payment Messages

Edit `src/languages.js` to add custom messages:

```javascript
en: {
  // Add these:
  payment_instructions: "💳 To complete your registration, click the button below to pay via PayMe.",
  payment_pending: "⏳ Your payment is pending verification.",
  // ... other translations
}
```

---

## 🐛 Troubleshooting

### Issue: Button doesn't appear

**Check:**
```bash
cat .env | grep PAYMENT_METHOD
# Should show: PAYMENT_METHOD=payme_direct
```

**Fix:**
```bash
echo "PAYMENT_METHOD=payme_direct" >> .env
npm start
```

---

### Issue: PayMe link doesn't work

**Check Merchant ID:**
```bash
cat .env | grep PAYME_MERCHANT_ID
```

**Should be a number like:**
```
PAYME_MERCHANT_ID=12345
```

**NOT:**
```
PAYME_MERCHANT_ID=your_merchant_id   ❌
```

Get real Merchant ID from PayMe dashboard.

---

### Issue: Secret Key error

**Check:**
```bash
cat .env | grep PAYME_SECRET_KEY | wc -c
```

Should be more than 20 characters.

**If using placeholder**, get real key from PayMe dashboard.

---

## 📊 Admin Verification Workflow

When user submits payment proof:

1. **Admin receives notification:**
   ```
   🔔 New Payment Pending Verification!

   👤 User Info:
   - Name: John Doe
   - Username: @johndoe
   - Phone: +998901234567

   💰 Payment Info:
   - Amount: 200,000 UZS
   - Order ID: conf_123_1234567890
   - Payment Proof: TXN-789456123

   ⚠️ Action Required:
   Please verify this payment manually.
   ```

2. **Admin verifies payment:**
   - Log in to PayMe merchant dashboard
   - Search for Order ID or Transaction ID
   - Confirm payment received

3. **Admin confirms to user:**
   - Message user directly
   - Or use admin commands (can be added)

---

## 🎯 Comparison: Native vs Direct

| Feature | Telegram Native | PayMe Direct |
|---------|----------------|--------------|
| Setup | Complex (provider token) | Simple (Merchant ID + Key) |
| User Experience | All in Telegram | Opens PayMe app |
| Verification | Automatic | Manual or webhook |
| Troubleshooting | Difficult | Easier |
| Payment Features | Limited | Full PayMe features |
| Best For | Large scale | Getting started, flexibility |

---

## 📞 Support

**Need help?**

1. **PayMe Integration Issues:**
   - Email: support@paycom.uz
   - Phone: +998 71 200 0 500

2. **Bot Configuration:**
   - Check logs: Look at console output
   - Test command: `npm run test-payment`
   - Read: PAYMENT_TROUBLESHOOTING.md

3. **Want Automatic Verification?**
   - Let me know and I can help implement PayMe webhooks

---

## ✨ Next Steps

After setting up direct payments:

1. **Test the flow:**
   ```
   /start → /register → Pay with PayMe → Confirm
   ```

2. **Test with small amount:**
   ```
   CONFERENCE_PRICE=10000
   ```

3. **Set up admin verification workflow:**
   - Document your process
   - Train admins on verification

4. **Go live:**
   - Set real price
   - Announce to users
   - Monitor first few payments

---

## 🚀 Quick Start Summary

```bash
# 1. Get credentials from PayMe
# Merchant ID and Secret Key

# 2. Configure .env
echo "PAYMENT_METHOD=payme_direct" >> .env
echo "PAYME_MERCHANT_ID=your_merchant_id" >> .env
echo "PAYME_SECRET_KEY=your_secret_key" >> .env

# 3. Add code to bot.js (see Step 3 above)

# 4. Restart
npm start

# 5. Test
# In Telegram: /start → /register → Pay with PayMe
```

---

**Ready to implement? The code modules are already created:**
- ✅ `src/payme-payment.js` - PayMe API wrapper
- ✅ `src/bot-payme-direct.js` - Bot integration functions

**Just follow Step 3 above to integrate them!** 🎉
