const log = require('./libs/log')(module);
const m_jira = require('./libs/jira');
const m_sendmessage = require('./libs/sendmessage');
const arguments = require('yargs').argv;

// параметры командной строки
// --room=ssbot-test2 --rapidView=136 --day=1 --toAll=1
//
if (!arguments.rapidView) {
    log.warn("Не задан параметр 'rapidView'");
    process.exit(0);
}

if (!arguments.room) {
    log.warn("Не задан параметр 'room'");
    process.exit(0);
}

var _dayInPast = 1;
if (arguments.day) {
    _dayInPast = arguments.day;
}

var _toAll = false;
if (arguments.toAll == 1) {
    _toAll=true;
}

/*
TODO

 Входящие данные
 - команда
 - дата

 Получаем все задачи, измененные за прошлый день по

 https://jira.action-media.ru/rest/api/2/search?
 fields=project,issuetype,resolution,summary,priority,status,parent,issuelinks,worklog,
 customfield_10100&maxResults=1000&
 jql=project%3D%2210900%22%20and%20worklogDate%20%3E%3D%20%222020-10-29%22%20and%20worklogDate%20%3C%20%222020-11-07%22&startAt=0&_=1605275998929

* */
var config = {
    "rapidView": arguments.rapidView, //"136"
    "room": arguments.room, //ssbot-test2 ss-head
    "dayInPast": _dayInPast,
    "toAll": _toAll
}

// считываем настройки по командам
var prTeamsConfigData =  m_jira.getIssue("PSQL-222","description");
prTeamsConfigData.then(
    result => {
        var obj = JSON.parse(result);
        if ('fields' in obj && obj.fields != null) {
            if ('description' in obj.fields && obj.fields.description != null) {
                // очистка данных
                var x = JSON.stringify(obj.fields.description).replace(/{code:json}|{code}|\\r|\\n|\\/g, '');
                x = x.replace(/"\[{/g, '[{');
                x = x.replace(/}\]"/g, '}]');
                var teamsData = JSON.parse(x);
                // обходим полученный массив комманд
                for (let teamData of teamsData) {
                    //log.info(`teamData.rapidView ${teamData.rapidView}`);
                    if ('rapidView' in teamData && teamData.rapidView != null && teamData.rapidView==config.rapidView) {
                        //log.info(`Нашли команду ${JSON.stringify(teamData.team)}`);
                        getWorkTime(teamData.team);
                        break;
                    }
                }
                //log.warn(`Данные по команде не получены`);
            } else log.error(`Нет данных по полю "description"`);
        } else log.error(`Нет данных по полю "fields"`);
        },
    error => {
        log.error(`Не удалось считать настройки по командам`);
    }
)

function getWorkTime(teamData){
    // формируем данные для запроса
    var developers = "";
    for (let dev of teamData) {
        developers+=dev.key+",";
    }
    developers = developers.slice(0,-1); // удаляем последнюю лишнюю запятую
    var addJQLDebug = ''; //`and issue in (SS-12024,SS-11970,SS-11834,SS-12008,SS-12062,SS-12061,SS-12060,SS-12019,SS-12050,SS-12102,SS-12056,SS-12088,SS-12030,SS-11981,SS-12085,SS-12070)`;
    var jqlQuery = `worklogDate >= "-${config.dayInPast}d" and worklogDate <= "-${config.dayInPast}d" and worklogAuthor in (${developers}) ${addJQLDebug}`;//
    var prWorklogs = m_jira.getIssuesByFilter(jqlQuery,"key");
    prWorklogs.then(
        result => {
            //log.info(`${result}`);
            parseWorklogSlowly(teamData,JSON.parse(result));
        },
        error => {
            log.error(`Ошибка ${JSON.stringify(error)}`);
        }
    )
}

function sleepFor( sleepDuration ){
    var now = new Date().getTime();
    while(new Date().getTime() < now + sleepDuration){ /* do nothing */ }
}

// синхронный запрос ворклогов для борьбы с ограничениями API от админов
function parseWorklogSlowly(team, obj){
    //log.info(`${JSON.stringify(obj)}`);
    // готовим данные для возврата из функции
    var developersWorklog = [];
    for (let dev of team) {
        developersWorklog.push({"key":dev.key, "role":dev.role, "worklog":[]});
    }
    // вычисляем дату
    var d = new Date();
    d.setDate(d.getDate()-config.dayInPast);
    // формируем строку для сравнения
    var date_compare = `${d.getFullYear()}-${d.getMonth()+1}-${d.getDate()}`;
    // формируем плоский массив по задачам и затраченному времени
    var issues = [];
    if (obj.total > 0) {
        // обходим все задачи и для каждой формируем запрос ворклогов
        var issuesWorklogsPromise =  m_jira.getIssuesWorklogs(obj.issues);
        issuesWorklogsPromise.then(
            result => {
                //log.info(`${result[0]}`);
                // обходим результаты по задачам
                for(let issueWorklogs of result){
                    let objIssueWorklogs = JSON.parse(issueWorklogs);
                    // обходим worklog-и по задаче
                    for(let worklog of objIssueWorklogs.worklogs){
                        //log.info(`${worklog.issueId}`);
                        if ( worklog.started.substr(0,10) == date_compare) {
                            issues.push({"key":"", "issueId":worklog.issueId, "author":worklog.author.name, "timeSpentSeconds":worklog.timeSpentSeconds, "timeSpentHR":worklog.timeSpent});
                        }
                    }
                }
                // считаем сумму времени по каждому сотруднику
                for (let dev of developersWorklog) {
                    dev["timeSummaru"] = 0;
                    var x = issues.filter(item => item.author == dev.key);
                    if (x.length>0) {
                        // обходим все зарачи по разработчику
                        for (let y of x) {
                            // считаем сумму времени по всем задачам
                            dev.timeSummaru += y.timeSpentSeconds;
                            // считаем сумму времени по одной задачу для детализации
                            // проверяем, есть ли уже такая задача в массиве, если нет, добавляем
                            var issueX = dev.worklog.find(item => item.issueId == y.issueId);
                            if (issueX) {
                                issueX.timeSpentSeconds+=y.timeSpentSeconds;
                                issueX.timeSpentHR+=` ${y.timeSpentHR}`
                            } else {
                                dev.worklog.push({"issueId":y.issueId, "timeSpentSeconds":y.timeSpentSeconds, "timeSpentHR":y.timeSpentHR})
                            }
                        }
                    }
                }
                sendReportMessage(developersWorklog,date_compare); // ssbot-test2 ss-head
            },
            error => {
                log.error(`Ошибка ${JSON.stringify(error)}`);
            }
        )
    }
}

function parseWorklog(team, obj){
    //log.info(`${JSON.stringify(obj)}`);
    // готовим данные для возврата из функции
    var developersWorklog = [];
    for (let dev of team) {
        developersWorklog.push({"key":dev.key, "role":dev.role, "worklog":[]});
    }
    // вычисляем дату
    var d = new Date();
    d.setDate(d.getDate()-config.dayInPast);
    // формируем строку для сравнения
    var date_compare = `${d.getFullYear()}-${d.getMonth()+1}-${d.getDate()}`;
    // формируем плоский массив по задачам и затраченному времени
    var issues = [];
    if (obj.total > 0) {
        // обходим все задачи и для каждой формируем запрос ворклогов
        var issuePromise = [];
        for (let issue of obj.issues) {
            var promise = m_jira.getIssueWorklog(issue.key);
            //sleepFor(300);
            issuePromise.push(promise);
            log.info(`Добавили промис для ${issue.key}`);
        }
        Promise.all(issuePromise)
            .then(responses => {
                    // все промисы успешно завершены
                    log.info(`Промисы успешно отработали`);
                    /*for(let response of responses) {
                        var obj_res = JSON.parse(response);
                        log.info(`Ответ каждого промиса ${obj_res.worklogs[0].issueId}`);
                        // обходим результаты ворклогов позадачно
                        for (let worklog of obj_res.worklogs){
                            if ( worklog.created.substr(0,10) == date_compare) {
                                issues.push({"key":"", "issueId":worklog.issueId, "author":worklog.author.name, "timeSpentSeconds":worklog.timeSpentSeconds, "timeSpentHR":worklog.timeSpent});
                            }
                        }
                    }
                    // считаем сумму времени по каждому сотруднику
                    for (let dev of developersWorklog) {
                        dev["timeSummaru"] = 0;
                        var x = issues.filter(item => item.author == dev.key);
                        if (x.length>0) {
                            // обходим все зарачи по разработчику
                            for (let y of x) {
                                // считаем сумму времени по всем задачам
                                dev.timeSummaru += y.timeSpentSeconds;
                                // считаем сумму времени по одной задачу для детализации
                                // проверяем, есть ли уже такая задача в массиве, если нет, добавляем
                                var issueX = dev.worklog.find(item => item.issueId == y.issueId);
                                if (issueX) {
                                    issueX.timeSpentSeconds+=y.timeSpentSeconds;
                                    issueX.timeSpentHR+=` ${y.timeSpentHR}`
                                } else {
                                    dev.worklog.push({"issueId":y.issueId, "timeSpentSeconds":y.timeSpentSeconds, "timeSpentHR":y.timeSpentHR})
                                }
                            }
                        }
                    }
                    sendReportMessage(developersWorklog); // ssbot-test2 ss-head
                     */
                },
                error => {
                    //log.error(`${JSON.stringify(error)} `);
                    log.error(`Ошибка ${JSON.stringify(error)}`);
                }
            )
        //.catch(log.error(`Ошибка обработки промисов`));
    }
}

function sendReportMessage(teamWorklog, date){
    var message = `Что мы делали ${date}:`
    var shortInfo = "";
    var fullInfo = "";
    for (let x of teamWorklog) {
        var percent = (((x.timeSummaru/60/60)*100)/8).toFixed(0);
        var emojy = "";
        if (percent > 110) {
            emojy = ":zany_face:";
        } else if (percent <= 110 && percent >= 80) {
            emojy = ""; // :thumbsup:
        } else {
            emojy = ":face_with_monocle:";
        }
        shortInfo+=`\n${x.key} - ${percent}% (${(x.timeSummaru/60/60).toFixed(1)} ч.) ${emojy}`
        fullInfo+=`\n*${x.key}*`
        for (let y of x.worklog) {
            fullInfo+=`\n${y.issueId} - ${(y.timeSpentSeconds/60/60).toFixed(1)} (${y.timeSpentHR})`
        }
    }
    //
    message+=`${shortInfo}`;
    //message+=`\n\n_Детальная информация_${fullInfo}`;
    log.info(`${message}`);
    m_sendmessage.sendMessage(config.room, message, config.toAll);
}

/*
// project = SS  and worklogDate >= "-1d" and worklogDate <= "-1d"  and worklogAuthor = S.Mikhalskii
var prWorklogs = m_jira.getIssuesByFilter(jqlQuery,"worklog");
issuesPromise.then(
    result => {
        //log.info(`${result}`);
    },
    error => {
        //log.info(`${JSON.stringify(error)}`);
    }
)
*/