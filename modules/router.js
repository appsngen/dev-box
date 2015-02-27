/**
 * Created by Ruslan_Dulina on 8/19/2014.
 */
(function () {
    'use strict';
    var url = require('url');
    var path = require('path');
    var fs = require('fs');
    var http = require('http');
    var https = require('https');
    var mime = require('mime');
    var _ = require('underscore');
    var helpers = require('./routerhelpers');
    var filesystem = require('./filesystem');
    var storageModule = require('./storage');

    mime.types['less'] = mime.types['css'];

    exports.getResources = function (request, response, next) {
        var uri = url.parse(request.url).pathname,
            filename = path.join(__dirname + '/../', uri);

        fs.exists(filename, function (exists) {
            if (!exists) {
                response.status(404);
                response.render('notFound.html', {resource: request.url});
                return;
            }
            if (mime.lookup(filename) === 'text/html') {
                next();
            }
            else {
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
        var indexTemplate;
        var indexHtml;
        var viewerHost, viewerConfig;

        // compare cookie user and config user
        cookieUser = cookieUser ? decodeURIComponent(cookieUser) : '';

        viewerConfig = helpers.readViewerConfig();

        if (!cookieUser || !cookieOrganization ||
            viewerConfig.user.name !== cookieUser || !viewerConfig.user.password) {

            if (helpers.viewerIsRunning()) {
                helpers.stopViewer();
            }

            response.render('login.html');
        } else {
            // render index
            viewerHost = storage.viewerProtocol + '://' + storage.viewerHost + ':' + storage.viewerPort;
            indexTemplate = fs.readFileSync(__dirname + '/../views/index.html', 'utf8');
            indexHtml = _.template(indexTemplate, {viewerHost: viewerHost});

            // set user data to storage (name, pass, org)
            storage.user = viewerConfig.user;
            // set organization to storage
            storage.user.organizationId = decodeURIComponent(cookieOrganization);

            if (!helpers.viewerIsRunning()) {
                helpers.syncViewerConfig();
                helpers.runViewer();
            }

            response.write(indexHtml);
            response.end();
        }
    };

    exports.getViewerHeartBeat = function (request, response) {
        var storage = storageModule.getStorage();
        var requestOptions = {
            host: storage.viewerHost,
            port: storage.viewerPort,
            path: '/heartbeat'
        };
        var protocol;

        if (storage.viewerProtocol === 'http') {
            protocol = http;
        } else {
            protocol = https;
        }

        protocol.get(requestOptions, function(viewerResponse) {
            if (viewerResponse.statusCode === 200) {
                response.status(200);
            } else {
                response.status(404);
            }

            response.end();
        }).on('error', function () {
            response.status(404);
            response.end();
        });
    };

    exports.login = function (request, response) {
        var storage = storageModule.getStorage();

        storage.user = {
            name: request.body.userId,
            password: request.body.password,
            organizationId: request.body.organizationId
        };

        helpers.syncViewerConfig();

        response.status(200).send({message: 'credentials saved.'});
    };

    exports.uploadWidgets = function (request, response) {
        var storage = storageModule.getStorage();

        response.setHeader('Cache-Control', 'no-cache');
        helpers.viewerUpload(storage.widgets, storage.user, function (data) {
            response.status(200).send(data);
        }, helpers.sendError.bind(this, response));
    };

    exports.unhandling = function (request, response) {
        response.status(404);
        response.render('notFound.html', {resource: request.url});
    };
}());