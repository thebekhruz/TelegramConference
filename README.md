# Telegram Conference Bot

A Telegram bot for conference registration with integrated payment support for PayMe and Click (Uzbekistan payment systems).

## Features

- Multi-language support (Russian and English)
- Conference registration with payment processing
- Integrated Telegram Payments with PayMe and Click
- SQLite database for storing registrations
- Enhanced confirmation messages with registration details
- Real-time admin notifications for new registrations
- Admin dashboard with statistics and reports
- Export registrations to CSV
- Price: 200,000 UZS

## Setup

1. Install dependencies:
```bash
npm install
```

2. Create a `.env` file from `.env.example`:
```bash
cp .env.example .env
```

3. Configure your environment variables in `.env`:
   - Get your bot token from [@BotFather](https://t.me/BotFather)
   - Connect PayMe and Click payment providers via @BotFather
   - Get provider tokens for PayMe and Click
   - Set your admin user ID (send /start to @userinfobot to get your ID)

## Payment Provider Setup

### Setting up PayMe (paycom.uz)

1. Contact PayMe support to set up a merchant account
2. In Telegram, go to @BotFather
3. Select your bot → Payments
4. Add PayMe as a payment provider
5. Enter your PayMe merchant credentials
6. Copy the provider token to your `.env` file

### Setting up Click

1. Contact Click support to set up a merchant account
2. In Telegram, go to @BotFather
3. Select your bot → Payments
4. Add Click as a payment provider
5. Enter your Click merchant credentials
6. Copy the provider token to your `.env` file

## Running the Bot

Development mode with auto-reload:
```bash
npm run dev
```

Production mode:
```bash
npm start
```

## Bot Commands

### User Commands
- `/start` - Start the bot and select language
- `/register` - Register for the conference
- `/language` - Change language
- `/help` - Get help information

### Admin Commands
- `/stats` - View registration statistics
- `/recent [number]` - Show recent registrations (default: 10, max: 50)
- `/export` - Export all registrations to CSV
- `/adminhelp` - Show admin command help

## Usage

### For Users
1. Start the bot with `/start`
2. Select your preferred language (Russian or English)
3. Use `/register` to register for the conference
4. Choose payment method (PayMe or Click)
5. Complete payment through Telegram's native payment interface
6. Receive detailed confirmation message with registration ID

### For Admins
1. After each successful registration, admin receives instant notification with:
   - User information
   - Payment details
   - Updated statistics
2. Use admin commands to:
   - View statistics with `/stats`
   - Check recent registrations with `/recent`
   - Export data to CSV with `/export`

## Database

The bot uses SQLite to store registration data including:
- User information (name, username, user ID)
- Payment details (method, transaction ID, amount)
- Registration timestamp
- Language preference

Database file is automatically created at `./data/registrations.db` on first run.

## License

ISC
