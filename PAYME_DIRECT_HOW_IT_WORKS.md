# 🔍 How PayMe Direct Payment Verification Works

## Overview

The bot now uses **PayMe Direct Integration** instead of Telegram's native payment system. This means payments happen **outside Telegram** in the PayMe app/website, and verification is done **manually** by you (the admin).

---

## 📱 Complete User Flow (Step by Step)

### Step 1: User Starts Registration
```
User sends: /start
Bot shows: Welcome message with menu
```

### Step 2: User Clicks "Book Ticket" (Забронировать билет)
```
Bot asks: Share your contact information
User: Shares phone number
Bot: Saves contact info
```

### Step 3: User Confirms Contact
```
Bot asks: Confirm your information?
User clicks: "✅ Подтвердить" (Confirm)
Bot: Shows payment options
```

### Step 4: User Selects Payment Method
```
Bot shows: "Pay with PayMe" button
User clicks: "💳 Оплатить через PayMe"
```

### Step 5: Bot Generates Payment Link
```
Bot generates: Unique Order ID (e.g., conf_123456_1699999999)
Bot creates: PayMe payment link with order ID
Bot sends message:
  💳 Оплата регистрации

  Для завершения регистрации нажмите кнопку ниже для оплаты через PayMe.

  💰 Сумма: 200,000 UZS
  🆔 Номер заказа: conf_123456_1699999999

  [💳 Открыть PayMe] button
  [✅ Я оплатил] button
```

### Step 6: User Pays in PayMe
```
User clicks: "💳 Открыть PayMe" button
Opens: PayMe app (if installed) OR PayMe website
User: Completes payment in PayMe
PayMe: Processes payment
User: Returns to Telegram bot
```

### Step 7: User Confirms Payment
```
User clicks: "✅ Я оплатил" (I've Paid)
Bot asks: "Send transaction ID or screenshot"
```

### Step 8: User Sends Proof
```
User sends: Transaction ID (text) OR Screenshot (photo)
Bot: Receives proof
Bot: Saves to database with status "pending verification"
```

### Step 9: Bot Confirms Receipt
```
Bot sends to user:
  ✅ Платеж получен!

  📋 Детали регистрации:
  👤 Имя: John Doe
  📞 Телефон: +998901234567
  💳 Способ оплаты: PayMe (Direct)
  💰 Сумма: 200,000 UZS
  🆔 ID регистрации: #42
  🆔 Номер заказа: conf_123456_1699999999

  ⏳ Ваш платеж проверяется администратором.
  Вы получите окончательное подтверждение в ближайшее время.
```

### Step 10: Admin Gets Notification
```
You (admin) receive:
  🔔 Новый платеж на проверке!

  👤 Информация о пользователе:
  • Имя: John Doe
  • Username: @johndoe
  • Телефон: +998901234567
  • User ID: 123456789

  💰 Информация об оплате:
  • Способ: PayMe (Direct)
  • Сумма: 200,000 UZS
  • Номер заказа: conf_123456_1699999999
  • Доказательство оплаты: TXN-789456123

  ⚠️ Требуется действие:
  Пожалуйста, проверьте этот платеж вручную в панели PayMe.

  🆔 ID регистрации: #42

  Для проверки:
  1. Войдите в панель PayMe: https://checkout.paycom.uz
  2. Найдите заказ: conf_123456_1699999999
  3. Подтвердите получение оплаты
  4. Свяжитесь с пользователем для подтверждения
```

---

## 🔍 How the Bot "Sees" Payment Went Through

### Current Implementation: Manual Verification

**The bot does NOT automatically detect payment!**

Instead, here's what happens:

1. **User submits proof** (transaction ID or screenshot)
2. **Bot immediately registers them** in database
3. **Bot marks registration as "pending verification"**
4. **You (admin) receive notification**
5. **You manually verify** payment in PayMe dashboard
6. **You manually confirm** to user

### Why Manual Verification?

**Advantages:**
- ✅ No complex API integration needed
- ✅ Works immediately (no PayMe API approval needed)
- ✅ You have full control
- ✅ Can handle edge cases (refunds, partial payments, etc.)
- ✅ Simpler to debug

**Disadvantages:**
- ⚠️ Requires your manual action
- ⚠️ Not instant confirmation
- ⚠️ Can't scale to thousands of users

---

## 🤖 Future: Automatic Verification (Optional)

If you want automatic verification, you can implement PayMe webhooks:

### How Automatic Verification Would Work:

1. **User pays in PayMe**
2. **PayMe sends webhook** to your server
3. **Bot receives notification** from PayMe API
4. **Bot verifies** payment automatically
5. **Bot updates** registration status
6. **Bot sends confirmation** to user

### What You'd Need:

1. **Public server** with HTTPS
2. **PayMe webhook URL** configured
3. **PayMe API integration**
4. **Webhook handler** in bot code

### Implementation Steps (if you want this):

1. Set up server with public URL
2. Configure webhook in PayMe dashboard
3. Add webhook handler to bot
4. Test with PayMe sandbox
5. Go live

**Note:** This is more complex and requires PayMe approval. The current manual system works great for most cases!

---

## 💾 Database Storage

### What Gets Saved:

When user submits payment proof:

```javascript
{
  user_id: 123456789,
  username: '@johndoe',
  first_name: 'John',
  last_name: 'Doe',
  phone_number: '+998901234567',
  language_code: 'ru',
  payment_method: 'payme',
  transaction_id: 'conf_123456_1699999999',
  provider_payment_charge_id: 'TXN-789456123', // User's proof
  amount: 20000000, // 200,000 UZS in tyiyn
  currency: 'UZS',
  payload: 'payme_direct_conf_123456_1699999999',
  registration_date: '2025-01-15 10:30:00',
  status: 'completed' // (marked as completed, but pending your manual verification)
}
```

### Access Registration Data:

```bash
# View all registrations
sqlite3 data/registrations.db "SELECT * FROM registrations;"

# View specific registration by Order ID
sqlite3 data/registrations.db "SELECT * FROM registrations WHERE transaction_id = 'conf_123456_1699999999';"

# Count pending verifications
sqlite3 data/registrations.db "SELECT COUNT(*) FROM registrations WHERE payment_method = 'payme';"
```

---

## 🔐 Security Considerations

### Payment Proof Validation:

**Current:** Bot accepts any text/photo as proof

**You should:**
1. Verify proof matches Order ID
2. Check amount matches
3. Confirm payment received in PayMe dashboard
4. Watch for duplicate proofs

### Preventing Fraud:

1. **Always verify in PayMe dashboard**
2. **Match Order ID** to transaction
3. **Check user hasn't registered** multiple times
4. **Keep records** of verifications

### Handling Issues:

**User sends fake proof:**
- Check PayMe dashboard
- No payment found → Message user
- Request valid proof or refund

**Duplicate registration:**
- Check database: `SELECT * FROM registrations WHERE user_id = 123456789`
- If already registered → Inform user

**Payment mismatch:**
- Check amount in PayMe
- If less than required → Request additional payment
- If more → Offer refund or credit

---

## 📊 Verification Workflow (For You as Admin)

### Daily Verification Process:

**Morning Routine:**
1. Check bot for overnight registrations
2. Open PayMe dashboard
3. Verify each payment
4. Confirm to users

### Per Registration:

```
1. Receive notification from bot
2. Note Order ID: conf_123456_1699999999
3. Open PayMe: https://checkout.paycom.uz
4. Search for Order ID
5. Verify:
   ✓ Payment received
   ✓ Amount correct (200,000 UZS)
   ✓ Status: Completed
6. Message user: "✅ Платеж подтвержден! Ждем вас на конференции!"
```

### If Payment Not Found:

```
1. Check Order ID is correct
2. Check user's proof again
3. Contact user:
   "⚠️ Платеж не найден. Пожалуйста, проверьте и отправьте правильный ID транзакции."
4. Wait for user to resend proof
5. Verify again
```

### Batch Verification:

If many registrations:

```bash
# Export pending verifications
npm run attendance:csv

# Open in Excel
# Sort by registration date
# Verify in PayMe bulk
# Mark as verified in spreadsheet
# Message users in batch
```

---

## 🚨 Common Issues & Solutions

### Issue 1: User says they paid but you can't find it

**Possible causes:**
- Wrong Order ID
- Payment still processing
- User used different payment method
- Technical error

**Solution:**
1. Ask user for exact transaction ID from PayMe
2. Ask for screenshot
3. Check PayMe dashboard thoroughly
4. If still not found, ask user to try again

---

### Issue 2: User sends screenshot of someone else's payment

**Detection:**
- Amount doesn't match
- Order ID doesn't match
- Date is old

**Solution:**
1. Reject proof
2. Ask for their own transaction
3. Explain they need to pay themselves

---

### Issue 3: Multiple users send same proof

**Detection:**
- Same transaction ID appears twice in database

**Solution:**
```sql
-- Find duplicates
SELECT provider_payment_charge_id, COUNT(*)
FROM registrations
GROUP BY provider_payment_charge_id
HAVING COUNT(*) > 1;
```
- Verify in PayMe (should be only one payment)
- Contact users
- Refund duplicate or reject

---

## ✅ Quick Reference

### For Users:
1. Click "Book Ticket"
2. Share contact
3. Click "Pay with PayMe"
4. Open PayMe and pay
5. Return to bot
6. Click "I've Paid"
7. Send transaction ID
8. Wait for confirmation

### For You (Admin):
1. Receive notification
2. Check PayMe dashboard
3. Verify payment
4. Confirm to user

### Database Check:
```bash
# Recent registrations
npm run attendance

# Export to CSV
npm run attendance:csv

# Search specific user
npm run search "John Doe"

# View stats
# In bot: /stats
```

---

## 📞 Need Automatic Verification?

If you want to implement automatic PayMe webhooks, I can help with:
1. Setting up webhook endpoint
2. Implementing PayMe API integration
3. Automatic status updates
4. Real-time confirmations

Just let me know!

---

## 🎯 Summary

**How bot "sees" payment:**
- It doesn't! You tell it by verifying manually
- User submits proof → Bot saves to DB → You verify → You confirm

**Why this way:**
- Simple to implement
- Works immediately
- No API complexity
- Full control

**For most conferences this is perfect!**

If you expect hundreds of registrations per hour, then consider automatic verification. Otherwise, manual verification works great! 🚀
