(function () {
    'use strict';
    var http = require('http'),
        port = process.argv[2] || 8879,
        express = require('express'),
        server = express(),
        routers = require('./modules/router'),
        logger = require('./modules/logger')(module),
        bodyParser = require('body-parser'),
        methodOverride = require('method-override');

    process.on('uncaughtException', function(err) {
        logger.error(err, err.message, err.stack);
    });

    var globalLogErrors = function(err, req, res, next) {
        logger.error('Unhandled exception', err.message, err.stack);
        next(err);
    };

    var globalErrorHandler = function(err, req, res) {
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
    server.get('/*', routers.getHtml);
    server.get('*', routers.unhandling);
    server.use(globalLogErrors);
    server.use(globalErrorHandler);

    http.createServer(server).listen(server.get('port'), function(){
        console.log('Server running at [http://localhost:' + port);
        console.log('CTRL + C to shutdown');
    });
}());