# 🚀 QUICK SWITCH: Telegram Native → PayMe Direct

**Problem:** Telegram native payments not working?

**Solution:** Switch to direct PayMe links in 5 minutes!

---

## ⚡ Super Quick Setup

### 1. Get PayMe Credentials (2 minutes)

**Contact PayMe:**
- Email: support@paycom.uz
- Phone: +998 71 200 0 500
- Ask: "I need my Merchant ID and Secret Key"

**Or check dashboard:**
https://checkout.paycom.uz → Settings → API

---

### 2. Update .env (1 minute)

```bash
# Open .env
nano .env
```

**Add these three lines at the bottom:**

```env
PAYMENT_METHOD=payme_direct
PAYME_MERCHANT_ID=12345
PAYME_SECRET_KEY=your_actual_secret_key_here
```

Replace `12345` and `your_actual_secret_key_here` with real values from PayMe.

**Save:** Ctrl+X → Y → Enter

---

### 3. Add Code to bot.js (2 minutes)

#### Find this section (around line 10):

```javascript
const RegistrationDatabase = require('./database');
```

#### Add RIGHT AFTER it:

```javascript
// PayMe Direct Payment Integration
const PayMeDirect = require('./bot-payme-direct');
const PAYMENT_METHOD = process.env.PAYMENT_METHOD || 'telegram_native';
let paymeDirectInstance = null;

if (PAYMENT_METHOD === 'payme_direct') {
  paymeDirectInstance = PayMeDirect.initializePayMeDirect({
    merchantId: process.env.PAYME_MERCHANT_ID,
    secretKey: process.env.PAYME_SECRET_KEY,
    endpoint: process.env.PAYME_ENDPOINT || 'https://checkout.paycom.uz'
  });
}
```

#### Find the payment callback section:

Search for: `if (data.startsWith('pay_'))`

#### Add THIS CODE right after `await bot.answerCallbackQuery(query.id);`:

```javascript
    // PayMe Direct Integration
    if (paymentMethod === 'payme' && PAYMENT_METHOD === 'payme_direct' && paymeDirectInstance) {
      const session = userSessions.get(userId) || {};
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
```

#### Add payment confirmation handler:

Search for: `if (data === 'cancel_payment')`

#### Add BEFORE it:

```javascript
  // Handle payment confirmation
  if (data === 'confirm_payment') {
    const session = userSessions.get(userId) || {};
    const lang = getUserLanguage(userId);
    await bot.answerCallbackQuery(query.id);
    await PayMeDirect.handlePaymentConfirmation(
      bot, db, chatId, userId, query.from, lang, session, ADMIN_USER_ID
    );
    userSessions.set(userId, session);
    return;
  }
```

#### Add payment proof handler:

Find where messages are handled (search for: `bot.on('message'`)

#### Add this at the TOP of the message handler:

```javascript
  const session = userSessions.get(userId) || {};

  // Handle payment proof submission
  if (session.awaitingPaymentProof && msg.text && !msg.text.startsWith('/')) {
    const lang = getUserLanguage(userId);
    try {
      await PayMeDirect.processManualPaymentVerification(
        bot, db, chatId, userId, msg.from, lang, session,
        msg.text, ADMIN_USER_ID, CONFERENCE_PRICE, CURRENCY
      );
      userSessions.delete(userId);
    } catch (error) {
      console.error('Error processing payment proof:', error);
    }
    return;
  }
```

**Save the file.**

---

### 4. Restart Bot (30 seconds)

```bash
# Stop if running (Ctrl+C)
npm start
```

**You should see:**
```
✅ PayMe Direct payment initialized
🤖 Telegram Conference Bot started!
```

---

### 5. Test (1 minute)

In Telegram:
```
/start
/register
```

Click "Pay with PayMe"

**You should see:**
- Payment instructions
- Button: "💳 Open PayMe Payment"
- Button: "✅ I've Paid - Confirm"

---

## ✅ That's It!

**Total time:** ~5 minutes

**Now when users register:**
1. They click "Pay with PayMe"
2. Opens PayMe app/website
3. They pay there
4. Return to bot and click "I've Paid"
5. Send transaction ID
6. You verify and approve

---

## 🎯 Benefits

**Before (Telegram Native):**
- ❌ Provider token issues
- ❌ Complex setup
- ❌ Hard to debug
- ❌ Transaction fails with blank error

**After (Direct PayMe):**
- ✅ Simple setup (just Merchant ID + Key)
- ✅ Opens in PayMe app
- ✅ Easy to verify payments
- ✅ More control
- ✅ Better user experience

---

## 📱 User Experience

**What users see:**

1. Click "Pay with PayMe"
2. Message appears:
   ```
   💳 To complete your registration, please click the
   button below to make payment via PayMe.

   💰 Amount: 200,000 UZS
   🆔 Order ID: conf_123_1234567890

   After payment, please send the transaction ID or
   screenshot to confirm your registration.
   ```
3. Button: "💳 Open PayMe Payment" → Opens PayMe
4. User pays in PayMe app
5. User returns, clicks "✅ I've Paid - Confirm"
6. Bot asks for transaction ID
7. User sends ID or screenshot
8. Bot confirms registration
9. Admin gets notification to verify

---

## 🔧 Verification Process

**When user sends payment proof:**

**You (admin) receive:**
```
🔔 New Payment Pending Verification!

👤 User Info:
- Name: John Doe
- Username: @johndoe
- User ID: 123456789

💰 Payment Info:
- Method: PayMe (Direct)
- Amount: 200,000 UZS
- Order ID: conf_123_1234567890
- Payment Proof: TXN-789456123

⚠️ Action Required:
Please verify this payment manually.

🆔 Registration ID: #42
```

**To verify:**
1. Log in to PayMe dashboard
2. Search for Order ID: `conf_123_1234567890`
3. Check if payment received
4. If yes, message user: "✅ Payment confirmed! See you at conference!"
5. If no, message user: "❌ Payment not found. Please check and resend."

---

## 🆘 Need Help?

**Bot not starting:**
```bash
# Check configuration
cat .env | grep PAYMENT_METHOD
cat .env | grep PAYME_MERCHANT

# Should show your settings
```

**Can't get Merchant ID:**
- Contact PayMe: support@paycom.uz
- They respond within 1 business day

**Code errors:**
- Check you added code in the right places
- Make sure all brackets match
- Share error message for help

---

## 💡 Pro Tips

1. **Test with small amount first:**
   ```env
   CONFERENCE_PRICE=10000
   ```

2. **Document your verification process:**
   - Write down steps
   - Train your team
   - Create checklist

3. **Respond to users quickly:**
   - Check messages frequently
   - Verify payments within 1 hour
   - Send confirmation immediately

4. **Keep records:**
   - Screenshot payments in PayMe dashboard
   - Match Order IDs
   - Save transaction IDs

---

## 🔄 Switch Back to Telegram Native?

No problem! Just change one line:

```env
PAYMENT_METHOD=telegram_native
```

Restart bot. Done!

---

## ✨ You're Done!

**Implementation checklist:**
- ✅ Got Merchant ID and Secret Key
- ✅ Updated .env
- ✅ Added code to bot.js
- ✅ Restarted bot
- ✅ Tested payment flow
- ✅ Ready to accept payments!

**Questions?** See full guide: `PAYME_DIRECT_INTEGRATION.md`

---

**Enjoy your working payment system! 🎉**
