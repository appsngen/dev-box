(function () {
    'use strict';
    var http = require('http'),
        express = require('express'),
        server = express(),
        routers = require('./modules/router'),
        logger = require('./modules/logger')(module),
        bodyParser = require('body-parser'),
        methodOverride = require('method-override'),
        serverConfig = require('./modules/serverconfig'),
        compression = require('compression'),
        path = require('path'),
        cons = require('consolidate');
    var _ = require('underscore');
    _.templateSettings = {
        evaluate: /<%%([\s\S]+?)%%>/g,
        interpolate: /<%%=([\s\S]+?)%%>/g,
        escape: /<%%-([\s\S]+?)%%>/g
    };

    var initServer = function (port, status) {
        if (status === 'open') {
            var message = 'Port: ' + port + ' in use.';
            logger.warn(message);
            console.log(message + ' Please set new port in server config file.');
            return;
        }

        server.use(compression());
        server.engine('html', cons.underscore);
        server.set('views', path.join(__dirname, '/views'));
        server.set('view engine', 'html');

        process.on('uncaughtException', function (err) {
            logger.error(err, err.message, err.stack);
        });

        var globalLogErrors = function (err, req, res, next) {
            logger.error('Unhandled exception', err.message, err.stack);
            next(err);
        };

        var globalErrorHandler = function (err, req, res) {
            res.status(500);
            res.send(500, { error: 'Internal server error.' });
        };
        server.use(bodyParser.urlencoded({
            extended: true
        }));

        server.use(bodyParser.json());
        server.use(methodOverride());
        server.set('port', port);
        server.post('/login', routers.login);
        server.get('/upload/:organizationId/:userId', routers.uploadWidgets);
        server.get('/views/*', routers.getResources);
        server.get('/views/*', routers.getHtml);
        server.get('/viewerHeartbeat', routers.getViewerHeartBeat);
        server.get('*', routers.unhandling);
        server.use(globalLogErrors);
        server.use(globalErrorHandler);

        http.createServer(server).listen(server.get('port'), function () {
            logger.info('Server running at http://localhost:' + port);
            logger.info('For open dev box please open ' + 'http://localhost:' + port + '/views/index.html');
            logger.info('CTRL + C to shutdown');
        });
    };

    serverConfig.readServerConfig(initServer);
}());