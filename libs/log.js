const winston = require('winston');

function getLogger(module) {
    var path = module.filename.split('/').slice(-2).join('/');

    return new winston.createLogger({
        transports:[
            new winston.transports.Console({
                colorize: true,
                level:'debug',
                label:path
            }),
            new winston.transports.File({
                filename:'send.log',
                label:path
            })
        ]
    });
}

module.exports = getLogger;