/**
 * Created by Ruslan_Dulina on 8/28/2014.
 */
(function () {
    'use strict';
    var filesystem = require('./filesystem'),
        portscanner = require('portscanner');

    var clearCache = function(cachePath, widgetsConfigPath){
        filesystem.removeFileSync(__dirname + cachePath);
        filesystem.removeFileSync(__dirname + widgetsConfigPath);
    };

    exports.readServerConfig = function(callback){
        var filename = __dirname + '/../serverConfig.json';
        filesystem.readFile(filename, function(data){
            try{
                var parsedData = JSON.parse(data);
                global.viewerPort = parsedData.viewerPort;
                global.viewerHost = parsedData.viewerHost;
                global.widgetsPath = parsedData.widgetsPath;
                global.devBoxPort = parsedData.devBoxPort;
                global.devBoxHost = parsedData.devBoxHost;
                clearCache(parsedData.cache, parsedData.widgetsConfig);
                portscanner.checkPortStatus(global.devBoxPort, global.devBoxHost, function(error, status) {
                    callback(global.devBoxPort, status);
                });
            }catch (ex){
                throw 'Unable parsed server config.';
            }
        }, function(){
            throw 'Unable read server config.';
        });
    };
}());