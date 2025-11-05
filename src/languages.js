// Language support - Russian only

const languages = {
  ru: {
    welcome: "👋 Добро пожаловать в бот регистрации на конференцию!",

    register_button: "🎫 Забронировать билет",
    schedule_button: "📅 Расписание",
    conditions_button: "📋 Условия Участия",
    benefits_button: "🎁 Что вы получите",
    location_button: "📍 Место проведения",

    schedule_info: `📅 <b>Расписание форума</b>

🗓 <b>Дата:</b> 29 ноября 2025 года (суббота)

⏰ <b>Время:</b>
• <b>Начало:</b> 8:30
• <b>Окончание:</b> 15:45`,

    conditions_info: `📋 <b>Условия Участия</b>

Участникам необходимо:
• Зарегистрироваться
• Оплатить регистрационный взнос в размере <b>200 000 сум</b>

💼 <i>Для спикеров участие во всех мероприятиях форума бесплатное.</i>`,

    benefits_info: `🎁 <b>Что вы получите</b>

✅ <b>Конкретные инструменты</b>, которые вы сможете использовать в своей работе

📄 <b>Материалы презентаций</b>

🤝 <b>Полезные и вдохновляющие знакомства</b>

📜 <b>Сертификат участия</b>`,

    registration_info: `🎓 <b>Регистрация на конференцию</b>

📅 <b>Присоединяйтесь к нашему форуму!</b>

💰 <b>Цена:</b> 200 000 сум

Пожалуйста, выберите способ оплаты:`,
    
    contact_request: `📱 <b>Требуется контактная информация</b>

Перед оплатой, пожалуйста, поделитесь своей контактной информацией (имя и номер телефона), нажав кнопку ниже:`,
    
    contact_button: "📱 Поделиться контактом",
    contact_shared: `✅ <b>Контактная информация получена!</b>

👤 <b>Имя:</b> {contact_name}
📞 <b>Телефон:</b> {phone_number}

Верна ли эта информация?`,
    contact_confirm: "✅ Подтверждено! Переходим к оплате...",
    contact_edit_name: "✏️ Изменить имя",
    contact_edit_phone: "✏️ Изменить телефон",
    contact_confirm_button: "✅ Подтвердить и продолжить",
    contact_error: "❌ Пожалуйста, поделитесь своей контактной информацией, используя кнопку ниже.",

    payme_button: "💳 Оплатить через PayMe",
    cancel_button: "❌ Отмена",

    payment_description: "Оплата регистрации на конференцию",
    invoice_title: "Регистрация на конференцию",

    payment_success: `✅ <b>Оплата прошла успешно!</b>

Спасибо за регистрацию на конференцию!
Вы получите подтверждение в ближайшее время.

🆔 <b>ID транзакции:</b> {transaction_id}`,

    payment_cancelled: `❌ <b>Оплата была отменена.</b>

Если вы хотите зарегистрироваться, используйте кнопку "Забронировать билет" снова.`,

    help_text: `ℹ️ <b>Справка</b>

Доступные команды:
• /start - Запустить бота
• /help - Показать эту справку

Для регистрации на конференцию:
1. Нажмите кнопку "Забронировать билет"
2. Выберите способ оплаты (PayMe)
3. Завершите оплату
4. Получите подтверждение

💰 <b>Стоимость конференции:</b> 200 000 сум`,

    error_occurred: "❌ Произошла ошибка. Пожалуйста, попробуйте позже.",
    back_button: "⬅️ Назад"
  }
};

// Get text by key (Russian only)
function getText(lang, key, replacements = {}) {
  const text = languages.ru[key] || key;

  // Replace placeholders like {transaction_id}
  return Object.keys(replacements).reduce((str, key) => {
    return str.replace(`{${key}}`, replacements[key]);
  }, text);
}

// Get available languages (Russian only)
function getAvailableLanguages() {
  return ['ru'];
}

module.exports = {
  languages,
  getText,
  getAvailableLanguages
};
