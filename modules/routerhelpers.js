/**
 * Created by Ruslan_Dulina on 8/22/2014.
 */
(function () {
    'use strict';
    var fs = require('fs');
    var logger = require('./logger')(module);
    var each = require('async-each-series');
    var filesystem = require('./filesystem');
    var storageModule = require('./storage');
    var viewerRequester = require('./restservicesrequester');
    var process = require('child_process');
    var JSONC = require('comment-json');
    var path = require('path');

    var viewerPath = path.dirname(require.resolve('appsngen-viewer'));
    var viewerConfigPath = path.join(viewerPath, '/serverconfig.json');
    var viewerProcess;

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
        // TODO: WARNING: remove this hotfix;
        callback(true);
        return;

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
        var i, token;

        for (i = 0; i < widgets.length; i++) {
            token = viewerRequester.createToken(widgets[i].name);
            widgets[i].token = token;
        }

        return widgets;
    };

    exports.processResults = function (responseData, callback, errorCallback) {
        var results = responseData;
        var storage = storageModule.getStorage();
        var user = storage.user;
        var configPath = __dirname + storage.widgetsConfig;
        var appsList = {}, appsPath = {}, dataWrite = [], parsedData, id;

        results.forEach(function (element) {
            id = element.name.split(':')[3];
            appsList[id] = 'http://' + storage.viewerHost + ':' + storage.viewerPort + '/organizations/' +
            user.organizationId.split(':')[2] + '/widgets/' +
            element.name + '/index.html?clientId=' +
            encodeURIComponent(user.organizationId) + '&parent=' +
            'http%3A%2F%2F' + storage.devBoxHost + ':' + storage.devBoxPort + '&integrationType=customer&userId=' +
            encodeURIComponent(user.name) + '&token=' +
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

    exports.viewerUpload = function (widgets, user, callback, sendError) {
        var that = this;
        var summary = [];
        var responseData = [];

        each(widgets, function (widget, next) {
            var widgetAbsolutePath = __dirname + '/../' + widget;

            that.checkCache(widgetAbsolutePath, function (result) {
                if (result) {
                    filesystem.readFileBinary(widgetAbsolutePath, function (data) {
                        summary.push({data: data, path: widgetAbsolutePath});
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

            each(summary, function (widgetData, next) {
                viewerRequester.uploadWidget(widgetData.data, function (response) {
                    responseData.push({name: response, path: widgetData.path});
                    next();
                }, function (error) {
                    sendError(error);

                    that.resetCache(widgetData.path, function () {
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
                that.processResults(responseData, function () {
                    callback({message: 'All widgets were uploaded.'});
                }, sendError);
            });
        });
    };

    // TODO: make async
    exports.readViewerConfig = function () {
        var viewerConfig;

        try {
            viewerConfig = JSONC.parse(fs.readFileSync(viewerConfigPath));
        } catch (ex) {
            console.log('Unable to parse viewer config.', ex);
            throw ex;
        }

        return viewerConfig;
    };

    // TODO: make async
    exports.syncViewerConfig = function () {
        var viewerConfig;
        var devBoxConfig = storageModule.getStorage();

        viewerConfig = exports.readViewerConfig();

        viewerConfig.viewerInstanceConfiguration.portHttp = devBoxConfig.viewerPort;
        viewerConfig.viewerInstanceConfiguration.host = devBoxConfig.viewerHost;
        viewerConfig.viewerInstanceConfiguration.baseUrl = 'http://' + devBoxConfig.viewerHost + ':' + devBoxConfig.viewerPort;
        viewerConfig.user = devBoxConfig.user;

        try {
            fs.writeFileSync(viewerConfigPath, JSONC.stringify(viewerConfig));
        } catch (ex) {
            console.log('Unable to store viewer config.', ex);
            throw ex;
        }
    };

    exports.viewerIsRunning = function () {
        return viewerProcess && !viewerProcess.killed;
    };

    exports.stopViewer = function () {
        if (exports.viewerIsRunning()) {
            console.log('Stopping viewer');
            viewerProcess.kill();
            viewerProcess = null;
        } else {
            console.log('Unable to stop viewer: viewer is not running');
        }

    };

    exports.runViewer = function () {
        if (exports.viewerIsRunning()) {
            exports.stopViewer();
        }

        console.log('Starting viewer');
        viewerProcess = process.fork('server.js', [], {
            cwd: viewerPath
        });
    };
}());
