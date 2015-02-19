(function () {
    'use strict';
    var http = require('http'),
        fs = require('fs'),
        express = require('express'),
        server = express(),
        routers = require('./modules/router'),
        storage = require('./modules/storage'),
        logger = require('./modules/logger')(module),
        bodyParser = require('body-parser'),
        methodOverride = require('method-override'),
        serverConfig = require('./modules/serverconfig'),
        compression = require('compression'),
        path = require('path'),
        JSONC = require('comment-json'),
        cons = require('consolidate');
    var _ = require('underscore');
    _.templateSettings = {
        evaluate: /<%%([\s\S]+?)%%>/g,
        interpolate: /<%%=([\s\S]+?)%%>/g,
        escape: /<%%-([\s\S]+?)%%>/g
    };

    var tryRunViewer = function () {
        var viewerConfigPath = __dirname + '/node_modules/appsngen-viewer/src/serverconfig.json';
        var viewerConfig;
        var devBoxConfig = storage.getStorage();

        try {
            viewerConfig = JSONC.parse(fs.readFileSync(viewerConfigPath));
        } catch (ex) {
            console.log('Unable to parse viewer config.', ex);
            process.exit(1);
        }

        viewerConfig.viewerInstanceConfiguration.portHttp = devBoxConfig.viewerPort;
        viewerConfig.viewerInstanceConfiguration.host = devBoxConfig.viewerHost;
        viewerConfig.viewerInstanceConfiguration.baseUrl = 'http://' + devBoxConfig.viewerHost + ':' + devBoxConfig.viewerPort;
        viewerConfig.user = devBoxConfig.user;

        if (!devBoxConfig.user.name || !devBoxConfig.user.password) {
            console.log('Error: empty credentials. Please set user credentials in the config.');
            process.exit(1);
        }

        try {
            fs.writeFileSync(viewerConfigPath, JSONC.stringify(viewerConfig));
        } catch (ex) {
            console.log('Unable to store viewer config.', ex);
            process.exit(1);
        }

        require('./node_modules/appsngen-viewer/src/server');
    };

    var initServer = function (port, status) {
        if (status === 'open') {
            var message = 'Port: ' + port + ' in use.';
            logger.warn(message);
            console.log(message + ' Please set new port in server config file.');
            return;
        }

        tryRunViewer();

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
        server.get('/config', routers.config);
        server.get('/upload/:organizationId/:userId', routers.uploadWidgets);
        server.get('/views/*', routers.getResources);
        server.get('/views/*', routers.getHtml);
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