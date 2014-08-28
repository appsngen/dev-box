/**
 * Created by Ruslan_Dulina on 8/28/2014.
 */
(function () {
    'use strict';
    var fs = require('fs'),
        logger = require('./logger')(module);

    exports.readFile = function (filename, callback, errorCallback) {
        var message;
        fs.exists(filename, function (exists) {
            if (!exists) {
                message = 'Can not find file ' + filename;
                logger.error(message);
                errorCallback(message);
            }
            else {
                fs.readFile(filename, function (error, data) {
                    if (error) {
                        message = 'Can not read file ' + filename;
                        logger.error(message);
                        errorCallback(message);
                    }
                    else {
                        callback(data);
                    }
                });
            }
        });
    };

    exports.readFileBinary = function (filename, callback, errorCallback) {
        var message;
        fs.exists(filename, function (exists) {
            if (!exists) {
                message = 'Can not find file ' + filename;
                logger.error(message);
                errorCallback(message);
            }
            else {
                fs.readFile(filename, 'binary', function (error, data) {
                    if (error) {
                        message = 'Can not read file ' + filename;
                        logger.error(message);
                        errorCallback(message);
                    }
                    else {
                        callback(data);
                    }
                });
            }
        });
    };

    exports.writeFile = function (filename, data, callback, errorCallback) {
        fs.writeFile(filename, data, function (error) {
            if (error) {
                logger.error(error);
                errorCallback(error);
            }
            else {
                callback();
            }
        });
    };

    exports.exist = function (path, callback) {
        fs.exists(path, function (exists) {
            callback(exists);
        });
    };
}());