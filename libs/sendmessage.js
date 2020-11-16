const myconfig = require('./myconfig');
const credentials = require('./credentials');
const log = require('./log')(module);
const fetch = require("node-fetch");

var sendMessage = function(room, message, toAll) {
    const uid = Math.random().toString(26).slice(2);
    if (!room) {
        log.warn("Не задан параметр 'room'");
        return;
    }
    if (!message) {
        log.warn("Не задан параметр 'message'");
        return;
    }
    var mess_toAll = "";
    if (toAll) {
        mess_toAll="@all "
    }
    var messageBody= {
        "channel": `#${room}`, // #team-ss #ssbot-test2
        "text": `${mess_toAll}${message}`
    }

    let url = new URL(myconfig.rocket.url.postMessage);
    fetch(url, {
        method: 'post',
        headers: {
            "Content-type": "application/json; charset=utf-8",
            "X-User-Id":credentials.rocket.user["X-User-Id"],
            "X-Auth-Token":credentials.rocket.user["X-Auth-Token"]
        },
        body: JSON.stringify(messageBody)
    }).then(
        function(response) {
            if (response.status != "200") {
                log.error(`Ошибка отправки сообщения, response.status = ${response.status} (uid=${uid})`);
                log.error(`room = ${room} (uid=${uid})`);
                response.json().then(function(data) {
                    log.error(`${JSON.stringify(data)} (uid=${uid})`);
                });
            } else {
                log.info(`Сообщение успешно отправлено (uid=${uid})`);
                /*response.json().then(function(data) {
                    //Smart_log(ln+`Ответ ${JSON.stringify(data)}`);
                })*/
            }
        }
    )
        .catch(function (error) {
            log.error(`Ошибка отправки сообщения ${error} (uid=${uid})`);
        });
}

module.exports.sendMessage = sendMessage;