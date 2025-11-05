# 🚀 Setup PayMe Direct Integration

## Quick Setup (5 Minutes)

### Step 1: Get PayMe Merchant Credentials

**Option A: From PayMe Dashboard**
1. Go to https://checkout.paycom.uz
2. Log in with your merchant account
3. Navigate to Settings → API
4. Copy your:
   - **Merchant ID** (number like `12345`)
   - **Secret Key** (long string/hash)

**Option B: Contact PayMe**
- Email: support@paycom.uz
- Phone: +998 71 200 0 500
- Ask for: "Merchant ID and Secret Key for integration"

---

### Step 2: Configure .env

```bash
# Open .env file
nano .env

# or
code .env
```

Add these lines:

```env
# Telegram Bot Token (from @BotFather)
TELEGRAM_BOT_TOKEN=1234567890:ABCdefGHIjklMNOpqrsTUVwxyz

# PayMe Credentials
PAYME_MERCHANT_ID=12345
PAYME_SECRET_KEY=your_actual_secret_key_here

# Admin User ID (get from @userinfobot)
ADMIN_USER_ID=123456789

# Conference Price
CONFERENCE_PRICE=200000
CURRENCY=UZS
```

**Replace:**
- `1234567890:ABCdefGHIjklMNOpqrsTUVwxyz` → Your real bot token
- `12345` → Your real Merchant ID
- `your_actual_secret_key_here` → Your real Secret Key
- `123456789` → Your real user ID

---

### Step 3: Install Dependencies

```bash
npm install
```

---

### Step 4: Start the Bot

```bash
npm start
```

**You should see:**
```
✅ PayMe Direct payment initialized
   Merchant ID: 12345
🤖 Telegram Conference Bot started!
💰 Conference Price: 200,000 UZS
📊 Database: ./data/registrations.db
👤 Admin User ID: 123456789
```

---

### Step 5: Test Payment Flow

**In Telegram:**
1. Find your bot
2. Send `/start`
3. Click "Забронировать билет"
4. Share your contact
5. Click "Подтвердить"
6. Click "Оплатить через PayMe"
7. You should see:
   ```
   💳 Оплата регистрации

   Для завершения регистрации нажмите кнопку ниже...

   [💳 Открыть PayMe]
   [✅ Я оплатил]
   ```

8. Click "💳 Открыть PayMe"
9. **It should open PayMe app or website**
10. Complete test payment
11. Return to bot
12. Click "✅ Я оплатил"
13. Send transaction ID
14. **You (admin) should receive notification!**

---

## ✅ Verification

### Bot is Working If:

1. ✅ Bot starts without errors
2. ✅ "PayMe Direct payment initialized" message appears
3. ✅ Payment button opens PayMe app/website
4. ✅ Users can submit payment proof
5. ✅ You receive admin notifications

### Troubleshooting

**Problem: "PayMe не настроен" error**

Solution:
```bash
# Check credentials are set
cat .env | grep PAYME_MERCHANT_ID
cat .env | grep PAYME_SECRET_KEY

# Should show your values, not "your_merchant_id_here"
```

---

**Problem: PayMe button doesn't open anything**

Solution:
- Check Merchant ID is correct
- Try clicking from mobile device
- Try different browser

---

**Problem: Not receiving admin notifications**

Solution:
```bash
# Check admin ID is set
cat .env | grep ADMIN_USER_ID

# Get your ID from @userinfobot
# Update .env
# Restart bot
```

---

## 📋 Admin Verification Process

When user submits payment proof, you'll receive:

```
🔔 Новый платеж на проверке!

👤 Информация о пользователе:
• Имя: John Doe
• Телефон: +998901234567
• User ID: 123456789

💰 Информация об оплате:
• Сумма: 200,000 UZS
• Номер заказа: conf_123456_1699999999
• Доказательство оплаты: TXN-789456123

Для проверки:
1. Войдите в панель PayMe
2. Найдите заказ: conf_123456_1699999999
3. Подтвердите получение оплаты
```

**To verify:**
1. Open https://checkout.paycom.uz
2. Search for Order ID
3. Check payment received
4. Message user: "✅ Платеж подтвержден!"

---

## 🎯 That's It!

Your bot is now using PayMe Direct integration!

**What happens:**
1. User clicks "Pay with PayMe"
2. Opens PayMe app/website
3. User pays there
4. Returns to bot
5. Sends proof
6. You verify manually

**Read more:**
- `PAYME_DIRECT_HOW_IT_WORKS.md` - Detailed explanation of payment flow
- `ADMIN_GUIDE.md` - Admin features and commands

---

## 🆘 Need Help?

**PayMe Integration Issues:**
- Contact: support@paycom.uz
- Phone: +998 71 200 0 500

**Bot Issues:**
- Check logs in terminal
- Run: `npm run test-payment`
- Read: `PAYMENT_TROUBLESHOOTING.md`

---

**Enjoy your working payment system!** 🎉
