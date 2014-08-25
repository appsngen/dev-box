module.exports = function (grunt) {
    'use strict';

    grunt.initConfig({
        jshint: {
            options: grunt.file.readJSON('../../.hooks/jshint/config.json'),
            toConsole: {
                src: ['modules/*.js', 'js/*.js', '*.js']
            },
            toFile: {
                options: {
                    reporter: 'jslint',
                    reporterOutput: '.out/jshint/jshint.xml'
                },
                src: ['modules/*.js', 'js/*.js', '*.js']
            }
        },
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
    grunt.registerTask('check', ['jshint']);
};
