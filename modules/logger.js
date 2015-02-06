/**
 * Created by Ruslan_Dulina on 8/19/2014.
 */

/**
 * Created by Ruslan_Dulina on 8/18/2014.
 */
(function () {
    'use strict';
    var winston = require('winston');
    var fs = require('fs');
    var date = new Date();
    var loggerConfiguration = JSON.parse(fs.readFileSync(__dirname + '/../serverconfig.json')).logger;
    var dateFormat = function (date) {
        var yyyy = date.getFullYear().toString();
        var m = (date.getMonth() + 1).toString();
        var dd = date.getDate().toString();
        var hh = date.getHours().toString();
        var mm = date.getMinutes().toString();
        var ss = date.getSeconds().toString();
        var result = yyyy + '_' +
            (m[1] ? m : '0' + m[0]) + '_' +
            (dd[1] ? dd : '0' + dd[0]) + '_' +
            (hh[1] ? hh : '0' + hh[0]) + '_' +
            (mm[1] ? mm : '0' + mm[0]) + '_' +
            (ss[1] ? ss : '0' + ss[0]);

        return result;
    };
    var filename = 'devbox_' + dateFormat(date) + '.log', loggerFolderPath = __dirname + '/../logs/';
    var traceCaller = function (lineNumber) {
        var postfixIndex;
        if (isNaN(lineNumber) || lineNumber < 0) {
            lineNumber = 1;
        }

        lineNumber += 1;
        var result = (new Error()).stack, prefixIndex = result.indexOf('\n', 5);
        while (lineNumber--) {
            prefixIndex = result.indexOf('\n', prefixIndex + 1);
            if (prefixIndex < 0) {
                prefixIndex = result.lastIndexOf('\n', result.length);
                break;
            }
        }

        postfixIndex = result.indexOf('\n', prefixIndex + 1);
        if (postfixIndex < 0) {
            postfixIndex = result.length;
        }

        prefixIndex = Math.max(result.lastIndexOf(' ', postfixIndex), result.lastIndexOf('/', postfixIndex));
        postfixIndex = result.lastIndexOf(':', postfixIndex);
        result = result.substring(prefixIndex + 1, postfixIndex);

        return result;
    };

    /**
     * Setup transports to be shared across all loggers
     * By setting it on the default Container
     * @type {Array}
     */
    winston.loggers.options.transports = [
        new (winston.transports.Console)({
            colorize: true,
            timestamp: true
        }),
        new (winston.transports.File)({
            filename: loggerFolderPath + filename,
            colorize: true,
            maxsize: 1000000,
            maxFiles: 100,
            timestamp: true,
            prettyPrint: true,
            json: true
        })
    ];
    var getLogger = function (module) {
        var logger, oldErrorFunction;
        if (!fs.existsSync(loggerFolderPath)) {
            fs.mkdirSync(loggerFolderPath);
        }

        winston.loggers.add(module.id);

        logger = winston.loggers.get(module.id);
        /**
         * Each instance of winston.Logger is also has his own
         * @type {String}
         */
        logger.transports.console.label = module.filename;
        logger.transports.console.level = loggerConfiguration.levels.console;
        logger.transports.file.label = module.filename;
        logger.transports.file.level = loggerConfiguration.levels.file;
        oldErrorFunction = logger.error;
        logger.error = function () {
            var args = Array.prototype.slice.call(arguments);
            args.unshift(traceCaller(1));

            oldErrorFunction.apply(logger, args);
        };

        return logger;
    };

    module.exports = getLogger;
}());
