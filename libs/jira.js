const log = require('./log')(module);
const fetch = require("node-fetch");
const credentials = require('./credentials');

// глобальные пемеренные
var jiraURL = "https://jira.action-media.ru"
var vGlobal = {
    "jira": {
        "viewIssue":jiraURL+"/browse/",
        "getIssue":jiraURL+"/rest/api/2/issue/", // vGlobal.jira.getIssue
        "postIssue":jiraURL+"/rest/api/2/issue/", // vGlobal.jira.postIssue
        "searchIssue":jiraURL+"/rest/api/2/search", // vGlobal.jira.searchIssue
        "postIssueBulk":jiraURL+"/rest/api/2/issue/bulk/", // vGlobal.jira.postIssueBulk
        "postIssueLink":jiraURL+"/rest/api/2/issueLink/", // vGlobal.jira.postIssueLink
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
                    log.error(`${JSON.stringify(data)} `);
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
                    log.error(`Ошибка выполнения запроса, response.status = ${response.status} `);
                    response.json().then(function(data) {
                        log.error(`${JSON.stringify(data)} `);
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
module.exports.getIssuesByFilter = getIssuesByFilter