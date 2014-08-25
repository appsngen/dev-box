/**
 * Created by Ruslan_Dulina on 8/19/2014.
 */

(function () {
    'use strict';
    var winston = require('winston');

    var getLogger = function (module) {
        var path = module.filename.split('/').slice(-2).join('/'),
            filename = process.cwd() + '/logs.txt',

            logger = new (winston.Logger)({
                transports: [
                    new (winston.transports.Console)({ colorize: true, label: path}),
                    new (winston.transports.File)({ filename: filename, colorize: true, label: path})
                ]
            });

        return logger;
    };

    module.exports = getLogger;
}());