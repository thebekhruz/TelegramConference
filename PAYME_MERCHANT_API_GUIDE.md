# PayMe Merchant API Integration Guide

## Overview

This bot now uses the **PayMe Merchant API** for payment processing. This is a complete rewrite from the previous manual payment verification system.

### What Changed?

**Before:** Manual payment verification
- User paid via PayMe link
- User submitted payment proof (screenshot/transaction ID)
- Admin manually verified in PayMe dashboard
- Admin manually confirmed to user

**Now:** Automatic payment verification via webhooks
- User pays via PayMe link
- **PayMe automatically calls our webhook**
- Bot automatically updates database
- Bot automatically sends confirmation to user
- Bot automatically notifies admin

---

## How PayMe Merchant API Works

### Payment Flow

```
1. User clicks "Забронировать билет"
2. User shares contact information
3. User clicks "Оплатить через PayMe"
   ↓
4. Bot creates registration in database (payment_completed=FALSE)
5. Bot generates unique order_id: conf_123456_1699999999
6. Bot sends PayMe payment link
   ↓
7. User clicks link → Opens PayMe app/website
8. User completes payment in PayMe
   ↓
9. PayMe calls our webhook: CheckPerformTransaction
   → Bot verifies order exists and amount is correct

10. PayMe calls our webhook: CreateTransaction
    → Bot creates transaction record

11. PayMe calls our webhook: PerformTransaction
    → Bot updates database: payment_completed=TRUE
    → Bot sends confirmation to user
    → Bot sends notification to admin
```

### Webhook Methods

PayMe calls these methods on your webhook endpoint:

#### 1. CheckPerformTransaction
**Purpose:** Verify that the transaction can be performed

**What it does:**
- Checks if order_id exists in database
- Verifies amount matches
- Checks if order is not already paid

**Response:** `{ allow: true }` or error

---

#### 2. CreateTransaction
**Purpose:** Create a transaction in your system

**What it does:**
- Creates transaction record in memory
- Marks order as "payment in progress"
- Returns transaction details

**Response:** Transaction details with state=1 (created)

---

#### 3. PerformTransaction
**Purpose:** Complete the transaction (finalize payment)

**What it does:**
- Updates database: `payment_completed = TRUE`
- Sends confirmation message to user
- Sends notification to admin with order details
- Updates transaction state to 2 (completed)

**Response:** Transaction details with state=2 (completed)

---

#### 4. CheckTransaction
**Purpose:** Check status of a transaction

**Response:** Current transaction state

---

#### 5. CancelTransaction
**Purpose:** Cancel a transaction

**What it does:**
- Marks transaction as cancelled
- Updates database: `payment_cancelled = TRUE`
- Sets cancellation reason

**Response:** Transaction details with state=-1 (cancelled)

---

## Setup Instructions

### 1. Get PayMe Credentials

1. Go to https://checkout.paycom.uz
2. Login to your merchant account
3. Get your credentials:
   - **Merchant ID** (e.g., `12345`)
   - **Secret Key** (your authentication key)

### 2. Configure .env File

```env
# PayMe Merchant API Credentials
PAYME_MERCHANT_ID=12345
PAYME_SECRET_KEY=your_actual_secret_key_here
PAYME_ENDPOINT=https://checkout.paycom.uz

# Webhook Server Configuration
WEBHOOK_PORT=3000
WEBHOOK_PATH=/payme-webhook
```

### 3. Expose Your Webhook to the Internet

PayMe needs to call your webhook from the internet. You have two options:

#### Option A: Production (Recommended)

Deploy your bot to a server with a public domain:

```bash
# Your webhook URL will be:
https://your-domain.com/payme-webhook
```

#### Option B: Local Testing with ngrok

For testing locally:

```bash
# Install ngrok
brew install ngrok  # macOS
# or download from https://ngrok.com/

# Start ngrok tunnel
ngrok http 3000

# ngrok will give you a URL like:
# https://abc123.ngrok.io

# Your webhook URL will be:
# https://abc123.ngrok.io/payme-webhook
```

### 4. Configure Webhook in PayMe Dashboard

1. Go to https://checkout.paycom.uz
2. Navigate to Settings → Merchant API
3. Enter your webhook URL:
   - Production: `https://your-domain.com/payme-webhook`
   - Testing: `https://abc123.ngrok.io/payme-webhook`
4. Save settings

### 5. Install Dependencies

```bash
npm install
```

This will install Express (required for webhook server).

### 6. Start the Bot

```bash
npm start
```

You should see:

```
🤖 Telegram Conference Bot started!
✅ PayMe Merchant API initialized
   Merchant ID: 12345
✅ PayMe webhook server started on port 3000
   Webhook endpoint: http://localhost:3000/payme-webhook
   Health check: http://localhost:3000/health
```

---

## Testing the Integration

### 1. Test Webhook Server

```bash
# Check health endpoint
curl http://localhost:3000/health

# Should return:
# {"status":"ok","timestamp":"2025-11-07T..."}
```

### 2. Test Payment Flow

1. Send `/start` to your bot
2. Click "Забронировать билет"
3. Share contact information
4. Click "Оплатить через PayMe"
5. You'll receive a payment link
6. Click the link → Opens PayMe
7. Complete payment
8. **Within seconds**, you should receive automatic confirmation

### 3. Verify in Database

```bash
sqlite3 ./data/registrations.db

# Check registration
SELECT order_id, payment_completed, payme_transaction_id
FROM registrations
WHERE user_id = YOUR_USER_ID;

# Should show:
# - order_id: conf_123456_1699999999
# - payment_completed: 1
# - payme_transaction_id: (PayMe's transaction ID)
```

---

## Authentication

PayMe uses **HTTP Basic Authentication**:

- **Username:** `Paycom` (always this exact string)
- **Password:** Your `PAYME_SECRET_KEY`

The webhook automatically verifies this:

```javascript
Authorization: Basic [Base64("Paycom:YOUR_SECRET_KEY")]
```

If authentication fails, webhook returns:
```json
{
  "error": {
    "code": -32504,
    "message": "Insufficient privilege to perform this operation"
  }
}
```

---

## Error Handling

### Common Errors

#### Error -31050: Order not found
**Cause:** order_id doesn't exist in database
**Solution:** Ensure registration is created before generating payment link

#### Error -31051: Order already paid
**Cause:** User trying to pay for same order twice
**Solution:** This is normal - prevents double payment

#### Error -31001: Incorrect amount
**Cause:** Payment amount doesn't match order amount
**Solution:** Check CONFERENCE_PRICE matches PayMe link amount

#### Error -31003: Transaction not found
**Cause:** PayMe calling PerformTransaction without CreateTransaction first
**Solution:** This shouldn't happen - check PayMe's transaction flow

---

## Database Schema

New columns added for Merchant API:

```sql
CREATE TABLE registrations (
  -- Existing columns...
  order_id TEXT UNIQUE,               -- conf_123456_1699999999
  payme_transaction_id TEXT,          -- PayMe's internal transaction ID
  payment_in_progress BOOLEAN,        -- TRUE during payment
  payment_completed BOOLEAN,          -- TRUE after PerformTransaction
  payment_completed_at DATETIME,      -- Timestamp of completion
  payment_cancelled BOOLEAN,          -- TRUE if cancelled
  cancel_reason INTEGER               -- PayMe cancellation reason code
);
```

---

## Security Considerations

1. **Always verify authentication** - Webhook checks Basic Auth header
2. **Never expose SECRET_KEY** - Keep it in .env, never commit
3. **Use HTTPS in production** - PayMe may reject HTTP webhooks
4. **Validate order_id format** - Must match `conf_*` pattern
5. **Check amount matches** - Prevent payment amount tampering

---

## Troubleshooting

### Problem: Webhook not being called

**Solutions:**
1. Check webhook URL is correct in PayMe dashboard
2. Ensure server is publicly accessible (not localhost)
3. Verify ngrok tunnel is active if testing locally
4. Check firewall allows incoming connections on port 3000

### Problem: Authentication errors

**Solutions:**
1. Verify SECRET_KEY matches PayMe dashboard
2. Check there are no extra spaces in .env file
3. Ensure SECRET_KEY doesn't have quotes around it

### Problem: Payments not completing

**Solutions:**
1. Check webhook server logs for errors
2. Verify database has order_id entry
3. Check PayMe dashboard for transaction status
4. Ensure bot has message permissions to send to user

### Problem: "Order not found" error

**Solutions:**
1. Check registration was created in database
2. Verify order_id matches between payment link and database
3. Check database connection is working

---

## Monitoring

### Check Webhook Activity

```bash
# Monitor bot logs
npm start

# You'll see:
# [PayMe] Incoming request: CheckPerformTransaction
# [PayMe] CheckPerformTransaction for order: conf_123456_1699999999
# [PayMe] CreateTransaction: 5305e3bab097f420a62ced0b
# [PayMe] Transaction created: 5305e3bab097f420a62ced0b
# [PayMe] PerformTransaction: 5305e3bab097f420a62ced0b
# [PayMe] Transaction completed: 5305e3bab097f420a62ced0b
```

### Admin Notifications

Admin receives automatic notification with:
- User details (name, username, phone, user_id)
- Payment details (amount, order_id, PayMe transaction ID)
- Timestamp
- Current statistics

---

## Comparison: Manual vs Automatic

| Feature | Manual (Old) | Automatic (New) |
|---------|-------------|-----------------|
| User submits proof | ✅ Required | ❌ Not needed |
| Admin verification | ✅ Manual | ✅ Automatic |
| Confirmation speed | 🐌 Hours/Days | ⚡ Seconds |
| Error prone | ⚠️ Yes | ✅ No |
| Scalable | ❌ No | ✅ Yes |
| Real-time | ❌ No | ✅ Yes |

---

## API Documentation

- **Official Docs:** https://developer.help.paycom.uz/metody-merchant-api
- **PayMe Dashboard:** https://checkout.paycom.uz
- **Support:** support@paycom.uz / +998 71 200 0 500

---

## Files Modified

1. **src/payme-merchant-api.js** - New Merchant API implementation
2. **src/database.js** - Added order_id tracking and payment status methods
3. **src/bot.js** - Integrated webhook server, updated payment flow
4. **package.json** - Added Express dependency
5. **.env.example** - Updated with webhook configuration

---

## Next Steps

1. ✅ Configure .env with your PayMe credentials
2. ✅ Expose webhook to internet (production server or ngrok)
3. ✅ Configure webhook URL in PayMe dashboard
4. ✅ Test payment flow end-to-end
5. ✅ Monitor logs for any errors
6. ✅ Celebrate automatic payment verification! 🎉

---

## Support

If you encounter issues:

1. Check bot logs: `npm start`
2. Check PayMe dashboard for transaction status
3. Verify webhook URL is accessible: `curl https://your-domain.com/payme-webhook`
4. Test health endpoint: `curl http://localhost:3000/health`
5. Contact PayMe support if PayMe-side issues

---

**Last Updated:** November 7, 2025
**API Version:** Merchant API v2
**Bot Version:** 2.0.0 (Automatic Webhook Integration)
