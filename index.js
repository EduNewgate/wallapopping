const TelegramBot = require('node-telegram-bot-api');
const https = require('https');
const NodeCache = require( "node-cache" );
const { CONSTANTS } = require('./token');
const { URLS } = require('./urls');
const bot = new TelegramBot(CONSTANTS.TLGRM_TOKEN, {polling: true});
const myCache = new NodeCache();

let searchs = [];

bot.setMyCommands([
    { command: "start", description: "Iniciar bot." },
    { command: "help", description: "Muestra la ayuda." },
    { command: "menu", description: "Muestra el menú." }
]);

bot.onText('/start', (msg) => {
    bot.sendMessage(msg.chat.id, "Bienvenido/a " + msg.from.first_name);
});

bot.onText('/help', (msg) => {
    bot.sendMessage(msg.chat.id, "Ayuda!");
});

bot.onText('/menu', (msg) => {
    const options = {
        reply_markup: {
            resize_keyboard: true,
            one_time_keyboard: true,
            inline_keyboard: [
                [
                    {
                        text: "Crear búsqueda",
                        callback_data: "addSearch"
                    },
                    {
                        text: "Editar búsqueda",
                        callback_data: "editSearch"
                    },
                    {
                        text: "Eliminar búsqueda",
                        callback_data: "deleteSearch"
                    }
                ]
            ]
        }
    }
    bot.sendMessage(msg.chat.id, "Elige una opción", options);
});

bot.on('callback_query', (callbackQuery) => {
    const action = callbackQuery.data;
    const msg = callbackQuery.message;
    const options = {
        chat_id: msg.chat.id,
        message_id: msg.message_id
    }
    if (action === 'addSearch' || action === 'editSearch' || action === 'deleteSearch') {
        if (action === 'addSearch') {
            if (!myCache.get("categories")) {
                const reqOptions = {
                    hostname: URLS.API_HOST,
                    path: URLS.API_BASE_ENDPOINT + URLS.CATEGORIES_ENDPOINT,
                    headers: {
                        "Accept-Language": "es-ES"
                    }
                }
                https.get(reqOptions, (res) => {
                    let data = [];
                    res.on('data', (chunk) => {
                        data.push(chunk);
                    });
                    res.on('end', () => {
                        const categories = JSON.parse(Buffer.concat(data).toString());
                        myCache.set("categories", categories.categories);
                        const options = {
                            reply_markup: {
                                resize_keyboard: true,
                                one_time_keyboard: true,
                                inline_keyboard: buildCatButtons(categories.categories)
                            }
                        }
                        bot.sendMessage(callbackQuery.message.chat.id, 'Seleccione una categoría:', options);
                    });
                }).on('error', err => {
                    console.log('ERROR: ' + err)
                });
            }
        }
        if (action === 'editSearch') {
            bot.sendMessage(options.chat_id, 'Búsqueda editada!');
        }
        if (action === 'deleteSearch') {
            bot.sendMessage(options.chat_id, 'Búsqueda eliminada!');
        }
    } else {
        if (myCache.get("categories")) {
            const categories = myCache.get("categories");
            const catId = +action;
            const subcategories = categories.find((category) => category.id === catId).subcategories;
            if (subcategories) {
                const options = {
                    reply_markup: {
                        resize_keyboard: true,
                        one_time_keyboard: true,
                        inline_keyboard: buildCatButtons(subcategories)
                    }
                }
                bot.sendMessage(callbackQuery.message.chat.id, 'Seleccione una subcategoría:', options);
            } else {

            }
        }
    }
});

function buildCatButtons(categories) {
    let buttonsMatrix = [];
    let catBtn = [];
    for (let index = 0; index < categories.length; index++) {
        const element = categories[index];
        let buttonsMatrixIndex = 0;
        if (index != 0 && index % 2 == 0) {
            buttonsMatrixIndex+=1;
            buttonsMatrix.push(catBtn);
            catBtn = [];
        }
        catBtn.push({text: element.name, callback_data: element.id.toString()});
    }
    return buttonsMatrix;
}