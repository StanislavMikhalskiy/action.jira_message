const module_sendmessage = require('./libs/sendmessage');
const log = require('./libs/log')(module);

module_sendmessage.sendMessage;

log.info({
    level: 'info',
    message: 'Hello distributed log files!'
});
//log.info((new Date).toDateString()  + 'lll'+ (new Date).toTimeString());

log.warn("dfdsfs");