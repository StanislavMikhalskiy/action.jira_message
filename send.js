const arguments = require('yargs').argv;
const module_sendmessage = require('./libs/sendmessage');
const log = require('./libs/log')(module);


if (!arguments.room) {
    log.warn("Не задан параметр 'room'");
    process.exit(0);
}

if (!arguments.message) {
    log.warn("Не задан параметр 'message'");
    process.exit(0);
}

/*for (let x of process.argv) {
    log.info(x);
}*/

//log.info(Math.random().toString(26).slice(2))
//
let mess = {
    "content": {
        "head": {
            "text": "Служба оповещений"
        },
        "body": [
            {
                "type": "message",
                "text": `<!all> ${arguments.message}`
            }
        ]
    }
}

//module_sendmessage.sendMessage(arguments.room, arguments.message, toAll);
//module_sendmessage.sendMessageZoomWH(arguments.room,mess)
module_sendmessage.sendMessageZoomProxy(arguments.room,mess)
