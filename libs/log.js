const { createLogger, format, transports } = require('winston');
const { combine, timestamp, printf, label } = format;
var appRoot = __dirname; //process.cwd();

const myFormat = printf(({ level, message, timestamp, label}) => {
    return `${level} ${timestamp} : ${message} [${label}]`;
});

function getLogger(module) {
    var path = module.filename.split('/').slice(-1).join('/');

    return new createLogger({
        transports: [
            new transports.Console({
                format: format.combine(
                    label({ label: path }),
                    format.errors({ stack: true }),
                    format.splat(),
                    //format.json(),
                    format.timestamp({
                        format: 'YYYY-MM-DD HH:mm:ss.SSS'
                    }),
                    format.colorize(),
                    myFormat
                )
            }),
            new transports.File({
                filename: appRoot+'/log/send.log',
                format: format.combine(
                    label({ label: path }),
                    format.errors({ stack: true }),
                    format.splat(),
                    //format.json(),
                    format.timestamp({
                        format: 'YYYY-MM-DD HH:mm:ss.SSS'
                    }),
                    myFormat
                )
            }),
        ],
    });
}

//
// If we're not in production then log to the `console` with the format:
// `${info.level}: ${info.message} JSON.stringify({ ...rest }) `
//
/*if (process.env.NODE_ENV !== 'production') {
    logger.add(new winston.transports.Console({
        format: winston.format.simple(),
    }));
}*/


module.exports = getLogger;