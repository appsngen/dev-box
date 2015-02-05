/**
 * Created by Ruslan_Dulina on 2/4/2015.
 */
(function () {
    'use strict';
    var storage = {};
    var filesystem = require('fs');
    exports.getStorage =function(){
        return storage;
    };

    exports.setStorage = function(newStorage){
        storage = newStorage;
    };

    exports.saveUser = function(user){
        storage.user= user;
        filesystem.writeFileSync(__dirname + '/../serverconfig.json', JSON.stringify(storage));
    };
}());