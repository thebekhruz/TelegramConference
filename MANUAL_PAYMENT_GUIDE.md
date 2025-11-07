# Manual Payment System - Setup Guide

## Overview

This bot uses a **fully manual payment confirmation system**. No APIs, no webhooks, no complexity!

## How It Works

```
1. User registers and shares contact info
   ↓
2. Bot gives PayMe payment instructions
   ↓
3. User opens PayMe app and makes transfer MANUALLY
   - Sends money to your PayMe account
   - Writes in comment: "Conference 2025 - [Their Name]"
   ↓
4. User takes screenshot and sends to bot
   ↓
5. Bot sends screenshot to BOTH admins:
   - Main Admin (You)
   - Finance Department Admin
   ↓
6. BOTH admins must click "✅ Подтвердить"
   ↓
7. Bot sends confirmation ticket to user
   ✅ User shows ticket at conference gate
```

## Setup Instructions

### 1. Configure .env File

```bash
# Copy example
cp .env.example .env

# Edit with your values
nano .env
```

**Required settings:**

```env
# Your bot token from @BotFather
TELEGRAM_BOT_TOKEN=123456:ABC-DEF...

# YOUR PayMe account (where users will send money)
PAYME_ACCOUNT_NUMBER=+998901234567
# Or: 1234-5678-9012-3456 (card number)
PAYME_ACCOUNT_NAME=Oxbridge International School

# Conference price
CONFERENCE_PRICE=200000
CURRENCY=UZS

# Get your user ID: Send /start to @userinfobot
ADMIN_USER_ID=123456789
FINANCE_ADMIN_USER_ID=987654321
```

### 2. Get Admin User IDs

**How to get Telegram user ID:**

1. Open Telegram
2. Search for bot: `@userinfobot`
3. Send `/start` to the bot
4. It will reply with your user ID (number like: 123456789)
5. Do this for both admins
6. Put both IDs in .env file

### 3. Install Dependencies

```bash
npm install
```

### 4. Start the Bot

```bash
npm start
```

You should see:

```
🤖 Telegram Conference Bot started! (MANUAL PAYMENT MODE)
💰 Conference Price: 200000 UZS
📊 Database: ./data/registrations.db
👤 Main Admin: 123456789
💼 Finance Admin: 987654321
💳 PayMe Account: +998901234567

📝 Manual payment flow:
   1. User registers → Gets payment instructions
   2. User pays manually → Uploads screenshot
   3. Both admins confirm → User gets ticket
```

## Testing

### 1. Test User Registration

1. Open your bot in Telegram
2. Send `/start`
3. Click "Забронировать билет"
4. Share contact
5. Click "Подтвердить"

You should receive payment instructions like:

```
💳 Инструкция по оплате

1️⃣ Откройте приложение PayMe

2️⃣ Сделайте перевод на счет:
   • Счет: +998901234567
   • Получатель: Oxbridge International School
   • Сумма: 200,000 UZS

3️⃣ В комментарии укажите:
   "Conference 2025 - [Ваше ФИО]"

4️⃣ После оплаты сделайте скриншот

5️⃣ Отправьте скриншот в этот чат
```

### 2. Test Screenshot Upload

1. Take any screenshot (for testing)
2. Send it to the bot
3. Bot should reply: "✅ Скриншот получен!"

### 3. Test Admin Confirmation

**Both admins will receive:**
- Screenshot from user
- User details (name, phone, username)
- Two buttons: "✅ Подтвердить" and "❌ Отклонить"

**What happens:**

- **First admin clicks "Подтвердить"** → Shows "⏳ Waiting for [other admin]"
- **Second admin clicks "Подтвердить"** → ✅ Ticket sent to user!

**User receives confirmation ticket:**

```
🎫 БИЛЕТ НА КОНФЕРЕНЦИЮ

╔════════════════════════════╗
   InspireEd Tashkent 2025
╚════════════════════════════╝

🆔 Номер билета: CONF2025-0001

👤 Участник: Иван Иванов
📞 Телефон: +998901234567
💰 Оплата: 200,000 UZS
✅ Статус: ПОДТВЕРЖДЕНО

⚠️ ВАЖНО:
• Покажите этот билет на входе
• Приходите за 30 минут до начала
```

## Admin Commands

```bash
/stats    # Show registration statistics
```

## Payment Confirmation Flow

### Scenario 1: Both Admins Approve ✅

```
User sends screenshot
  ↓
Main Admin: Clicks "Подтвердить" ✓
Finance Admin: Clicks "Подтвердить" ✓
  ↓
✅ Ticket sent to user automatically!
```

### Scenario 2: One Admin Rejects ❌

```
User sends screenshot
  ↓
Main Admin: Clicks "Подтвердить" ✓
Finance Admin: Clicks "Отклонить" ✗
  ↓
❌ Registration rejected
User notified: "Платеж отклонен"
```

### Scenario 3: Only One Admin Confirms

```
User sends screenshot
  ↓
Main Admin: Clicks "Подтвердить" ✓
Finance Admin: (hasn't responded yet)
  ↓
⏳ Waiting... Nothing sent to user yet
  ↓
Finance Admin: Clicks "Подтвердить" ✓
  ↓
✅ Now ticket is sent!
```

## Troubleshooting

### Problem: "ADMIN_USER_ID not set"

**Solution:**
1. Make sure you created `.env` file (not `.env.example`)
2. Add your Telegram user ID
3. Restart bot: `npm start`

### Problem: "Bot not responding"

**Solution:**
```bash
# Check if bot is running
ps aux | grep node

# Kill old processes
killall node

# Start fresh
npm start
```

### Problem: "Admins not receiving screenshots"

**Solution:**
1. Check both admin IDs are correct in `.env`
2. Make sure admins have started the bot with `/start`
3. Check bot logs for errors

### Problem: "User can't send screenshot"

**Solution:**
- Make sure user completed registration first
- User must share contact and confirm before sending screenshot
- Only photos/images are accepted (not files)

## Database

All registrations are saved in: `./data/registrations.db`

**View registrations:**

```bash
sqlite3 ./data/registrations.db

SELECT id, first_name, last_name, phone_number, payment_completed
FROM registrations;
```

## Features

✅ Two-admin confirmation required
✅ Generates printable confirmation tickets
✅ Stores all user data (name, phone, etc.)
✅ Shows registration statistics
✅ Simple manual payment verification
✅ No API integration needed
✅ No webhooks or external servers
✅ Works immediately after setup

## Important Notes

1. **Both admins MUST confirm** - Ticket only sent after both click "Подтвердить"
2. **Screenshot required** - User cannot proceed without uploading screenshot
3. **One-time confirmation** - Once confirmed, cannot be undone
4. **Manual verification** - Admins should check screenshot matches payment details

## Security

- Only specified admin IDs can confirm payments
- All data stored locally in SQLite database
- No external API keys needed
- No payment processing (fully manual)

## Support

If you encounter issues:

1. Check bot logs: Look for error messages
2. Verify `.env` file has correct values
3. Make sure both admin IDs are set
4. Test with `/stats` command to verify admin access

---

**Version:** 1.0.0 (Manual Payment System)
**Last Updated:** November 7, 2025
