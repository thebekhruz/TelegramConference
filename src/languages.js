// Language support for Russian and English

const languages = {
  en: {
    welcome: "👋 Welcome to the Conference Registration Bot!\n\nPlease select your language:",
    language_changed: "✅ Language changed to English",

    main_menu: "📋 Main Menu\n\nUse the commands below:",
    register_button: "📝 Register for Conference",
    change_language: "🌐 Change Language",
    help_button: "ℹ️ Help",
    location_button: "📍 Event Location",

    registration_info: "🎓 Conference Registration\n\n" +
                      "📅 Join our upcoming conference!\n" +
                      "💰 Price: 200,000 UZS\n\n" +
                      "Please select your payment method:",
    
    contact_request: "📱 Contact Information Required\n\n" +
                     "Before proceeding with payment, please share your contact information (name and phone number) by tapping the button below:",
    
    contact_button: "📱 Share My Contact",
    contact_shared: "✅ Contact information received!\n\n" +
                    "Name: {contact_name}\n" +
                    "Phone: {phone_number}\n\n" +
                    "Is this information correct?",
    contact_confirm: "✅ Confirmed! Proceeding to payment...",
    contact_edit_name: "✏️ Edit Name",
    contact_edit_phone: "✏️ Edit Phone",
    contact_confirm_button: "✅ Confirm and Continue",
    contact_error: "❌ Please share your contact information using the button below.",

    payme_button: "💳 Pay with PayMe",
    click_button: "💳 Pay with Click",
    cancel_button: "❌ Cancel",

    payment_description: "Conference Registration Payment",
    invoice_title: "Conference Registration",

    payment_success: "✅ Payment successful!\n\n" +
                    "Thank you for registering for the conference!\n" +
                    "You will receive confirmation details shortly.\n\n" +
                    "Transaction ID: {transaction_id}",

    payment_cancelled: "❌ Payment was cancelled.\n\n" +
                      "If you wish to register, please use /register command again.",

    help_text: "ℹ️ Help Information\n\n" +
              "Available commands:\n" +
              "/start - Start the bot\n" +
              "/register - Register for the conference\n" +
              "/language - Change language\n" +
              "/help - Show this help message\n\n" +
              "To register for the conference:\n" +
              "1. Use /register command\n" +
              "2. Choose payment method (PayMe or Click)\n" +
              "3. Complete payment\n" +
              "4. Receive confirmation\n\n" +
              "Conference Price: 200,000 UZS",

    select_language: "🌐 Select Language:",
    error_occurred: "❌ An error occurred. Please try again later.",
    back_button: "⬅️ Back"
  },

  ru: {
    welcome: "👋 Добро пожаловать в бот регистрации на конференцию!\n\nПожалуйста, выберите язык:",
    language_changed: "✅ Язык изменен на русский",

    main_menu: "📋 Главное меню\n\nИспользуйте команды ниже:",
    register_button: "📝 Зарегистрироваться на конференцию",
    change_language: "🌐 Изменить язык",
    help_button: "ℹ️ Помощь",
    location_button: "📍 Место проведения",

    registration_info: "🎓 Регистрация на конференцию\n\n" +
                      "📅 Присоединяйтесь к нашей предстоящей конференции!\n" +
                      "💰 Цена: 200 000 сум\n\n" +
                      "Пожалуйста, выберите способ оплаты:",
    
    contact_request: "📱 Требуется контактная информация\n\n" +
                     "Перед оплатой, пожалуйста, поделитесь своей контактной информацией (имя и номер телефона), нажав кнопку ниже:",
    
    contact_button: "📱 Поделиться контактом",
    contact_shared: "✅ Контактная информация получена!\n\n" +
                    "Имя: {contact_name}\n" +
                    "Телефон: {phone_number}\n\n" +
                    "Верна ли эта информация?",
    contact_confirm: "✅ Подтверждено! Переходим к оплате...",
    contact_edit_name: "✏️ Изменить имя",
    contact_edit_phone: "✏️ Изменить телефон",
    contact_confirm_button: "✅ Подтвердить и продолжить",
    contact_error: "❌ Пожалуйста, поделитесь своей контактной информацией, используя кнопку ниже.",

    payme_button: "💳 Оплатить через PayMe",
    click_button: "💳 Оплатить через Click",
    cancel_button: "❌ Отмена",

    payment_description: "Оплата регистрации на конференцию",
    invoice_title: "Регистрация на конференцию",

    payment_success: "✅ Оплата прошла успешно!\n\n" +
                    "Спасибо за регистрацию на конференцию!\n" +
                    "Вы получите подтверждение в ближайшее время.\n\n" +
                    "ID транзакции: {transaction_id}",

    payment_cancelled: "❌ Оплата была отменена.\n\n" +
                      "Если вы хотите зарегистрироваться, используйте команду /register снова.",

    help_text: "ℹ️ Справка\n\n" +
              "Доступные команды:\n" +
              "/start - Запустить бота\n" +
              "/register - Зарегистрироваться на конференцию\n" +
              "/language - Изменить язык\n" +
              "/help - Показать эту справку\n\n" +
              "Для регистрации на конференцию:\n" +
              "1. Используйте команду /register\n" +
              "2. Выберите способ оплаты (PayMe или Click)\n" +
              "3. Завершите оплату\n" +
              "4. Получите подтверждение\n\n" +
              "Стоимость конференции: 200 000 сум",

    select_language: "🌐 Выберите язык:",
    error_occurred: "❌ Произошла ошибка. Пожалуйста, попробуйте позже.",
    back_button: "⬅️ Назад"
  }
};

// Get text by key and language
function getText(lang, key, replacements = {}) {
  const text = languages[lang]?.[key] || languages.en[key] || key;

  // Replace placeholders like {transaction_id}
  return Object.keys(replacements).reduce((str, key) => {
    return str.replace(`{${key}}`, replacements[key]);
  }, text);
}

// Get available languages
function getAvailableLanguages() {
  return Object.keys(languages);
}

module.exports = {
  languages,
  getText,
  getAvailableLanguages
};
