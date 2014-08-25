module.exports = function (grunt) {
    'use strict';

    grunt.initConfig({
        bower: {
            install: {
                options: {
                    targetDir: 'js/dependencies',
                    layout: 'byComponent',
                    install: true,
                    verbose: false,
                    cleanTargetDir: false,
                    cleanBowerDir: true,
                    bowerOptions: {}
                }
            }
        }
    });

    grunt.loadNpmTasks('grunt-contrib-jshint');
    grunt.loadNpmTasks('grunt-bower-task');
};
