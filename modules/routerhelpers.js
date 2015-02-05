/**
 * Created by Ruslan_Dulina on 8/22/2014.
 */
(function () {
    'use strict';
    var fs = require('fs'),
        logger = require('./logger')(module),
        each = require('async-each-series'),
        filesystem = require('./filesystem'),
        storageModule = require('./storage'),
        viewerRequester = require('./restservicesrequester');

    exports.sendError = function (response, error) {
        logger.error(error);
        response.set('Content-Type', 'text/plain');
        response.status(500).send();
    };

    exports.parseCookies = function (request) {
        var list = {},
            rc = request.headers.cookie, array = rc && rc.split(';');
        if (array) {
            array.forEach(function (cookie) {
                var parts = cookie.split('=');
                list[parts.shift().trim()] = decodeURI(parts.join('='));
            });
        }

        return list;
    };

    exports.checkCache = function (path, callback, errorCallback) {
        var storage = storageModule.getStorage();
        var cache = {}, cachePath = __dirname + storage.cache;
        filesystem.exist(cachePath, function (exist) {
            if (!exist) {
                fs.openSync(cachePath, 'w');
            }
            filesystem.readFile(cachePath, function (data) {
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
                        if (new Date(cache[path]) < stats.mtime) {
                            cache[path] = stats.mtime;
                            filesystem.writeFile(cachePath, JSON.stringify(cache), function () {
                                callback(true);
                            }, errorCallback);
                        }
                        else {
                            callback(false);
                        }
                    }
                    else {
                        cache[path] = stats.ctime;
                        filesystem.writeFile(cachePath, JSON.stringify(cache), function () {
                            callback(true);
                        }, errorCallback);
                    }
                });
            }, errorCallback);
        });
    };

    exports.resetCache = function (path, callback, errorCallback) {
        var storage = storageModule.getStorage();
        var cache = {}, cachePath = __dirname + storage.cache;
        filesystem.exist(cachePath, function (exist) {
            if (exist) {
                filesystem.readFile(cachePath, function (data) {
                    try {
                        cache = JSON.parse(data);
                    } catch (exception) {
                        /**
                         * Empty file.
                         */
                    }

                    if (cache && cache[path]) {
                        delete cache[path];
                        filesystem.writeFile(cachePath, JSON.stringify(cache), function () {
                            callback(true);
                        }, errorCallback);
                    }

                }, errorCallback);
            }
        });
    };

    exports.getTokensForAllWidgets = function (widgets) {
        var i;
        for (i = 0; i < widgets.length; i++) {
            var token = viewerRequester.createToken(widgets[i].name);
            widgets[i].token = token;
        }

        return widgets;
    };

    exports.processResults = function (params, responseData, callback, errorCallback) {
        var results = responseData,
            storage = storageModule.getStorage(),
            configPath = __dirname + storage.widgetsConfig;
        var appsList = {}, appsPath = {}, dataWrite = [], parsedData , id;
        results.forEach(function (element) {
            id = element.name.split(':')[3];
            appsList[id] = 'http://' + storage.viewerHost + ':' + storage.viewerPort + '/organizations/' +
                params.organizationId.split(':')[2] + '/widgets/' +
                element.name + '/index.html?clientId=' +
                encodeURIComponent(params.organizationId) + '&parent=' +
                'http%3A%2F%2F' + storage.devBoxHost + ':' + storage.devBoxPort + '&integrationType=customer&userId=' +
                encodeURIComponent(params.userId) + '&frameId=' + element.name + '&token=' +
                encodeURIComponent(element.token);
            appsPath[id] = element.path;
        });

        dataWrite.push(appsList);
        dataWrite.push(appsPath);
        filesystem.exist(configPath, function (exist) {
            if (!exist) {
                fs.openSync(configPath, 'w');
            }
            filesystem.readFile(configPath, function (data) {
                try {
                    parsedData = JSON.parse(data);
                }
                catch (exception) {
                    /**
                     * Empty file.
                     */
                }
                if (!parsedData) {
                    filesystem.writeFile(configPath, JSON.stringify(dataWrite), function () {
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
                    filesystem.writeFile(configPath, JSON.stringify(parsedData), function () {
                        callback();
                    }, errorCallback);
                }

            }, errorCallback);
        });
    };

    exports.viewerUpload = function (uploadConfig, callback, sendError) {
        var that = this, summary = [], responseData = [], widgets = [];
        filesystem.readFile(uploadConfig.filename, function (data) {
            try {
                widgets = JSON.parse(data);
            }
            catch (exception) {
                var error = {message: 'Can not parse widgets list file.'};
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
                        filesystem.readFileBinary(element, function (data) {
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
                    viewerRequester.uploadWidget(element.data, function (response) {
                        responseData.push({ name: response, path: element.path });
                        next();
                    }, function (error) {
                        sendError(error);

                        that.resetCache(element.path, function () {
                            // cache was succesfully reset
                        }, function (error) {
                            sendError(error);
                        });
                    });
                }, function (error) {
                    if (error) {
                        sendError(error);
                        return;
                    }

                    responseData = that.getTokensForAllWidgets(responseData);
                    that.processResults(uploadConfig.params, responseData, function () {
                        callback({message: 'All widgets were uploaded.'});
                    }, sendError);
                });
            });
        }, sendError);
    };
}());