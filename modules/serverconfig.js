/**
 * Created by Ruslan_Dulina on 8/28/2014.
 */
(function () {
    'use strict';
    var filesystem = require('./filesystem'),
        portscanner = require('portscanner'),
        storageModule = require('./storage');

    exports.readServerConfig = function (callback) {
        var filename = __dirname + './../serverconfig.json', parsedData, storage;
        filesystem.readFile(filename, function (data) {
            try {
                parsedData = JSON.parse(data);
                storage = parsedData;
                storageModule.setStorage(storage);
                portscanner.checkPortStatus(storage.devBoxPort, storage.devBoxHost, function (error, status) {
                    callback(storage.devBoxPort, status);
                });
            } catch (ex) {
                throw 'Unable to parse server config.';
            }
        }, function () {
            throw 'Unable to read server config.';
        });
    };
}());