const module_sendmessage = require('./libs/sendmessage');
const log = require('./libs/log')(module);

module_sendmessage.sendMessage;

log.info('test');
log.info((new Date).toString() + 'lll', "wewf");