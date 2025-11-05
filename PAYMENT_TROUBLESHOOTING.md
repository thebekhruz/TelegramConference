# PayMe Payment Troubleshooting Guide

This guide helps you debug and fix PayMe payment issues in the Telegram Conference Bot.

## 🔍 Common Issues & Solutions

### Issue 1: Payment Button Appears But Nothing Happens

**Symptoms:**
- User clicks "Pay with PayMe"
- Invoice appears
- User clicks "Pay"
- Nothing happens or error message appears

**Causes & Solutions:**

#### A. Provider Token Not Set or Incorrect

Check your `.env` file:
```bash
cat .env | grep PAYME
```

**Should show:**
```
PAYME_PROVIDER_TOKEN=284685063:TEST:YourActualTokenHere
```

**If empty or missing:**
1. Go to @BotFather in Telegram
2. Send `/mybots`
3. Select your bot
4. Click "Payments"
5. Find PayMe provider
6. Copy the provider token
7. Add to `.env` file

---

#### B. Wrong Token Format

**Correct format:**
```
PAYME_PROVIDER_TOKEN=284685063:TEST:AbCdEf123456789
```

**Wrong formats:**
```
PAYME_PROVIDER_TOKEN=your_payme_provider_token    ❌ Placeholder text
PAYME_PROVIDER_TOKEN=                              ❌ Empty
PAYME_PROVIDER_TOKEN=123456789                     ❌ Missing prefix
```

---

#### C. Using TEST Token in Production (or vice versa)

**For Testing:**
```
PAYME_PROVIDER_TOKEN=284685063:TEST:xxxxx
```

**For Production:**
```
PAYME_PROVIDER_TOKEN=284685063:LIVE:xxxxx
```

Make sure you're using the right one!

---

### Issue 2: "Provider Token Not Configured" Error

**Error message:**
> ❌ PayMe provider token is not configured. Please contact the administrator.

**Solution:**

1. **Check .env file exists:**
   ```bash
   ls -la .env
   ```

2. **Check token is set:**
   ```bash
   cat .env | grep PAYME_PROVIDER_TOKEN
   ```

3. **Restart the bot:**
   ```bash
   # Stop the bot (Ctrl+C)
   # Then start again
   npm start
   ```

4. **Verify token loaded:**
   When bot starts, check console output. You should NOT see any error about env variables.

---

### Issue 3: Invoice Doesn't Appear

**Symptoms:**
- User clicks "Pay with PayMe"
- No invoice form appears
- Or error in bot console

**Check bot console logs:**
```bash
# If running in terminal, check output
# Look for errors like:
# "Error sending invoice: ..."
```

**Common causes:**

#### A. Bot Token Invalid
```bash
# Check bot token in .env
cat .env | grep TELEGRAM_BOT_TOKEN
```

#### B. Internet Connection Issue
```bash
# Test internet
ping telegram.org
```

#### C. Invalid Amount Format

The bot uses: `CONFERENCE_PRICE * 100`

For 200,000 UZS:
- `200000 * 100 = 20,000,000` (in tyiyn - correct!)

If you changed the price, make sure it's a number:
```bash
cat .env | grep CONFERENCE_PRICE
# Should be: CONFERENCE_PRICE=200000
# NOT: CONFERENCE_PRICE=200,000 (comma breaks it!)
```

---

### Issue 4: Payment Provider Not Connected to Bot

**You need to connect PayMe to your bot via @BotFather:**

#### Step 1: Open @BotFather

1. Search for `@BotFather` in Telegram
2. Send `/mybots`
3. Select your bot

#### Step 2: Connect Payment Provider

1. Click **"Payments"** button
2. You should see a list of connected providers
3. Look for **PayMe** or **Paycom**

**If PayMe is NOT listed:**

1. Click **"Add Payment Provider"** or similar
2. Look for **PayMe** or **Paycom** in the list
3. If not in list, select **"Other"** or **"Custom Provider"**

#### Step 3: Enter PayMe Credentials

You'll need from PayMe merchant account:
- Merchant ID
- Secret Key / API Key
- Other credentials

**Don't have these?**
- Contact PayMe: support@paycom.uz
- Or check your PayMe merchant dashboard: https://checkout.paycom.uz

#### Step 4: Get Provider Token

After connecting, @BotFather will give you a **Provider Token** like:
```
284685063:TEST:AbCdEf123456789
```

Copy this EXACT token to your `.env` file.

---

### Issue 5: Currency Issues (UZS)

**Check your .env:**
```bash
cat .env | grep CURRENCY
```

**Should be:**
```
CURRENCY=UZS
```

**NOT:**
- `CURRENCY=uzs` ❌ (lowercase)
- `CURRENCY=sum` ❌ (wrong code)
- `CURRENCY=USD` ❌ (wrong currency)

---

### Issue 6: Bot Not Restarted After Config Changes

**After changing .env, you MUST restart:**

```bash
# Stop bot
Ctrl+C

# Start bot
npm start
```

Or if using PM2:
```bash
pm2 restart conference-bot
```

---

## 🧪 Test Payment Flow Step-by-Step

### 1. Start Bot with Debug Logging

```bash
npm start
```

Watch the console output carefully.

### 2. Test Registration

In Telegram:
```
/start
/register
```

Click "Pay with PayMe"

### 3. Check Console Output

**You should see:**
```
🤖 Telegram Conference Bot started!
💰 Conference Price: 200000 UZS
📊 Database: ./data/registrations.db
```

**If you see errors, note them down.**

### 4. Test Invoice Creation

When you click "Pay with PayMe", check console for:
- "Error sending invoice: ..." ❌ (There's a problem)
- No error = good! ✅

### 5. Complete Test Payment

Use test card:
```
Card: 8600 4954 7331 6478
Expiry: 12/25
CVV: 123
SMS Code: 666666
```

---

## 🔧 Manual Verification Checklist

Run through this checklist:

```bash
# 1. Check .env file exists
[ -f .env ] && echo "✅ .env exists" || echo "❌ .env missing"

# 2. Check PayMe token is set
grep "PAYME_PROVIDER_TOKEN=" .env && echo "✅ Token line exists" || echo "❌ Token not found"

# 3. Check token is not placeholder
grep "PAYME_PROVIDER_TOKEN=your_" .env && echo "❌ Using placeholder" || echo "✅ Real token"

# 4. Check currency
grep "CURRENCY=UZS" .env && echo "✅ Currency correct" || echo "❌ Currency wrong"

# 5. Check price is number
grep "CONFERENCE_PRICE=200000" .env && echo "✅ Price correct" || echo "⚠️ Price different"

# 6. Check bot token exists
grep "TELEGRAM_BOT_TOKEN=" .env | grep -v "your_bot_token" && echo "✅ Bot token set" || echo "❌ Bot token missing"
```

---

## 🐛 Debug Mode - Add Extra Logging

To see what's happening, let's add debug logging:

### Create a Test Script

Save this as `test-payment.js`:

```javascript
require('dotenv').config();

console.log('=== PAYMENT CONFIGURATION TEST ===\n');

// Check environment variables
console.log('1. Bot Token:', process.env.TELEGRAM_BOT_TOKEN ? '✅ Set' : '❌ NOT SET');
console.log('2. PayMe Token:', process.env.PAYME_PROVIDER_TOKEN ? '✅ Set' : '❌ NOT SET');
console.log('3. Conference Price:', process.env.CONFERENCE_PRICE || '200000 (default)');
console.log('4. Currency:', process.env.CURRENCY || 'UZS (default)');
console.log('5. Admin User ID:', process.env.ADMIN_USER_ID ? '✅ Set' : '⚠️ Not set (optional)');

console.log('\n=== PAYMENT CALCULATION ===\n');

const price = parseInt(process.env.CONFERENCE_PRICE) || 200000;
const amountInTyiyn = price * 100;

console.log(`Price in UZS: ${price.toLocaleString()}`);
console.log(`Amount in tyiyn (smallest unit): ${amountInTyiyn.toLocaleString()}`);
console.log(`This is correct: ${amountInTyiyn === 20000000 ? '✅ YES' : '❌ NO (should be 20,000,000)'}`);

console.log('\n=== PROVIDER TOKEN CHECK ===\n');

if (process.env.PAYME_PROVIDER_TOKEN) {
  const token = process.env.PAYME_PROVIDER_TOKEN;

  if (token.includes('your_') || token.includes('example') || token === '') {
    console.log('❌ Using placeholder token! Get real token from @BotFather');
  } else if (token.includes(':TEST:')) {
    console.log('✅ Using TEST mode token (for development)');
  } else if (token.includes(':LIVE:')) {
    console.log('✅ Using LIVE mode token (for production)');
  } else {
    console.log('⚠️ Token format unusual. Check with @BotFather');
  }

  console.log(`Token length: ${token.length} characters`);
} else {
  console.log('❌ PayMe provider token is NOT set!');
  console.log('\nTo fix:');
  console.log('1. Go to @BotFather in Telegram');
  console.log('2. Send /mybots → Select your bot → Payments');
  console.log('3. Connect PayMe provider');
  console.log('4. Copy provider token');
  console.log('5. Add to .env: PAYME_PROVIDER_TOKEN=<token>');
}

console.log('\n=== END TEST ===\n');
```

Run it:
```bash
node test-payment.js
```

---

## 📞 Still Not Working? Collect This Info

If payments still don't work, gather this information:

### 1. Configuration Info
```bash
# Run this and share output (token will be hidden)
echo "Bot Token: $(grep TELEGRAM_BOT_TOKEN .env | sed 's/=.*/= [HIDDEN]/')"
echo "PayMe Token: $(grep PAYME_PROVIDER_TOKEN .env | sed 's/=.*/= [HIDDEN]/')"
echo "Currency: $(grep CURRENCY .env)"
echo "Price: $(grep CONFERENCE_PRICE .env)"
```

### 2. Bot Console Output
Copy the full output when you start the bot.

### 3. Error Messages
- What error do you see in Telegram?
- What error shows in bot console?

### 4. Payment Flow
- Can you click "Register"? Yes/No
- Can you click "Pay with PayMe"? Yes/No
- Does invoice form appear? Yes/No
- What happens when you click "Pay"?

### 5. BotFather Connection
- Is PayMe listed in @BotFather → Payments? Yes/No
- What's the status shown for PayMe?

---

## ✅ Quick Fix Checklist

Try these in order:

1. **Check token is set:**
   ```bash
   grep PAYME_PROVIDER_TOKEN .env
   ```

2. **Verify not placeholder:**
   Should NOT contain "your_" or "example"

3. **Restart bot:**
   ```bash
   npm start
   ```

4. **Test payment flow:**
   ```
   /start → /register → Pay with PayMe
   ```

5. **Check console for errors:**
   Look for "Error sending invoice"

6. **Try test card:**
   ```
   8600 4954 7331 6478
   Expiry: 12/25
   SMS: 666666
   ```

---

## 🆘 Get Help

If still not working, contact:

**PayMe Support:**
- Email: support@paycom.uz
- Phone: +998 71 200 0 500
- Say: "I'm integrating PayMe with Telegram bot, payments not working"

**Telegram Bot Support:**
- Check: https://core.telegram.org/bots/payments
- Telegram Support: @BotSupport

**Provide them:**
- Your bot username
- Merchant ID
- Error messages
- That you're using Telegram Payments API

---

## 📚 Additional Resources

- Telegram Payments API: https://core.telegram.org/bots/payments
- PayMe Developer Docs: https://developer.paycom.uz
- PayMe Merchant Dashboard: https://checkout.paycom.uz

---

## 🎯 Most Common Solution

**90% of the time, the issue is:**

```bash
# Your .env has placeholder text:
PAYME_PROVIDER_TOKEN=your_payme_provider_token

# Fix: Replace with REAL token from @BotFather:
PAYME_PROVIDER_TOKEN=284685063:TEST:AbCdEf123456789XyZ

# Then restart:
npm start
```

Try this first! 🚀
