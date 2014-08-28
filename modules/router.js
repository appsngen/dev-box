/**
 * Created by Ruslan_Dulina on 8/19/2014.
 */
(function () {
    'use strict';
    var url = require('url'),
        path = require('path'),
        fs = require('fs'),
        mime = require('mime'),
        logger = require('./logger')(module),
        helpers = require('./routerhelpers');

    mime.types['less'] = mime.types['css'];

    exports.getHtml = function (request, response) {
        var sendError = function (error) {
            logger.error(error);
            response.set('Content-Type', 'text/plain');
            response.status(500).send();
        };
        var uri = url.parse(request.url).pathname,
            filename = path.join(__dirname + '/../', uri);

        fs.exists(filename, function (exists) {
            if (!exists) {
                response.set('Content-Type', 'text/plain');
                response.status(404).send('404 Not Found\n');
                return;
            }

            if (fs.statSync(filename).isDirectory()) {
                filename += '/index.html';
            }

            var cookies = helpers.parseCookies(request),
                cookieSet = cookies['user'] && cookies['organization'];
            if (!cookieSet) {
                filename = filename.replace('index.html', 'login.html');
            }

            helpers.readFile(filename, function (data) {
                response.set('Content-Type', mime.lookup(filename));
                response.status(200).send(data);
            }, sendError);
        });
    };

    exports.login = function (request, response) {
        var postOptions = {
            hostname: 'localhost',
            port: '8889',
            path: '/login',
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            }
        };
        helpers.sendRequest(postOptions, JSON.stringify(request.body), function () {
            response.status(200).send({message: 'credentials saved.'});
        }, function (error) {
            logger.error(error);
            response.set('Content-Type', 'text/plain');
            response.status(500).send(error);
        });
    };

    exports.uploadWidgets = function (request, response) {
        response.setHeader('Cache-Control', 'no-cache');
        var sendError = function (error) {
            logger.error(error);
            response.set('Content-Type', 'application/json');
            response.status(500).send(error);
        };
        var userId = encodeURIComponent(request.params.userId),
            organizationId = encodeURIComponent(request.params.organizationId),
            filename = __dirname + '/../widgetslist.json',
            postOptions = {
                hostname: 'localhost',
                port: '8889',
                path: '/widgets?organizationId=' + organizationId + '&userId=' + userId,
                method: 'POST',
                headers: {
                    'Cache-Control': 'no-cache'
                }
            }, options, pathConfig, uploadConfig = {};
        if (request.query.widgetId) {
            options = fs.readFileSync(__dirname + '/../config.json');
            pathConfig = JSON.parse(options)[1][request.query.widgetId];
        }
        uploadConfig.pathConfig = pathConfig;
        uploadConfig.filename = filename;
        uploadConfig.postOptions = postOptions;
        uploadConfig.params = request.params;
        helpers.viewerUpload(uploadConfig, function(data){
            response.status(200).send(data);
        }, sendError);
    };

    exports.unhandling = function (request, response) {
        response.status(404).send({message: 'Not found.'});
    };
}());