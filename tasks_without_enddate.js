const log = require('./libs/log')(module);
const m_jira = require('./libs/jira');
const m_sendmessage = require('./libs/sendmessage');
const arguments = require('yargs').argv;

if (!arguments.rapidView) {
    log.warn("Не задан параметр 'rapidView'");
    process.exit(0);
}

if (!arguments.room) {
    log.warn("Не задан параметр 'room'");
    process.exit(0);
}

let config = {
    "rapidView": arguments.rapidView, //"136"
    "room": arguments.room // "ss"
}

// считываем настройки по командам
let prTeamsConfigData =  m_jira.getIssue("PSQL-222","description");
prTeamsConfigData.then(
    result => {
        let obj = JSON.parse(result);
        if ('fields' in obj && obj.fields != null) {
            if ('description' in obj.fields && obj.fields.description != null) {
                // очистка данных
                let x = JSON.stringify(obj.fields.description).replace(/{code:json}|{code}|\\r|\\n|\\/g, '');
                x = x.replace(/"\[{/g, '[{');
                x = x.replace(/}\]"/g, '}]');
                let teamsData = JSON.parse(x);
                // обходим полученный массив комманд
                for (let teamData of teamsData) {
                    //log.info(`teamData.rapidView ${teamData.rapidView}`);
                    if ('rapidView' in teamData && teamData.rapidView != null && teamData.rapidView==config.rapidView) {
                        //log.info(`Нашли команду ${JSON.stringify(teamData.team)}`);

                        // запускаем процесс
                        getTasksWithOutEndDate(teamData.team);
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

function getTasksWithOutEndDate(teamData){
    // формируем данные для запроса
    let developers = "";
    for (let dev of teamData) {
        developers+=dev.key+",";
    }
    developers = developers.slice(0,-1); // удаляем последнюю лишнюю запятую
    let addJQLDebug = ''; //`and issue in (SS-12024,SS-11970,SS-11834,SS-12008,SS-12062,SS-12061,SS-12060,SS-12019,SS-12050,SS-12102,SS-12056,SS-12088,SS-12030,SS-11981,SS-12085,SS-12070)`;
    let jqlQuery = `project = "Справочные системы" and Sprint in openSprints() and status in (Open, "In Progress") and "End date" is EMPTY and (labels != TimeReserve or labels is EMPTY ) ${addJQLDebug}`;//
    let prTasks = m_jira.getIssuesByFilter(jqlQuery,"key, assignee");
    prTasks.then(
        result => {
            //log.info(`${result}`);
            parseResult(teamData,JSON.parse(result));
        },
        error => {
            log.error(`Ошибка ${JSON.stringify(error)}`);
        }
    )
}

function parseResult(team, obj){
    //log.info(`${JSON.stringify(obj)}`);

    let developers = [];
    let issues = [];
    if (obj.total > 0) {
        // получаем список разработчиков
        for (let dev of team) {
            developers.push({"key":dev.key, "tasks":[]});
        }
        // получаем список задач
        for(let issue of obj.issues){
            issues.push({"key": issue.key,"assignee":issue.fields.assignee.name});
        }
        let canSendMessage = false;
        // смотрим по каждому сотруднику
        for (let developer of developers) {
            let x = issues.filter(item => item.assignee == developer.key);
            if (x.length>0) {
                canSendMessage = true;
                // обходим все зарачи по разработчику
                for (let y of x) {
                    developer.tasks.push({"key": y.key});
                    log.info(`${developer.key} ${y.key}`);
                }
            }
        }
        if (canSendMessage) sendReportMessage(developers);
    }
}

function sendReportMessage(developers){
    let message = {};
    let messages = [];
    for (let developer of developers) {
        if (developer.tasks.length>0) {
            message = {
                "type": "section",
                "sections": [
                    {
                        "type": "message",
                        "text": `${developer.key} - ${developer.tasks.length}`
                    }
                ]
            }
            for (let task of developer.tasks) {
                message.sections.push({"type": "message","text":`https://jira.action-media.ru/browse/${task.key}`});
            }
            messages.push(message);
        }
    }

    let mess = {
        "is_markdown_support": true,
        "content": {
            "head": {
                "text": `Задачи без указания даты готовности`,
                "sub_head": {
                    "text": `EndDate`
                }
            },
            "body": messages
        }
    }
    m_sendmessage.sendMessageZoomWH(config.room,mess)
}