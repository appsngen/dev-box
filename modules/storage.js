/**
 * Created by Ruslan_Dulina on 2/4/2015.
 */
(function () {
    'use strict';
    var storage = {};

    exports.getStorage = function () {
        return storage;
    };

    exports.setStorage = function (newStorage) {
        storage = newStorage;
    };
}());