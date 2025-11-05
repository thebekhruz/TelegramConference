# Conference Attendance Management Guide

This guide explains how to retrieve and manage your conference attendee list for checking attendance.

## Quick Start

You have **3 easy ways** to view attendees:

### 1. 📱 From Telegram (Easiest)
### 2. 💻 Using npm Scripts
### 3. 🔧 Direct Database Queries

---

## 📱 Method 1: Using Telegram Bot (Recommended)

### A. View Recent Attendees

Open Telegram and send to your bot:
```
/recent 50
```

**Shows:**
- Last 50 registrations (you can adjust number)
- Name, username, payment method
- Registration date and ID
- Formatted for quick review

**Good for:** Quick checks, recent registrations

---

### B. Export to CSV File

Send to your bot:
```
/export
```

**You'll receive a CSV file with ALL attendees including:**
- ID, User ID, Username
- First Name, Last Name
- Payment Method, Transaction ID
- Amount, Currency, Registration Date

**Open in:**
- Microsoft Excel
- Google Sheets
- Apple Numbers
- Any spreadsheet app

**Good for:**
- Printing attendance sheets
- Sharing with team
- Creating custom reports
- Sorting and filtering

---

### C. View Statistics

Send to your bot:
```
/stats
```

**Shows:**
- Total number of attendees
- Breakdown by payment method (PayMe/Click)
- Total revenue
- Last updated time

**Good for:** Quick overview, reporting to management

---

## 💻 Method 2: Using npm Scripts (Command Line)

Navigate to your project folder:
```bash
cd ~/Desktop/TelegramConference
```

### View Attendance List

```bash
npm run attendance
```

**Output:**
```
================================================================================
CONFERENCE ATTENDANCE LIST
Total Registrations: 42
================================================================================

1. [ID: 1]
   Name: John Doe
   Username: @johndoe
   Payment: PAYME
   Date: Jan 4, 2025, 3:45 PM
   Attended: [ ]

2. [ID: 2]
   Name: Jane Smith
   Username: @janesmith
   Payment: CLICK
   Date: Jan 4, 2025, 2:30 PM
   Attended: [ ]

...
```

---

### Export to CSV

```bash
npm run attendance:csv
```

**Creates:** `attendance_[timestamp].csv` in your project folder

**Contains:** All attendee data in spreadsheet format

---

### Alphabetical List (For Printing)

```bash
npm run attendance:alpha
```

**Output:**
```
================================================================================
ALPHABETICAL ATTENDANCE LIST
Total Registrations: 42
================================================================================

  1. Ahmed Khan                  @ahmedkhan           [ ]
  2. Anna Ivanova                @anna_i              [ ]
  3. Bob Johnson                 @bobjohn             [ ]
  4. Jane Smith                  @janesmith           [ ]
  5. John Doe                    @johndoe             [ ]
...
```

**Perfect for:** Printing and checking off attendees at the door

---

### Search for Specific Attendee

```bash
npm run search "John Doe"
```

**Or search by username:**
```bash
npm run search "@johndoe"
```

**Output:**
```
============================================================
Search Results for: "John Doe"
============================================================

✅ Found 1 attendee(s):

1. John Doe
   Registration ID: #42
   Username: @johndoe
   User ID: 123456789
   Payment Method: PAYME
   Transaction ID: tg_1234567890
   Registration Date: Jan 4, 2025, 3:45 PM
   Status: ✅ REGISTERED
```

**Good for:** Verifying if someone is registered

---

## 🔧 Method 3: Direct Database Queries

### View All Attendees

```bash
sqlite3 data/registrations.db << EOF
.headers on
.mode column
SELECT
  id AS "ID",
  first_name || ' ' || COALESCE(last_name, '') AS "Name",
  username AS "Username",
  payment_method AS "Payment",
  registration_date AS "Date"
FROM registrations
ORDER BY first_name;
EOF
```

---

### Count Total Attendees

```bash
sqlite3 data/registrations.db "SELECT COUNT(*) FROM registrations;"
```

---

### List Attendees by Payment Method

**PayMe attendees:**
```bash
sqlite3 data/registrations.db << EOF
.headers on
.mode column
SELECT
  first_name || ' ' || COALESCE(last_name, '') AS "Name",
  username
FROM registrations
WHERE payment_method = 'payme'
ORDER BY first_name;
EOF
```

**Click attendees:**
```bash
sqlite3 data/registrations.db << EOF
.headers on
.mode column
SELECT
  first_name || ' ' || COALESCE(last_name, '') AS "Name",
  username
FROM registrations
WHERE payment_method = 'click'
ORDER BY first_name;
EOF
```

---

### Attendees by Date

**Today's registrations:**
```bash
sqlite3 data/registrations.db << EOF
SELECT
  first_name || ' ' || COALESCE(last_name, '') AS "Name",
  username,
  time(registration_date) AS "Time"
FROM registrations
WHERE date(registration_date) = date('now')
ORDER BY registration_date DESC;
EOF
```

---

## 📋 Practical Use Cases

### Use Case 1: Day Before Conference

**Task:** Print attendance sheet for the door

**Solution:**
```bash
cd ~/Desktop/TelegramConference
npm run attendance:alpha > attendance.txt
cat attendance.txt
# Print this file
```

---

### Use Case 2: Someone Claims They Registered

**Task:** Verify if person is registered

**Solution:**
```bash
npm run search "John Doe"
# or
npm run search "@johndoe"
```

---

### Use Case 3: Need Report for Management

**Task:** Export data to Excel

**Solution:**
1. In Telegram, send `/export` to your bot
2. Download the CSV file
3. Open in Excel/Google Sheets
4. Create pivot tables, charts, etc.

---

### Use Case 4: Check Registration Numbers Live

**Task:** How many people registered?

**Solution:**
```
# In Telegram
/stats
```

Shows real-time count and breakdown.

---

### Use Case 5: At Conference Door

**Option A - Use Telegram:**
- Have bot open on your phone/tablet
- Use `/recent 100` to see all attendees
- Search by name: Look through the list

**Option B - Use Printed List:**
```bash
npm run attendance:alpha
# Print the output
# Check off names as people arrive
```

**Option C - Use Spreadsheet:**
- Export CSV from Telegram (`/export`)
- Open on tablet
- Use Ctrl+F / Cmd+F to search names
- Mark attendance column

---

## 🖨️ Creating a Printable Attendance Sheet

### Quick Method (Terminal)

```bash
# Generate alphabetical list
npm run attendance:alpha

# Or save to file
npm run attendance:alpha > attendance_sheet.txt

# Print the file
lpr attendance_sheet.txt  # On Mac/Linux
# Or open in text editor and print
```

---

### Professional Method (CSV → PDF)

1. **Export to CSV:**
   ```bash
   npm run attendance:csv
   ```

2. **Open in Excel/Google Sheets**

3. **Format nicely:**
   - Add conference header
   - Adjust column widths
   - Add "Attended ✓" column
   - Add signature line

4. **Print to PDF** or paper

---

## 📊 Sample Workflows

### Workflow 1: Weekly Check

**Every week before conference:**

```bash
# Check total registrations
cd ~/Desktop/TelegramConference

# View stats
# (Or use /stats in Telegram)

# Export for records
npm run attendance:csv
```

---

### Workflow 2: Conference Day Morning

**Morning of conference:**

```bash
# Generate final attendance list
npm run attendance:alpha > final_attendance.txt

# Print it
cat final_attendance.txt

# Or export to CSV and open in Excel
npm run attendance:csv
```

---

### Workflow 3: During Conference

**While checking people in:**

1. **Have bot open in Telegram**
2. **Someone arrives:** Search for them
   - Use Ctrl+F in `/recent 100` message
   - Or use `/search` if you added that command
3. **Not found?** Use search script:
   ```bash
   npm run search "Person Name"
   ```

---

## 🔍 Advanced Queries

### Find Attendees Without Username

```bash
sqlite3 data/registrations.db << EOF
.headers on
SELECT
  id,
  first_name,
  last_name,
  user_id
FROM registrations
WHERE username IS NULL OR username = '';
EOF
```

---

### Registrations by Day

```bash
sqlite3 data/registrations.db << EOF
.headers on
.mode column
SELECT
  DATE(registration_date) AS "Date",
  COUNT(*) AS "Registrations"
FROM registrations
GROUP BY DATE(registration_date)
ORDER BY Date DESC;
EOF
```

---

### Revenue Report

```bash
sqlite3 data/registrations.db << EOF
.headers on
SELECT
  payment_method AS "Payment Method",
  COUNT(*) AS "Count",
  SUM(amount) / 100 AS "Revenue (UZS)"
FROM registrations
GROUP BY payment_method;
EOF
```

---

## 💡 Pro Tips

### Tip 1: Backup Before Conference
```bash
# Backup database
cp data/registrations.db data/registrations_backup_$(date +%Y%m%d).db
```

---

### Tip 2: Multiple Devices
- Export CSV and share with team
- Multiple people can check attendance
- Everyone works from same list

---

### Tip 3: Mobile Access
- Keep Telegram bot open on phone/tablet
- Use `/recent 100` for quick lookup
- No need for printouts

---

### Tip 4: Post-Conference Analysis
```bash
# Export data after event
npm run attendance:csv

# Analyze in Excel:
# - Response rate
# - Payment method preferences
# - Registration timeline
# - No-show rate (if you tracked it)
```

---

## 🚨 Common Issues

### Issue: "Database not found"

**Solution:**
```bash
# Check database exists
ls -la data/registrations.db

# If missing, bot hasn't been started yet
npm start
# Then stop it (Ctrl+C)
# Database will be created
```

---

### Issue: "No registrations found"

**Reason:** No one has paid yet, or using test database

**Solution:**
- Check you're using correct database path
- Verify bot is running with correct .env file
- Test by doing a test payment

---

### Issue: Can't open CSV file

**Solution:**
```bash
# Check where file was created
ls -la *.csv

# Open with specific app
open attendance_*.csv          # Mac
xdg-open attendance_*.csv      # Linux
start attendance_*.csv         # Windows
```

---

## 📱 Quick Reference Card

**Print this and keep handy:**

```
═══════════════════════════════════════════════════════════
CONFERENCE ATTENDANCE - QUICK REFERENCE
═══════════════════════════════════════════════════════════

IN TELEGRAM:
  /stats              → View total count
  /recent 100         → See all attendees
  /export             → Get CSV file

ON COMPUTER:
  npm run attendance         → View full list
  npm run attendance:alpha   → Alphabetical (for printing)
  npm run attendance:csv     → Export to CSV
  npm run search "name"      → Search attendee

COUNT ATTENDEES:
  sqlite3 data/registrations.db "SELECT COUNT(*) FROM registrations;"

═══════════════════════════════════════════════════════════
```

---

## 🎯 Summary

**Before Conference:**
- Use `/export` or `npm run attendance:csv`
- Print attendance sheet
- Share with team

**During Conference:**
- Keep Telegram open
- Use `/recent` to check attendees
- Or use printed list

**After Conference:**
- Export data for analysis
- Backup database
- Generate reports

**For Quick Checks:**
- Use `/stats` for counts
- Use search to find specific person
- Use admin commands in Telegram

---

## Database Structure Reference

Your database stores:

| Field | Description |
|-------|-------------|
| id | Unique registration ID (#1, #2, etc.) |
| user_id | Telegram User ID |
| username | Telegram username (@johndoe) |
| first_name | User's first name |
| last_name | User's last name |
| language_code | Preferred language (en/ru) |
| payment_method | payme or click |
| transaction_id | Unique transaction ID from Telegram |
| provider_payment_charge_id | Provider's charge ID |
| amount | Amount in tyiyn (20000000 = 200,000 UZS) |
| currency | UZS |
| payload | Invoice payload |
| registration_date | Date/time of registration |
| status | Registration status (completed) |

---

Need help? Check ADMIN_GUIDE.md for more database management tips!
