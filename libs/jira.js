const log = require('./log')(module);
const fetch = require("node-fetch"); // npm install node-fetch
const XMLHttpRequest = require("xmlhttprequest").XMLHttpRequest;
const credentials = require('./credentials');

// глобальные пемеренные
var jiraURL = "https://jira.action-media.ru"
var vGlobal = {
    "jira": {
        "viewIssue":jiraURL+"/browse/",
        "getIssue":jiraURL+"/rest/api/2/issue/", // vGlobal.jira.getIssue
        "postIssue":jiraURL+"/rest/api/2/issue/", // vGlobal.jira.postIssue
        "getWorklog":jiraURL+"/rest/api/2/issue/", // `vGlobal.jira.getWorklog${issueIdOrKey}/worklog`
        "searchIssue":jiraURL+"/rest/api/2/search", // vGlobal.jira.searchIssue
        "postIssueBulk":jiraURL+"/rest/api/2/issue/bulk/", // vGlobal.jira.postIssueBulk
        "postIssueLink":jiraURL+"/rest/api/2/issueLink/", // vGlobal.jira.postIssueLink
        board_team_config:"https://dev.gitlab-pages.aservices.tech/jira-automatizator-scripts/planningConfig.json",
        "fields":{
            "epicLink":"customfield_10100", // vGlobal.jira.fields.epicLink
            "epicName":"customfield_10102", // vGlobal.jira.fields.epicName
            "businessCase":"customfield_11610", // vGlobal.jira.fields.businessCase
            "team":"customfield_11601", // vGlobal.jira.fields.team
            "components":{
                "SS":"10014", // vGlobal.jira.fields.components.SS
                "SEARCH":"10006",
                "WARM":"10010"
            },
            "businessCases":{
                "bigPicture":"11851" // vGlobal.jira.fields.businessCases.bigPicture
            },
            "teams":{
                "SS":"11830", // vGlobal.jira.fields.teams.SS
                "SEARCH":"11855",
                "WARM":"11856"
            },
            "issueTypes":{
                "bcklg":{
                    "iniciative":"10903", // vGlobal.jira.fields.issueTypes.bcklg.iniciative
                    "backendSub":"11001", // vGlobal.jira.fields.issueTypes.bcklg.backendSub
                    "frontendSub":"11002", // vGlobal.jira.fields.issueTypes.bcklg.frontendSub
                    "testSub":"11005" // vGlobal.jira.fields.issueTypes.bcklg.testSub
                },
                "dev":{
                    "epic":"10000",
                    "task":"10214" // vGlobal.jira.fields.issueTypes.dev.task
                },
                "support":{
                    "dev":"10902" // vGlobal.jira.fields.issueTypes.support.dev
                }
            },
            "issuePriorities":{
                "support":{
                    "high":"2" // vGlobal.jira.fields.issuePriorities.support.high
                }
            }
        }
    }
}

function sleepFor( sleepDuration ){
    var now = new Date().getTime();
    while(new Date().getTime() < now + sleepDuration){ /* do nothing */ }
}

/* из-за ограничений на кол-во одновременных запросов городим такой огород */
function getIssuesWorklogs(issues){
    return new Promise(function(resolve,reject) {
        // начало цепочки
        let chain = Promise.resolve();
        // массив выходных значений
        let results = [];
        for (let issue of issues) {
            //log.info(`${issue.key} Запускаем получение данных`);
            let url = new URL(`${vGlobal.jira.getWorklog}${issue.key}/worklog`);
            chain = chain
                .then(() => httpGet(url))
                .then(response => {
                        //log.info(`${issue.key} Получили данные ${response}`);
                        results.push(response);
                    },
                    error => {
                        //log.error(`Ошибка ${error}`);
                    });
        }
        chain.then(() => {
            //log.info(`Обработка данных завершена`);
            //log.info(`results.length = ${results.length}`);
            resolve(results);
            //log.info(`${JSON.stringify(results[0])}`);
        })
    });
}
// используем XMLHttpRequest
function httpGet(url) {
    return new Promise(function(resolve, reject) {
        var xhr = new XMLHttpRequest();
        xhr.open('GET', url, true);
        xhr.setRequestHeader("Content-type", "application/json");
        xhr.setRequestHeader("Authorization", credentials.jira.Authorization);

        xhr.onload = function() {
            //log.info(`response = ${this.responseText}`);
            if (this.status == 200) {
                //log.info(`response = ${this.responseText}`);
                resolve(this.responseText);
            } else {
                log.info(`status = ${this.status}, response = ${this.responseText}`);
                //var error = new Error(this.statusText);
                //error.code = this.status;
                reject(this.responseText);
            }
        };
        xhr.onerror = function() {
            reject(new Error("Network Error"));
        };
        xhr.send();
    });
}

// возвращает объект запрошенной задачи
function getIssue(issueCode,fields){
    return new Promise(function(resolve,reject){
        let url = new URL(vGlobal.jira.getIssue+issueCode);
        if (fields) url.searchParams.set("fields", fields);
        fetch(url, {
            method: 'get',
            headers: {
                "Content-type": "application/json; charset=utf-8",
                "Authorization":credentials.jira.Authorization
            }
        }).then(response => {
            if (response.status != "200") {
                log.error(`Ошибка выполнения запроса для ${issueCode}, response.status = ${response.status} `);
                response.json().then(function(data) {
                    log.error(`${JSON.stringify(data)}`);
                    reject(JSON.stringify(data));
                });
            } else {
                response.json().then(function(data) {
                    resolve(JSON.stringify(data));
                })
            }
            }
        )
    })
}
// возвращает объект запрошенной задачи
function getIssueWorklog(issueCode){
    return new Promise(function(resolve,reject){
        let url = new URL(`${vGlobal.jira.getWorklog}${issueCode}/worklog`);
        //if (fields) url.searchParams.set("fields", fields);
        //url.searchParams.set("maxResults", "1000");
        fetch(url, {
            method: 'get',
            headers: {
                "Content-type": "application/json; charset=utf-8",
                "Authorization":credentials.jira.Authorization
            }
        }).then(response => {
                if (response.status != "200") {
                    log.error(`Ошибка выполнения запроса для ${issueCode}, response.status = ${response.status}`);
                    //log.error(`${JSON.stringify(response)} `);
                    //reject(response);
                    /*response.json().then(function(data) {
                        log.error(`${JSON.stringify(data)}`);
                        reject(JSON.stringify(data));
                    });*/
                    reject(response);
                } else {
                    log.info(`${issueCode} получили ответ`);
                    resolve(response);
                    /*response.json().then(function(data) {
                        log.info(`${issueCode} получили JSON`);
                        resolve(JSON.stringify(data));
                    })*/
                }
            },
            error => {
                //log.error(`${JSON.stringify(error)} `);
                log.error(`Ошибка`);
            }
        )
            .catch(error => {
                log.error(`Ошибка ${error}`);
            });
    })
}
// возвращает результаты работы фильтра
function getIssuesByFilter(jqlQuery, fields){
    var requestParams = [
        {key:'maxResults',value:'1000'},
        {key:'jql',value:jqlQuery},
        {key:'fields',value:fields} // 'assignee,customfield_11304'
        //,{key:'Detail',value:'CalcWorkloadfutureSprint'}
        ];
    return new Promise(function(resolve,reject){
        let url = new URL(vGlobal.jira.searchIssue);
        if (requestParams) {
            for (let x of requestParams) {
                url.searchParams.set(x.key, x.value);
            }
        }
        fetch(url, {
            method: 'get',
            headers: {
                "Content-type": "application/json; charset=utf-8",
                "Authorization":credentials.jira.Authorization
            }
        }).then(response => {
                if (response.status != "200") {
                    log.error(`Ошибка выполнения запроса, status = ${response.status}, message = ${response.statusText}`);
                    /*response.json().then(function(data) {
                        //log.error(`${JSON.stringify(data)}`);
                        reject(JSON.stringify(data));
                    });*/
                    reject(response);
                } else {
                    response.json().then(function(data) {
                        resolve(JSON.stringify(data));
                    })
                }
            },
            error => {
                log.error(`getIssuesByFilter: Ошибка выполнения`);
                reject(error);
            }
        )
    })
}
// асинхронный запрос для получения данных json
async function getJson(url){
    // x-atlassian-mau-ignore: true
    //require('atlassian/analytics/user-activity-xhr-header').uninstall();
    const response = await fetch(url,{
        method: 'GET',
        //mode: 'no-cors',
        cache: 'no-cache'
    });
    //log(`response.status ${response.status}`);
    //log(`response.statusText ${response.statusText}`);
    //require('atlassian/analytics/user-activity-xhr-header').install();
    if (!response.ok) {
        const message = `Ошибка запроса response.status=${response.status}, url=${url}`;
        throw new Error(message);
    }
    const data = await response.json();
    return data
}
function f1(){
    let url = new URL(vGlobal.jira.getIssue+"SS-11886");
    fetch(url, {
        method: 'get',
        headers: {
            "Content-type": "application/json; charset=utf-8",
            "Authorization":credentials.jira.Authorization
        } // curl -u username:password -X GET -H "Content-Type: application/json" http://localhost:8080/rest/api/2/issue/createmeta
    }).then(
        function(response) {
            log.info(`response.status = ${response.status} `);
            if (response.status != "200") {
                log.error(`Ошибка отправки сообщения, response.status = ${response.status} `);
                response.json().then(function(data) {
                    log.error(`${JSON.stringify(data)} `);
                });
            } else {
                log.info(`Сообщение успешно отправлено`);
                response.json().then(function(data) {
                    log.info(`${JSON.stringify(data)}`);
                })
            }
        }
    )
        .catch(function (error) {
            log.error(`Ошибка отправки сообщения ${error}`);
        });
    return "a"
}

function f2(){
    return "b"
}


module.exports.f1 = f1
module.exports.f2 = f2
module.exports.getIssue = getIssue
module.exports.getJson = getJson
module.exports.getIssuesByFilter = getIssuesByFilter
module.exports.getIssueWorklog = getIssueWorklog
module.exports.getIssuesWorklogs = getIssuesWorklogs