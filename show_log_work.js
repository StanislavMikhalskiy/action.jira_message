const log = require('./libs/log')(module);
const m_jira = require('./libs/jira');

//log.info("Go-go-go!");

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
var rapidView = "136";
// считываем настройки по командам
var prTeamsConfigData =  m_jira.getIssue("PSQL-222","description");
prTeamsConfigData.then(
    result => {
        //log.info("ok");
        //log.info(`${result}`);
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
                    if ('rapidView' in teamData && teamData.rapidView != null && teamData.rapidView==rapidView) {
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
    var jqlQuery = `worklogDate >= "-3d" and worklogDate <= "-1d" and issue =SS-11894 and worklogAuthor in (${developers})`;
    var prWorklogs = m_jira.getIssuesByFilter(jqlQuery,"worklog");
    prWorklogs.then(
        result => {
            //log.info(`${result}`);
            var teamWorklog = parseWorklog(teamData,JSON.parse(result));
            sendReportMessage(teamWorklog,"ssbot-test2");
        },
        error => {
            //log.info(`${JSON.stringify(error)}`);
        }
    )
}

function sendReportMessage(teamWorklog, channel){

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
                issues.push({"key":issue.key, "author":issueWorklog.author.key, "timeSpentSeconds":issueWorklog.timeSpentSeconds, "timeSpentHR":issueWorklog.timeSpent});
            }
        }
    }
    // считаем сумму времени по каждому сотруднику
    for (let dev of res) {
        dev["timeSummaru"] = 0;
        var x = issues.filter(item => item.author == dev.key);
        if (x.length>0) {
            //dev.worklog = x;
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
    //log.info(`${JSON.stringify(res)}`);
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