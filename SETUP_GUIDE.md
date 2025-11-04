# Setup Guide for Telegram Conference Bot

This guide will help you set up and configure the Telegram Conference Bot with PayMe and Click payment providers.

## Prerequisites

- Node.js (v14 or higher)
- npm or yarn
- A Telegram account
- Merchant accounts with PayMe and/or Click

## Step 1: Create Your Telegram Bot

1. Open Telegram and search for `@BotFather`
2. Send `/newbot` command
3. Follow the instructions:
   - Choose a name for your bot (e.g., "Conference Registration Bot")
   - Choose a username for your bot (must end with 'bot', e.g., "conference_reg_bot")
4. Save the bot token provided by BotFather

## Step 2: Set Up Payment Providers

### PayMe (paycom.uz) Setup

1. **Get a Merchant Account:**
   - Visit https://paycom.uz or contact PayMe support
   - Register as a merchant
   - Complete the verification process
   - Get your Merchant ID and test/production keys

2. **Connect PayMe to Your Bot:**
   - Go back to `@BotFather` in Telegram
   - Send `/mybots` and select your bot
   - Select "Payments"
   - Choose "PayMe" or add a new provider
   - Enter your PayMe merchant credentials:
     - Merchant ID
     - Secret key
   - BotFather will provide a **Provider Token** - save this!

### Click Setup

1. **Get a Merchant Account:**
   - Visit https://click.uz or contact Click support
   - Register as a merchant
   - Complete the verification process
   - Get your Merchant ID and Service ID

2. **Connect Click to Your Bot:**
   - Go back to `@BotFather` in Telegram
   - Send `/mybots` and select your bot
   - Select "Payments"
   - Choose "Click" or add a new provider
   - Enter your Click merchant credentials:
     - Merchant ID
     - Service ID
     - Secret key
   - BotFather will provide a **Provider Token** - save this!

## Step 3: Configure the Bot

1. **Clone the repository and install dependencies:**
```bash
cd TelegramConference
npm install
```

2. **Create .env file:**
```bash
cp .env.example .env
```

3. **Edit .env file with your credentials:**
```env
# Your bot token from BotFather
TELEGRAM_BOT_TOKEN=1234567890:ABCdefGHIjklMNOpqrsTUVwxyz

# Provider tokens from BotFather
PAYME_PROVIDER_TOKEN=284685063:TEST:YourPayMeTokenHere
CLICK_PROVIDER_TOKEN=284685063:TEST:YourClickTokenHere

# Conference settings
CONFERENCE_PRICE=200000
CURRENCY=UZS
```

## Step 4: Test the Bot

### Development Mode

Run the bot in development mode with auto-reload:
```bash
npm run dev
```

### Testing Payment Flow

1. **Start your bot** - Find it in Telegram using the username you created
2. **Send `/start` command** to initialize the bot
3. **Select language** (English or Russian)
4. **Send `/register` command** to start registration
5. **Choose payment method** (PayMe or Click)
6. **Complete test payment:**
   - Use test cards provided by PayMe/Click
   - For PayMe test: Usually card `8600 xxxx xxxx xxxx`
   - For Click test: Check Click documentation for test cards

### Test Cards

**PayMe Test Cards:**
- Card: `8600 4954 7331 6478`
- Expiry: Any future date
- SMS Code: `666666`

**Click Test Cards:**
- Check with Click support for current test card numbers
- Usually provided in merchant dashboard

## Step 5: Production Deployment

1. **Switch to Production Tokens:**
   - Request production access from PayMe and Click
   - Update provider tokens in `.env` with production tokens
   - Update bot token if using a different bot for production

2. **Deploy to a Server:**
   - Use a VPS or cloud service (DigitalOcean, AWS, etc.)
   - Keep the bot running with PM2 or similar process manager:
   ```bash
   npm install -g pm2
   pm2 start src/bot.js --name conference-bot
   pm2 save
   pm2 startup
   ```

3. **Set up monitoring:**
   ```bash
   pm2 monit
   ```

## Troubleshooting

### Bot doesn't respond
- Check if TELEGRAM_BOT_TOKEN is correct
- Ensure bot is running: `pm2 status` or check terminal
- Check network connectivity

### Payment doesn't work
- Verify provider tokens are correct
- Check if merchant accounts are active
- Ensure you're using test cards in test mode
- Check bot logs for error messages

### Language not changing
- Try sending `/start` again
- Clear chat history and restart

## Bot Commands Reference

- `/start` - Initialize bot and select language
- `/register` - Start conference registration
- `/language` - Change interface language
- `/help` - Display help information

## Support

For issues with:
- **Telegram Bot API:** Check https://core.telegram.org/bots/api
- **PayMe:** Contact PayMe merchant support
- **Click:** Contact Click merchant support
- **This Bot:** Check logs or create an issue in the repository

## Security Notes

1. **Never commit .env file** to version control
2. **Keep provider tokens secret**
3. **Use environment variables** for all sensitive data
4. **Enable SSL/TLS** for production deployments
5. **Regularly update dependencies**: `npm audit fix`
6. **Monitor transaction logs** for suspicious activity

## Additional Features (Optional)

Consider adding:
- Database integration (PostgreSQL, MongoDB) for storing registrations
- Email notifications upon successful registration
- QR code generation for tickets
- Admin panel for viewing registrations
- Export registration data to CSV
- Refund handling
- Multiple conference support
- Early bird pricing
- Discount codes

## License

ISC
