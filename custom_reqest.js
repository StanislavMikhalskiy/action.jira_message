const log = require('./libs/log')(module);
const m_jira = require('./libs/jira');

Date.prototype.getWeek = function() {
    var date = new Date(this.getTime());
    date.setHours(0, 0, 0, 0);
    // Thursday in current week decides the year.
    date.setDate(date.getDate() + 3 - (date.getDay() + 6) % 7);
    // January 4 is always in week 1.
    var week1 = new Date(date.getFullYear(), 0, 4);
    // Adjust to Thursday in week 1 and count number of weeks from date to week1.
    return 1 + Math.round(((date.getTime() - week1.getTime()) / 86400000
        - 3 + (week1.getDay() + 6) % 7) / 7);
}

// Returns the four-digit year corresponding to the ISO week of the date.
Date.prototype.getWeekYear = function() {
    var date = new Date(this.getTime());
    date.setDate(date.getDate() + 3 - (date.getDay() + 6) % 7);
    return date.getFullYear();
}

var jqlQuery = `project = SS and issuetype=Bug and created > "2020/03/01" and summary !~ Auto`;//
var prQueryResult = m_jira.getIssuesByFilter(jqlQuery,"customfield_10100,timespent,created,summary");
prQueryResult.then(
    result => {
        //log.info(`${result}`);
        obj = JSON.parse(result);
        var res = "Задача;Наименование;Эпик;Дата;Неделя;Время;\n";
        for (let x of obj.issues) {
            res+=`${x.key};${x.fields.summary};${x.fields.customfield_10100};${x.fields.created.substr(0,10)};${(new Date(x.fields.created.substr(0,10))).getWeek()};${(x.fields.timespent/60/60).toFixed(1)};\n`
        }
        log.info(`${res}`);
    },
    error => {
        //log.info(`${JSON.stringify(error)}`);
    }
)

//var d = new Date("2020-09-11");
//log.info(`${(new Date("2020-09-11")).getWeek()} ${d.getWeekYear()}`);