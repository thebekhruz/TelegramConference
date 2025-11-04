# Admin Guide - Telegram Conference Bot

This guide explains how to set up and use the admin features of the conference registration bot.

## Getting Your Admin User ID

To become an admin, you need your Telegram User ID:

1. Open Telegram
2. Search for **@userinfobot**
3. Send `/start` to the bot
4. The bot will reply with your user information including your **User ID**
5. Copy the User ID number (e.g., `123456789`)
6. Add it to your `.env` file:
   ```
   ADMIN_USER_ID=123456789
   ```
7. Restart the bot

## Admin Notifications

As an admin, you will automatically receive a notification for every successful conference registration. Each notification includes:

### User Information
- Full name
- Telegram username
- User ID
- Preferred language

### Payment Information
- Payment method (PayMe or Click)
- Amount paid
- Transaction ID
- Registration ID

### Current Statistics
- Total number of registrations
- Total revenue
- Breakdown by payment method (PayMe vs Click)
- Registration timestamp

### Example Notification

```
🔔 New Conference Registration!

👤 User Info:
- Name: John Doe
- Username: @johndoe
- User ID: 987654321
- Language: EN

💰 Payment Info:
- Method: PayMe
- Amount: 200,000 UZS
- Transaction ID: tg_1234567890

📊 Current Statistics:
- Total Registrations: 42
- Total Revenue: 8,400,000 UZS
- PayMe: 28 | Click: 14

🆔 Registration ID: #42
📅 Jan 4, 2025, 3:45 PM
```

## Admin Commands

### View Statistics - `/stats`

Get real-time statistics about conference registrations.

**Usage:**
```
/stats
```

**Returns:**
- Total registrations
- Registrations by payment method
- Total revenue
- Last update timestamp

**Example Output:**
```
📊 Conference Registration Statistics

👥 Registrations:
- Total: 42
- PayMe: 28
- Click: 14

💰 Revenue:
- Total: 8,400,000 UZS

📅 Last updated: Jan 4, 2025, 3:45 PM
```

### View Recent Registrations - `/recent`

View the most recent conference registrations.

**Usage:**
```
/recent           # Shows last 10 registrations
/recent 5         # Shows last 5 registrations
/recent 25        # Shows last 25 registrations
```

**Limits:**
- Default: 10 registrations
- Maximum: 50 registrations

**Example Output:**
```
📋 Recent 10 Registration(s):

1. #42
👤 John Doe
📱 @johndoe
💳 PAYME
💰 200,000 UZS
📅 Jan 4, 2025, 3:45 PM

2. #41
👤 Jane Smith
📱 No username
💳 CLICK
💰 200,000 UZS
📅 Jan 4, 2025, 2:30 PM

...
```

### Export Registrations - `/export`

Export all registrations to a CSV file for further analysis.

**Usage:**
```
/export
```

**Returns:**
A CSV file containing all registration data with columns:
- ID
- User ID
- Username
- First Name
- Last Name
- Payment Method
- Transaction ID
- Amount
- Currency
- Registration Date

**Use Cases:**
- Import into Excel or Google Sheets
- Create custom reports
- Share with finance team
- Backup registration data
- Analyze trends

### Admin Help - `/adminhelp`

Display a quick reference of all admin commands.

**Usage:**
```
/adminhelp
```

## User Confirmation Messages

When a user successfully completes payment, they receive an enhanced confirmation message including:

```
✅ Payment successful!

Thank you for registering for the conference!
You will receive confirmation details shortly.

Transaction ID: tg_1234567890

📋 Registration Details:
👤 Name: John Doe
💳 Payment Method: PayMe
💰 Amount: 200,000 UZS
🆔 Registration ID: #42
📅 Date: Jan 4, 2025, 3:45 PM

We look forward to seeing you at the conference! 🎉
```

## Database Management

### Database Location
- Default path: `./data/registrations.db`
- SQLite database file
- Automatically created on first run

### Database Schema

The bot stores the following information for each registration:

| Field | Type | Description |
|-------|------|-------------|
| id | INTEGER | Unique registration ID |
| user_id | INTEGER | Telegram user ID |
| username | TEXT | Telegram username |
| first_name | TEXT | User's first name |
| last_name | TEXT | User's last name |
| language_code | TEXT | Preferred language |
| payment_method | TEXT | PayMe or Click |
| transaction_id | TEXT | Unique transaction ID |
| provider_payment_charge_id | TEXT | Provider's charge ID |
| amount | INTEGER | Amount in smallest currency unit |
| currency | TEXT | Currency code (UZS) |
| payload | TEXT | Invoice payload |
| registration_date | DATETIME | Timestamp of registration |
| status | TEXT | Registration status |

### Backup Database

It's recommended to regularly backup your database:

```bash
# Create a backup
cp data/registrations.db data/registrations_backup_$(date +%Y%m%d).db

# Or use sqlite3 to create a SQL dump
sqlite3 data/registrations.db .dump > registrations_backup.sql
```

### View Database Directly

You can query the database directly using sqlite3:

```bash
# Open database
sqlite3 data/registrations.db

# Show tables
.tables

# View all registrations
SELECT * FROM registrations;

# Count registrations
SELECT COUNT(*) FROM registrations;

# View registrations by payment method
SELECT payment_method, COUNT(*) as count
FROM registrations
GROUP BY payment_method;

# Exit sqlite3
.quit
```

## Monitoring and Troubleshooting

### Check Bot Logs

The bot logs important events to the console:

```bash
# If running with PM2
pm2 logs conference-bot

# If running directly
# Check your terminal output
```

### Common Issues

#### Not Receiving Admin Notifications

**Possible causes:**
1. ADMIN_USER_ID not set in `.env`
2. Incorrect User ID
3. Bot not restarted after setting ADMIN_USER_ID

**Solution:**
1. Verify your User ID with @userinfobot
2. Check `.env` file has correct ID
3. Restart the bot

#### Can't Access Admin Commands

**Possible causes:**
1. Not logged in as admin
2. Admin commands used before setting admin ID

**Solution:**
1. Verify you're using the same account as ADMIN_USER_ID
2. Restart bot after setting admin ID

#### Database Errors

**Possible causes:**
1. Insufficient disk space
2. Permission issues
3. Corrupted database

**Solution:**
1. Check disk space: `df -h`
2. Check permissions: `ls -la data/`
3. Restore from backup if corrupted

## Security Best Practices

### Protect Your .env File
- Never commit `.env` to version control
- Keep bot token and provider tokens secret
- Regularly rotate tokens if compromised

### Admin Access
- Only share admin User ID with trusted individuals
- Currently supports single admin (can be extended for multiple admins)
- Monitor admin command usage

### Database Security
- Restrict file system access to database
- Regular backups to secure location
- Don't expose database file publicly

### Payment Security
- All payments handled by Telegram's secure payment system
- Provider tokens kept in environment variables
- Transaction IDs logged for audit trail

## Analytics and Reporting

### Key Metrics to Track

1. **Registration Rate**
   - Track registrations over time
   - Compare PayMe vs Click usage
   - Peak registration periods

2. **Revenue**
   - Total revenue
   - Revenue by payment method
   - Daily/weekly trends

3. **User Behavior**
   - Language preferences
   - Payment method preferences
   - Conversion rate (started vs completed)

### Export Data for Analysis

Use the `/export` command to get CSV data, then:

1. **Excel/Google Sheets**
   - Create pivot tables
   - Generate charts
   - Calculate conversion rates

2. **Data Visualization**
   - Import into Tableau, Power BI
   - Create dashboards
   - Share with stakeholders

3. **Custom Scripts**
   - Parse CSV with Python/R
   - Generate automated reports
   - Send periodic summaries

## Scaling for Multiple Admins

Currently, the bot supports a single admin. To add multiple admins:

1. Modify `.env` to support comma-separated IDs:
   ```
   ADMIN_USER_IDS=123456789,987654321,456789123
   ```

2. Update `isAdmin()` function in `bot.js`:
   ```javascript
   function isAdmin(userId) {
     const adminIds = process.env.ADMIN_USER_IDS
       .split(',')
       .map(id => parseInt(id.trim()));
     return adminIds.includes(userId);
   }
   ```

## Support and Maintenance

### Regular Tasks
- [ ] Check bot health daily
- [ ] Review admin notifications
- [ ] Backup database weekly
- [ ] Monitor disk space
- [ ] Update dependencies monthly
- [ ] Review logs for errors

### Useful Commands
```bash
# Check bot status (if using PM2)
pm2 status

# View logs
pm2 logs conference-bot

# Restart bot
pm2 restart conference-bot

# Check database size
du -h data/registrations.db

# Count registrations
sqlite3 data/registrations.db "SELECT COUNT(*) FROM registrations;"
```

## Contact and Issues

For technical support or issues:
1. Check bot logs for errors
2. Review this guide
3. Check the main README.md and SETUP_GUIDE.md
4. Contact the bot developer

## Changelog

Track changes and updates to admin features:

### Version 1.1.0
- ✅ Added database integration
- ✅ Enhanced confirmation messages
- ✅ Real-time admin notifications
- ✅ Admin statistics dashboard
- ✅ Recent registrations view
- ✅ CSV export functionality
- ✅ Admin command help

### Version 1.0.0
- Basic bot functionality
- Payment integration
- Multi-language support
