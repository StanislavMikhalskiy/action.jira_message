const log = require('./libs/log')(module);
const m_jira = require('./libs/jira');

log.info("Go-go-go!");

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

var issuePromise =  m_jira.getIssue("SS-11886");
issuePromise.then(
    result => {
        //log.info("ok");
        //log.info(`${JSON.stringify(result)}`);
        },
    error => {
        //log.info(`${JSON.stringify(error)}`);
    }
)
