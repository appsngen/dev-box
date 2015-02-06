$(function () {
    'use strict';

    $('#username').focus();
    $.support.cors = true;

    $('button').click(function () {
        makeRequest();
    });

    $('input').keypress(function (e) {
        if (e.which === 13){
            makeRequest();
        }
    });
    var generateAuthHeader = function (username, password) {

        var auth = username + ':' + password;

        return 'Basic ' + btoa(auth);
    };

    var showAlert = function(message){
        $('body').prepend('<div class="alert alert-error"> ' +
            '<button type="button" class="close" data-dismiss="alert">&times;</button> ' +
            '<strong>Warning!</strong>'+ message +
            '</div>');
    };

    var makeRequest = function() {
        var user = $('#username').val(),
            password = $('#password').val();

        if (!$.trim(user) && !$.trim(password)) {
            $('#errorMessage').text('Empty username and password');
            $('#username').addClass('wrong').focus();
            $('#password').addClass('wrong');
            return;
        }
        else if ($.trim(user) && !$.trim(password)) {
            $('#errorMessage').text('Empty password');
            $('#password').addClass('wrong').focus();
            $('#username').removeClass('wrong');
            return;
        } else if (!$.trim(user) && $.trim(password)) {
            $('#errorMessage').text('Empty username');
            $('#username').addClass('wrong').focus();
            $('#password').removeClass('wrong');
            return;
        }

        var sendCredentials = function(data){
            $.ajax({
                url: 'http://localhost:' + location.port +'/login',
                type: 'POST',
                data: data,
                dataType: 'json',
                headers: {
                    'Content-Type': 'application/json'
                },
                success: function () {
                    location.reload();
                },
                error: function () {
                    showAlert('Can not save user name and password in Viewer configuration file.');
                }
            });
        };
        $.ajax({
            url: 'https://www.appsngen.com/auth-service/tokens',
            type: 'POST',
            dataType: 'json',
            data: JSON.stringify({'scope':{'services':['access']}}),
            contentType: 'application/json; charset=utf-8',
            headers: {
                'Authorization': generateAuthHeader(user, password)
            },
            success: function (data) {
                var tokenData, organization;
                var base64data = data.accessToken.split('.')[1];
                while (base64data.length % 4 !== 0) {
                    base64data += '=';
                }
                tokenData = atob(base64data);
                tokenData = JSON.parse(tokenData);
                organization = tokenData.aud.organization;
                var remember = $('#remember').is(':checked'),
                    expires = remember ? { expires: 14 } : null;
                $.cookie('user', user, expires);
                $.cookie('organization', organization, expires);
                sendCredentials(JSON.stringify({userId: user, password: password, organizationId: organization}));
            },
            error: function () {
                $('#errorMessage').text('Wrong username or password');
                $('#username').addClass('wrong').focus();
                $('#password').addClass('wrong').val('');
            }
        });
    };

    var user = $('#username').val();
    var password = $('#password').val();

    if (user && password) {
        makeRequest();
    }
});