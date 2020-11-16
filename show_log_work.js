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
    var jqlQuery = `worklogDate >= "-${config.dayInPast}d" and worklogDate <= "-${config.dayInPast}d" and worklogAuthor in (${developers})`;
    var prWorklogs = m_jira.getIssuesByFilter(jqlQuery,"worklog");
    prWorklogs.then(
        result => {
            //log.info(`${result}`);
            var teamWorklog = parseWorklog(teamData,JSON.parse(result));
            sendReportMessage(teamWorklog); // ssbot-test2 ss-head
        },
        error => {
            //log.info(`${JSON.stringify(error)}`);
        }
    )
}

function sendReportMessage(teamWorklog){
    var message = "Что мы делали вчера:"
    var shortInfo = "";
    var fullInfo = "";
    for (let x of teamWorklog) {
        var percent = (((x.timeSummaru/60/60)*100)/8).toFixed(0);
        var emojy = "";
        if (percent > 100) {
            emojy = ":zany_face:";
        } else if (percent <= 100 && percent >= 80) {
            emojy = ""; // :thumbsup:
        } else {
            emojy = ":face_with_monocle:";
        }
        shortInfo+=`\n${x.key} - ${percent}% (${(x.timeSummaru/60/60).toFixed(1)} ч.) ${emojy}`
        fullInfo+=`\n*${x.key}*`
        for (let y of x.worklog) {
            fullInfo+=`\n${y.key} - ${(y.timeSpentSeconds/60/60).toFixed(1)} (${y.timeSpentHR})`
        }
    }
    //
    message+=`${shortInfo}`;
    //message+=`\n\n_Детальная информация_${fullInfo}`;
    log.info(`${message}`);
    m_sendmessage.sendMessage(config.room, message, config.toAll);
}

function parseWorklog(team, worklogs){
    //log.info(`${JSON.stringify(worklogs)}`);
    // готовим данные для возврата из функции
    var res = [];
    for (let dev of team) {
        res.push({"key":dev.key, "role":dev.role, "worklog":[]});
    }
    // формируем плоский массив по задачам и затраченному времени
    var issues = [];
    if (worklogs.total > 0) {
        for (let issue of worklogs.issues) {
            for (let issueWorklog of issue.fields.worklog.worklogs) {
                var d = new Date();
                d.setDate(d.getDate()-4);
                if ( issueWorklog.started.substr(0,10) == `${d.getFullYear()}-${d.getMonth()+1}-${d.getDate()}`) {
                    issues.push({"key":issue.key, "author":issueWorklog.author.key, "timeSpentSeconds":issueWorklog.timeSpentSeconds, "timeSpentHR":issueWorklog.timeSpent});
                    //log.info(`${issueWorklog.started.substr(0,10)} ${d.getFullYear()}-${d.getMonth()+1}-${d.getDate()}`);
                }
            }
        }
    }
    // считаем сумму времени по каждому сотруднику
    for (let dev of res) {
        dev["timeSummaru"] = 0;
        var x = issues.filter(item => item.author == dev.key);
        if (x.length>0) {
            // обходим все зарачи по разработчику
            for (let y of x) {
                // считаем сумму времени по всем задачам
                dev.timeSummaru += y.timeSpentSeconds;
                // считаем сумму времени по одной задачу для детализации
                // проверяем, есть ли уже такая задача в массиве, если нет, добавляем
                var issueX = dev.worklog.find(item => item.key == y.key);
                if (issueX) {
                    issueX.timeSpentSeconds+=y.timeSpentSeconds;
                    issueX.timeSpentHR+=` ${y.timeSpentHR}`
                } else {
                    dev.worklog.push({"key":y.key, "timeSpentSeconds":y.timeSpentSeconds, "timeSpentHR":y.timeSpentHR})
                }
            }
        }
    }
    return res;
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