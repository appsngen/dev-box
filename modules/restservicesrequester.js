/**
 * Created by Ruslan_Dulina on 8/8/2014.
 */

(function () {
    'use strict';
    var storageModule = require('./storage'),
        logger = require('./logger')(module);
    var Guid = require('guid');
    var http = require('http');
    var https = require('https');
    var statusCodes = {
        internalErrorCode: 500,
        notImplementedCode: 501,
        notFoundCode: 404
    };

    exports.sendRequest = function (options, protocol, callback, errorCallback) {
        var dataResponse = '', result, guid;
        var request = protocol.request(options, function (res) {
            if(options.additional){
                res.setEncoding('binary');
            }
            res.on('data', function (chunk) {
                dataResponse += chunk;
            });

            res.on('end', function () {
                try {
                    if(this.headers['content-type'].indexOf('application/json') !== -1){
                        result = JSON.parse(dataResponse);
                    }
                    else{
                        result = dataResponse;
                    }
                    if(this.statusCode === statusCodes.internalErrorCode ||
                        this.statusCode === statusCodes.notImplementedCode ||
                        this.statusCode === statusCodes.notFoundCode){
                        guid = Guid.create();
                        delete options.requestBody;
                        var error = new Error('Service return ' + this.statusCode + ' code. Options: ' +
                            JSON.stringify(options));
                        logger.error(error.message.toString(), {id: guid.value});
                        errorCallback(error, guid.value);
                    }
                    else{
                        callback(result, this.statusCode);
                    }
                }
                catch (exception) {
                    guid = Guid.create();
                    logger.error(exception, {id: guid.value});
                    errorCallback(exception, guid.value);
                }
            });

            res.on('error', function (error) {
                var guid = Guid.create();
                logger.error(error, {id: guid.value});
                errorCallback(error, guid.value);
            });
        });
        if (options.requestBody) {
            request.write(options.requestBody);
        }
        request.end();
        request.on('error', function (error) {
            var guid = Guid.create();
            logger.error(error, {id: guid.value, options: options});
            errorCallback(error, guid.value);
        });
    };

    exports.getToken = function (callback, errorCallback, widgetId) {
        var that = this, authorization, signature, userPassword, urlPath, postData, protocol = http;
        var storage = storageModule.getStorage();
        if(widgetId){
            postData = {
                'scope': {
                    'widgets': [widgetId]
                }
            };
        }
        else{
            postData = {
                'scope': {
                    'identity': 'true'
                }
            };
        }

        urlPath = storage.tokenService.path;
        userPassword = storage.user.name + ':' + storage.user.password;
        signature = new Buffer(userPassword).toString('base64');
        authorization = 'Basic ' + signature;

        var postOptions = {
            hostname: storage.tokenService.host,
            port: storage.tokenService.port,
            path: urlPath,
            method: 'POST',
            headers: {
                'Authorization': authorization,
                'Content-Type': 'application/json'
            },
            requestBody: JSON.stringify(postData)
        };
        if(storage.tokenService.protocol === 'https'){
            protocol = https;
        }
        that.sendRequest(postOptions, protocol, function (response, status) {
            if(status !== 201){
                errorCallback(response);
            }
            else{
                callback(response.accessToken, response.expiresIn, widgetId);
            }
        }, errorCallback);

    };

    exports.uploadWidget = function(data, callback, errorCallback) {
        var that = this, protocol = http;
        var storage = storageModule.getStorage();
        var postData = new Buffer(data, 'binary');
        var accessToken = this.createToken();
        var postOptions = {
            hostname: storage.viewerHost,
            port: storage.viewerPort,
            path: '/widgets',
            method: 'POST',
            headers: {
                'Cache-Control': 'no-cache',
                'Authorization': 'Bearer ' + accessToken,
                'Content-Length': postData.length,
                'Accept-Encoding': 'gzip'
            },
            requestBody: postData
        };
        if (storage.viewerProtocol === 'https') {
            protocol = https;
        }
        that.sendRequest(postOptions, protocol, function (response, status) {
            if (status === 409) {
                postOptions.method = 'PUT';
                that.sendRequest(postOptions, protocol, function (response, status) {
                    if (status === 200) {
                        callback(response.message);
                    }
                    else {
                        errorCallback(response);
                    }
                }, errorCallback);
            }
            else {
                if (status === 200 || status === 201) {
                    callback(response.message);
                }
                else {
                    errorCallback(response);
                }
            }
        }, errorCallback);
    };

    exports.createToken = function (widgetId) {
        var storage = storageModule.getStorage();
        var header = {
            'alg': 'SHA1withRSA',
            'cty': 'json',
            'x5t': 'aMYcVcuoLJ76vNqapkAqH45n6bA=',
            'typ': 'JOSE'
        };
        var body = {
            'iss': 'appsngen',
            'aud': {
                'organization': storage.user.organizationId,
                'userRoles': ['ROLE_DEVELOPER'],
                'user': storage.user.name,
                'domains':['http://' + storage.devBoxHost + ':' + storage.devBoxPort]
            },
            'sub': 'identity',
            'jti': 'fc26d530-13bf-4879-ba73-6930e6734efe',
            'exp': 99999999999999,
            'iat': 99999999999999,
            'typ': 'at'
        };

        if(widgetId){
            body.sub = widgetId;
        }

        var base64header = new Buffer(JSON.stringify(header)).toString('base64');
        var base64body = new Buffer(JSON.stringify(body)).toString('base64');

        var data = base64header + '.' + base64body;

        var signature = 'signature';

        return data + '.' + signature;
    };
}());