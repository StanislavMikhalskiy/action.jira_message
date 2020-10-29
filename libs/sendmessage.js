const myconfig = require('./myconfig');

const fetch = require("node-fetch");

var log_level = 1;
var logPrefix = ""

function Smart_log(value){
    var l = '';
    for(var i = 0; i<log_level; i++) l+="|-";
    var dt = new Date();
    console.log(`${dt.getHours()}:${dt.getMinutes()}:${dt.getSeconds()}.${dt.getMilliseconds()} ${logPrefix}${l}${value}`);
}

Smart_log("Начало работы");

function sendTestMessage() {
    log_level++;
    var ln = "sentTestMessage: ";
    Smart_log(ln+`Начало работы`);

    var messageBody= {
        "channel": "#ssbot-test2", // #team-ss #ssbot-test2
        "text": "Привет"
    }

    let url = new URL(myconfig.rocket.url.postMessage);
    fetch(url, {
        method: 'post',
        headers: {
            "Content-type": "application/json; charset=utf-8",
            "X-User-Id":myconfig.rocket.user["X-User-Id"],
            "X-Auth-Token":myconfig.rocket.user["X-Auth-Token"]
        },
        body: JSON.stringify(messageBody)
    }).then(
        function(response) {
            Smart_log(ln+`response.status = ${response.status}`);
            if (response.status != "200") {
                Smart_log(ln+`Ошибка при создании задач в эпике поддержки status = ${response.status}`);
                response.json().then(function(data) {
                    Smart_log(ln+`error ${JSON.stringify(data)}`);
                });
            } else {
                response.json().then(function(data) {
                    Smart_log(ln+`Ответ ${JSON.stringify(data)}`);
                })
            }
        }
    )
        .catch(function (error) { Smart_log(ln+`Ошибка при создании задач в эпике поддержки ${error}`); });

    log_level--;
}

function sendMessage() {
    console.log("uwhefjwoeif");
}

module.exports.sendMessage = sendMessage();