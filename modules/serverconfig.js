/**
 * Created by Ruslan_Dulina on 8/28/2014.
 */
(function () {
    'use strict';
    var filesystem = require('./filesystem');
    exports.readServerConfig = function(port){
        var filename = __dirname + '/../serverConfig.json';
        filesystem.readFile(filename, function(data){
            try{
                var parsedData = JSON.parse(data);
                global.viewerPort = parsedData.port;
                global.viwerHost = parsedData.viwerHost;
                global.widgetsPath = parsedData.widgetsPath;
                global.devBoxPort = port;
                global.devBoxHost = parsedData.devBoxHost;
            }catch (ex){
                throw 'Unable parsed server config.';
            }
        }, function(){
            throw 'Unable read server config.';
        });
    };
}());