# Quick Start Guide

## 🚨 Problem: Can't Register?

**The issue:** Your `.env` file is not configured!

---

## ✅ Solution (5 Steps)

### **Step 1: Create .env file**

```bash
cp .env.example .env
```

### **Step 2: Get Required Information**

#### **a) Get Bot Token:**
1. Open Telegram
2. Search for `@BotFather`
3. Send `/newbot` (if you haven't created a bot yet)
4. Or send `/token` to get existing bot token
5. Copy the token (looks like: `123456:ABC-DEF1234ghIkl-zyx57W2v1u123ew11`)

#### **b) Get Your User ID:**
1. Open Telegram
2. Search for `@userinfobot`
3. Send `/start`
4. Bot replies with your ID (e.g., `123456789`)
5. **Do this for BOTH admins!**

#### **c) Get Finance Admin User ID:**
1. Ask your finance department person to do the same
2. They search for `@userinfobot`
3. Send `/start`
4. Get their user ID

### **Step 3: Edit .env File**

```bash
nano .env
```

Or open with any text editor and add:

```env
# Your bot token from @BotFather
TELEGRAM_BOT_TOKEN=123456:ABC-DEF1234ghIkl-zyx57W2v1u123ew11

# Your PayMe account (where users will send money)
PAYME_ACCOUNT_NUMBER=+998901234567
PAYME_ACCOUNT_NAME=Oxbridge International School

# Price
CONFERENCE_PRICE=200000
CURRENCY=UZS

# YOUR user ID (from @userinfobot)
ADMIN_USER_ID=123456789

# Finance department user ID (from @userinfobot)
FINANCE_ADMIN_USER_ID=987654321
```

**Save and close** (Ctrl+X, then Y, then Enter)

### **Step 4: Test Configuration**

```bash
npm run test
```

Should show all ✅ green checkmarks!

### **Step 5: Start Bot**

```bash
npm start
```

---

## 🗑️ Clear Database

If you have test data and want to start fresh:

```bash
npm run clear-db
```

Type `yes` to confirm deletion.

---

## 🧪 Quick Commands

```bash
# Test bot configuration
npm run test

# Clear all registrations
npm run clear-db

# Start bot
npm start

# View database stats
sqlite3 data/registrations.db "SELECT COUNT(*) FROM registrations;"

# View all registrations
sqlite3 data/registrations.db "SELECT * FROM registrations;"
```

---

## 🔍 Troubleshooting

### **Problem: Bot doesn't respond**

**Check:**
```bash
# 1. Is bot running?
ps aux | grep node

# 2. Check configuration
npm run test

# 3. View logs
npm start
# Look for errors in output
```

### **Problem: Can't share contact**

**Solution:** Make sure you're using Telegram app (not web version). Web version has limited contact sharing.

### **Problem: Screenshot not going to admins**

**Check:**
1. Both admin IDs are correct in `.env`
2. Both admins have started the bot with `/start`
3. Check bot logs for errors

### **Problem: Registration stuck**

**Solution:**
```bash
# Clear database and start fresh
npm run clear-db

# Restart bot
npm start

# Try again in Telegram
```

---

## 📱 Test Registration Flow

**Step-by-step test:**

1. **Open your bot in Telegram**
2. Send `/start`
3. Click "Забронировать билет"
4. Click "Поделиться контактом"
5. Click "Подтвердить"
6. You should see payment instructions
7. Take any screenshot
8. Send screenshot to bot
9. **Check both admin accounts** - they should receive the screenshot
10. Both admins click "✅ Подтвердить"
11. User receives confirmation ticket ✅

---

## 🆘 Still Having Issues?

### **1. Check .env file exists:**

```bash
ls -la .env
```

If it says "No such file", run:
```bash
cp .env.example .env
```

### **2. Verify .env content:**

```bash
cat .env
```

Make sure all values are filled in (no `your_*_here`).

### **3. Check bot token is valid:**

```bash
curl "https://api.telegram.org/bot<YOUR_BOT_TOKEN>/getMe"
```

Replace `<YOUR_BOT_TOKEN>` with your actual token. Should return JSON with bot info.

### **4. View database:**

```bash
npm run test
```

Shows all configuration and database status.

---

## 📊 Database Commands

### **View all registrations:**

```bash
sqlite3 data/registrations.db
```

Then inside sqlite:
```sql
SELECT * FROM registrations;
```

Exit with: `.quit`

### **Count registrations:**

```bash
sqlite3 data/registrations.db "SELECT COUNT(*) as total FROM registrations;"
```

### **Delete ALL registrations:**

```bash
npm run clear-db
```

Or manually:
```bash
rm data/registrations.db
```

---

## ✅ Checklist

Before running bot, make sure:

- [ ] `.env` file exists (not `.env.example`)
- [ ] `TELEGRAM_BOT_TOKEN` is set
- [ ] `ADMIN_USER_ID` is set (your Telegram user ID)
- [ ] `FINANCE_ADMIN_USER_ID` is set (finance person's user ID)
- [ ] `PAYME_ACCOUNT_NUMBER` is set (your PayMe account)
- [ ] `npm run test` shows all green ✅
- [ ] Bot starts without errors: `npm start`

---

## 🎯 Summary

**To fix registration issues:**

1. Create `.env` file: `cp .env.example .env`
2. Get bot token from `@BotFather`
3. Get admin IDs from `@userinfobot`
4. Edit `.env` with your values
5. Test: `npm run test`
6. Start: `npm start`
7. Done! ✅

**To clear database:**

```bash
npm run clear-db
```

**That's it!** 🚀
