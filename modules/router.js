/**
 * Created by Ruslan_Dulina on 8/19/2014.
 */
(function () {
    'use strict';
    var url = require('url'),
        path = require('path'),
        fs = require('fs'),
        mime = require('mime'),
        helpers = require('./routerhelpers'),
        filesystem = require('./filesystem'),
        storageModule = require('./storage');

    mime.types['less'] = mime.types['css'];

    exports.getResources = function (request, response, next) {
        var uri = url.parse(request.url).pathname,
            filename = path.join(__dirname + '/../', uri);

        fs.exists(filename, function (exists) {
            if (!exists) {
                response.status(404);
                response.render('notFound.html', { resource: request.url});
                return;
            }
            if(mime.lookup(filename) === 'text/html'){
                next();
            }
            else{
                filesystem.readFile(filename, function (data) {
                    response.set('Content-Type', mime.lookup(filename));
                    response.status(200).send(data);
                }, helpers.sendError.bind(this, response));
            }
        });
    };

    exports.getHtml = function (request, response) {
        var cookies = helpers.parseCookies(request),
            cookieSet = cookies['user'] && cookies['organization'];
        if (!cookieSet) {
            response.render('login.html');
        }
        else {
            response.render('index.html');
        }
    };

    exports.config = function(request, response) {
        var storage = storageModule.getStorage();
        response.set('Content-Type', 'application/json');
        var result = {
            port : storage.viewerPort,
            host: storage.viewerHost
        };

        response.status(200).send(result);
    };

    exports.login = function (request, response) {
        storageModule.saveUser(request.body);
        response.status(200).send({message: 'credentials saved.'});
    };

    exports.uploadWidgets = function (request, response) {
        var storage = storageModule.getStorage();
        response.setHeader('Cache-Control', 'no-cache');
        var filename = __dirname + storage.widgetsPath,
            options, pathConfig, uploadConfig = {};
        if (request.query.widgetId) {
            options = fs.readFileSync(__dirname + storage.widgetsConfig);
            pathConfig = JSON.parse(options)[1][request.query.widgetId];
        }
        uploadConfig.pathConfig = pathConfig;
        uploadConfig.filename = filename;
        uploadConfig.params = request.params;
        uploadConfig.user = storage.user;
        helpers.viewerUpload(uploadConfig, function(data){
            response.status(200).send(data);
        }, helpers.sendError.bind(this, response));
    };

    exports.unhandling = function (request, response) {
        response.status(404);
        response.render('notFound.html', { resource: request.url});
    };
}());