from telebot import TeleBot, types

TOKEN = "8546085551:AAHEU7wExuSnEk--mxwN2jx_O2I8By-2cjU"

bot = TeleBot(TOKEN)

@bot.message_handler(commands=['start'])
def start(msg):
    kb = types.InlineKeyboardMarkup()
    kb.add(
        types.InlineKeyboardButton(
            text="🃏 Открыть Дурака",
            web_app=types.WebAppInfo(
                url="https://petrovicvovocka-bot.github.io/refactored-octo-rotary-phone/"
            )
        )
    )
    bot.send_message(
        msg.chat.id,
        "Нажми кнопку, чтобы открыть игру:",
        reply_markup=kb
    )

bot.infinity_polling()
