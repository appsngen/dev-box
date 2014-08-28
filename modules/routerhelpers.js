/**
 * Created by Ruslan_Dulina on 8/22/2014.
 */
(function () {
    'use strict';
    var fs = require('fs'),
        http = require('http'),
        logger = require('./logger')(module),
        each = require('async-each-series');
    exports.parseCookies = function (request) {
        var list = {},
            rc = request.headers.cookie, array = rc && rc.split(';');
        if(array){
            array.forEach(function (cookie) {
                var parts = cookie.split('=');
                list[parts.shift().trim()] = decodeURI(parts.join('='));
            });
        }
        
        return list;
    };

    exports.sendRequest = function (options, data, callback, errorCallback) {
        var dataResponse = '';
        var request = http.request(options, function (res) {
            res.on('data', function (chunk) {
                dataResponse += chunk;
            });

            res.on('end', function () {
                try {
                    callback(JSON.parse(dataResponse));
                }
                catch (exception) {
                    logger.error(exception.message);
                    errorCallback(exception.message);
                }
            });

            res.on('error', function (error) {
                logger.error(error.message);
                errorCallback(error.message);
            });
        });
        if (data) {
            request.write(data);
        }
        request.end();
        request.on('error', function (error) {
            logger.error(error.message);
            errorCallback(error.message);
        });
    };

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

    exports.checkCache = function (path, callback, errorCallback) {
        var cache = {}, cachePath = __dirname + '/../cache.json', that = this;
        that.exist(cachePath, function(exist){
            if(!exist){
                fs.openSync(cachePath, 'w');
            }
            that.readFile(cachePath, function (data) {
                try {
                    cache = JSON.parse(data);
                }
                catch (exception) {
                    /**
                     * Empty file.
                     */
                }
                if (!cache) {
                    cache = {};
                }
                fs.stat(path, function (error, stats) {
                    if (error) {
                        errorCallback(error);
                    }
                    if (cache[path]) {
                        if (new Date(cache[path]) < stats.ctime) {
                            cache[path] = stats.ctime;
                            that.writeFile(cachePath, JSON.stringify(cache), function () {
                                callback(true);
                            }, errorCallback);
                        }
                        else {
                            callback(false);
                        }
                    }
                    else {
                        cache[path] = stats.ctime;
                        that.writeFile(cachePath, JSON.stringify(cache), function () {
                            callback(true);
                        }, errorCallback);
                    }
                });
            }, errorCallback);
        });
    };

    exports.processResults = function (params, responseData, callback, errorCallback) {
        var results = responseData, configPath = __dirname + '/../config.json';
        var appsList = {}, appsPath = {}, dataWrite = [], parsedData, that = this;
        results.forEach(function (element) {
            appsList[element.name] = 'http://localhost:8889/organizations/' +
                params.organizationId.split(':')[2] + '/widgets/' +
                element.name + '/index.html?clientId=' +
                encodeURIComponent(params.organizationId) + '&parent=' +
                'http%3A%2F%2Flocalhost:8879&integrationType=customer&userId=' +
                encodeURIComponent(params.userId) + '&frameId=' + element.name;
            appsPath[element.name] = element.path;
        });

        dataWrite.push(appsList);
        dataWrite.push(appsPath);
        that.exist(configPath, function(exist) {
            if (!exist) {
                fs.openSync(configPath, 'w');
            }
            that.readFile(configPath, function (data) {
                try {
                    parsedData = JSON.parse(data);
                }
                catch (exception) {
                    /**
                     * Empty file.
                     */
                }
                if (!parsedData) {
                    that.writeFile(configPath, JSON.stringify(dataWrite), function () {
                        callback();
                    }, errorCallback);
                }
                else {
                    for (var widgetId in appsList) {
                        if (appsList.hasOwnProperty(widgetId)) {
                            parsedData[0][widgetId] = appsList[widgetId];
                        }
                    }
                    for (var path in appsPath) {
                        if (appsPath.hasOwnProperty(path)) {
                            parsedData[1][path] = appsPath[path];
                        }
                    }
                    that.writeFile(configPath, JSON.stringify(parsedData), function () {
                        callback();
                    }, errorCallback);
                }

            }, errorCallback);
        });
    };

    exports.viewerUpload = function(uploadConfig, callback, sendError){
        var that = this, summary = [], responseData = [], widgets = [];
        that.readFile(uploadConfig.filename, function (data) {
            try {
                widgets = JSON.parse(data);
            }
            catch(exception){
                var error = {message :'Can not parse widgets list file.'};
                sendError(error);
                return;
            }
            if (uploadConfig.pathConfig) {
                widgets = [];
                widgets.push(uploadConfig.pathConfig);
            }
            each(widgets, function (element, next) {
                that.checkCache(element, function (result) {
                    if (result) {
                        that.readFileBinary(element, function (data) {
                            summary.push({ data: data, path: element });
                            next();
                        }, sendError);
                    }
                    else {
                        next();
                    }
                }, sendError);
            }, function (error) {
                if (!summary) {
                    callback({message: 'Empty list of widgets.'});
                    return;
                }
                if (error) {
                    sendError(error);
                    return;
                }
                each(summary, function (element, next) {
                    var data = new Buffer(element.data, 'binary');
                    uploadConfig.postOptions.headers = {
                        'Content-Length': data.length,
                        'Accept-Encoding': 'gzip'
                    };
                    that.sendRequest(uploadConfig.postOptions, data, function (response) {
                        responseData.push({ name: response.name, path: element.path });
                        next();
                    }, sendError);

                }, function (error) {
                    if (error) {
                        sendError(error);
                        return;
                    }
                    that.processResults(uploadConfig.params, responseData, function () {
                        callback({message: 'All widgets were uploaded.'});
                    }, sendError);
                });
            });
        }, sendError);
    };
}());