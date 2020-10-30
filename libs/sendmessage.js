const myconfig = require('./myconfig');
const credentials = require('./credentials');
const log = require('./log')(module);
const fetch = require("node-fetch");

function sendTestMessage() {
    var messageBody= {
        "channel": "#ssbot-test2", // #team-ss #ssbot-test2
        "text": "Привет"
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
            Smart_log(ln+`response.status = ${response.status}`);
            if (response.status != "200") {
                //Smart_log(ln+`Ошибка при создании задач в эпике поддержки status = ${response.status}`);
                response.json().then(function(data) {
                    Smart_log(ln+`error ${JSON.stringify(data)}`);
                });
            } else {
                response.json().then(function(data) {
                    //Smart_log(ln+`Ответ ${JSON.stringify(data)}`);
                })
            }
        }
    )
        .catch(function (error) { /*Smart_log(ln+`Ошибка при создании задач в эпике поддержки ${error}`);*/ });

}

function sendMessage() {
    log.info(sendMessage.name);
}

module.exports.sendMessage = sendMessage();