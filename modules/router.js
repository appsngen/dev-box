/**
 * Created by Ruslan_Dulina on 8/19/2014.
 */
(function () {
    'use strict';
    var url = require('url'),
        path = require('path'),
        fs = require('fs'),
        mime = require('mime'),
        _ = require('underscore'),
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
        var cookies = helpers.parseCookies(request);
        var cookieUser = cookies['user'];
        var cookieOrganization = cookies['organization'];
        var storage = storageModule.getStorage();
        var loginTemplate, indexTemplate;
        var loginHtml, indexHtml;
        var viewerHost;

        // compare cookie user and config user
        cookieUser = cookieUser ? decodeURIComponent(cookieUser) : '';

        if (!cookieUser || !cookieOrganization || cookieUser !== storage.user.name) {
            loginTemplate = fs.readFileSync(__dirname + '/../views/login.html', 'utf8');
            loginHtml = _.template(loginTemplate, storage.user);
            response.write(loginHtml);

        } else {
            // set organization to storage
            viewerHost = storage.viewerProtocol + '://' + storage.viewerHost + ':' + storage.viewerPort;
            indexTemplate = fs.readFileSync(__dirname + '/../views/index.html', 'utf8');
            indexHtml = _.template(indexTemplate, { viewerHost: viewerHost });
            storage.user.organizationId = decodeURIComponent(cookieOrganization);
            response.write(indexHtml);
        }

        response.end();
    };

    exports.login = function (request, response) {
        storageModule.saveUser({
            name: request.body.userId,
            password: request.body.password,
            organizationId: request.body.organizationId
        });

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