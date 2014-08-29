$(function () {
    'use strict';
    var channels = _.filter(appstore.events.channels, function (value) { return typeof value === 'string'; });

    var appTmpl = _.template($('#appTmpl').html()),
        appItemTmpl = _.template($('#appItemTmpl').html()),
        channelItemTmpl = _.template($('#channelItem').html());

    var $appsList = $('#appList'),
        $apps = $('#apps'),
        $publishChannel = $('#publishChannel'),
        $publishData = $('#publishData'),
        $subscribeChannel = $('#subscribeChannel'),
        $subscribeData = $('#subscribeData'),
        $publish = $('#publish'),
        $subscribe = $('#subscribe'),
        $subscribing = $('#subscribing');

    var user,
        organization, viewerPort, viewerHost;

    var showAlert = function(message){
        $('body').prepend('<div class="alert alert-error"> ' +
            '<button type="button" class="close" data-dismiss="alert">&times;</button> ' +
            '<strong>Warning! </strong>'+ message +
            '</div>');
    };

    var toggleApp = function (appName, appUrl, index, complete) {
        var $app = $('#' + appName + 'App'), $prevApps;

        if ($app.length > 0) {
            // toggle if exists
            $app.remove();
        } else {
            // create if doesn't exist
            $app = createApp(appName, appUrl, index, complete);

            // calculate app position and append its.
            $prevApps = $('.app').filter(function () {
                return parseInt($(this).attr('data-index')) < index;
            });
            if ($prevApps.length === 0) {
                $apps.prepend($app);
            } else {
                $prevApps.last().after($app);
            }
        }
    },

        loadViewerConfig = function(){
            var url = 'http://localhost:' + location.port + '/config';
            $.ajax({
                url: url,
                dataType: 'json',
                cache: false,
                async: false,
                success: function (response) {
                    debugger;
                    viewerPort = response.port;
                    viewerHost = response.host;
                    require.config({
                        baseUrl: 'http://' + viewerHost + ':' + viewerPort + '/content/js/',
                        waitSeconds: 0
                    });
                    // load dependencies
                    require(['appstore.api.container'], function () {
                        debugger;
                    });
                },
                error: function (request) {
                    showAlert(request.statusText);
                }
            });
        },

        createApp = function (appName, appUrl, index, complete) {
            var $app = $(appTmpl({
                    name: appName, src: appUrl, id: appName, index: index, user: user, organization: organization
                })),
                $appIframe = $app.find('iframe'),
                $appWidthLabel = $app.find('.app-width'),
                $appHeightLabel = $app.find('.app-height'),

                drawSize = function () {
                    $appWidthLabel.text($appIframe.width());
                    $appHeightLabel.text($appIframe.height());
                };
            $app.resize(function() {
                var appsContainers = $('.app.pull-left');
                appsContainers.each(function(index, element){
                    $(element).find('.app-width.muted').text($(element).find('iframe').width());
                    $(element).find('.app-height.muted').text($(element).find('iframe').height());
                });
            });
            $app.find('.resizable').resizable({
                start: function () {
                    $(this).find('iframe').attr('width', '100%').attr('height', '100%');
                    $('<div class="temp-div"></div>').css({
                        position: 'absolute',
                        top: $appIframe.position().top,
                        left: 0,
                        width: '100%',
                        height: $(document).height()
                    }).appendTo($app);
                },

                stop: function () {
                    $app.find('.temp-div').remove();
                },
                maxWidth: 1024,
                minWidth: 230,
                minHeight: 50
            });
            $app.find('.resizable').resizable('option', 'disabled', $('#dynamicHeight').is(':checked'));

            $($appIframe).on('load', function () {
                /**
                 * Default height 600X600
                 */
                $app.find('.resizable').css({ height: 600, width: 600 });
                complete();
                drawSize();
            });

            return $app;
        },

        refreshApp = function (appId) {
            var $appIframe = $apps.find('#' + appId);
            $appIframe.attr('src', $appIframe.attr('src'));
        },

        publishEvent = function (channel, data) {
            appstore.events.publish(channel, data);
        },

        subscribeForChannel = function (channel) {
            if ($subscribing.find('.channel')
                .filter(function () { return $(this).text() === channel; }).length > 0) {
                return;
            }
            appstore.events.subscribe(channel, function (channel, data) {
                $subscribeData.text(JSON.stringify({ channel: channel, data: data }, null, '  '));
            });
            $subscribe.parent().parent().after(channelItemTmpl({ channel: channel }));
            $subscribeChannel.val('');
        },

        unsubscribeFromChannel = function ($channel) {
            appstore.events.unsubscribe($channel.find('.channel').text());
            $channel.remove();
        },

        enableDynamicHeight = function () {
            // since jquery resizable conflicts with dynamic height
            // disable resizable before to enable dynamic height handling
            $('.resizable').resizable('option', 'disabled', true);

            appstore.events.subscribe('resizeApp', function (channel, data, sender) {
                var element = document.getElementById(sender);
                if (element) {
                    element.style.height = data.height + 'px';
                }
                appstore.events.publish('resizeApp', { appId: sender, isFirst: data.isFirst });
            });

            var scrollBarWidth = $.scrollbarWidth();
            $('.resizable').each(function () {
                $(this).css({ height: 'auto', width: 'auto' });
                var iframe = $(this).find('iframe')[0];
                iframe.height = $(iframe).contents().height() + scrollBarWidth + 'px';
                iframe.width = $(iframe).contents().width() + scrollBarWidth + 'px';
                $(this).attr('prevw', $(this).width());
                $(this).attr('prevh', $(this).height());
            });
        },

        disableDynamicHeight = function () {
            $('.resizable').resizable('option', 'disabled', false);
            appstore.events.unsubscribe('resizeApp');
            $('.resizable').each(function () {
                var w = $(this).attr('prevw'),
                    h = $(this).attr('prevh');
                $(this).css({ height: h + 'px', width: w + 'px' });
                var iframe = $(this).find('iframe')[0];
                iframe.height = '100%';
                iframe.width = '100%';
            });
        },

        loadAppList = function(config){

            var index = 0;
            _.each(config[0], function (appUrl, appName) {
                var $appItem = $(appItemTmpl({ name: appName, id: appName })),
                    appLoaded = function () {
                        $appItem.find('.icon-refresh').removeClass('loading');
                    };

                $appItem.on('click', function () {
                    $appItem.toggleClass('active');
                    $appItem.find('.icon-refresh').toggle();
                    if ($appItem.hasClass('active')) {
                        $appItem.find('.icon-refresh').addClass('loading');
                    } else {
                        $appItem.find('.icon-refresh').removeClass('loading');
                    }
                    var url = appUrl.replace(':8879', ':' + location.port);
                    toggleApp(appName, url, index++, appLoaded);
                });
                $appItem.find('.icon-refresh').on('click', function (event) {
                    var id = $appItem.attr('data-app-id'),
                        url = 'http://localhost:' + location.port +
                            '/upload/' + organization + '/' + user + '?widgetId=' +id;
                    $appItem.find('.icon-refresh').addClass('loading');
                    event.stopPropagation();
                    $.ajax({
                        url: url,
                        dataType: 'json',
                        cache: false,
                        async: true,
                        success: function () {
                            if (!getClientCookie()){
                                window.location.reload();
                            }

                            refreshApp(appName);
                        },
                        error: function (request) {
                            showAlert(request.statusText);
                        }
                    });
                });

                $appsList.append($appItem);
            });
            $('#allApps').removeClass('loading');
            $('#allApps').css('display', 'none');
        },

        loadConfig = function(){
            $.ajax({
                url: 'config.json',
                dataType: 'json',
                success: function (config) {
                    loadAppList(config);
                }
            });
        },

        creatAppList = function() {
            $('#allApps').addClass('loading');
            $.ajax({
                url: 'http://localhost:' + location.port + '/upload/' + organization + '/' + user,
                dataType: 'json',
                success: function () {
                    loadConfig();
                },
                error: function (response) {
                    showAlert(response.statusText + ' ' + response.responseText);
                }
            });
        },

        expireClientCookie = function () {
            $.cookie('user', user, { expires: -1 });
            $.cookie('organization', organization, { expires: -1 });
        },

        getClientCookie = function () {
            var _user = $.cookie('user'),
                _organization = $.cookie('organization'),

                clientCookie = null;

            if (_user && _organization){
                clientCookie = {
                    user: _user,
                    organization: _organization
                };
            }

            return clientCookie;
        },

        toggleSignOut = function () {
            $('#userName').text(user);
            $('#signOut').show();
        };

    $('#signOut').click(function () {
        expireClientCookie();
        location.reload();
    });

    var clientCookie = getClientCookie();
    user = clientCookie.user;
    organization = clientCookie.organization;
    creatAppList();
    toggleSignOut();


    // populate channels inputs with values
    $('#publishChannel, #subscribeChannel').attr('data-source', JSON.stringify(channels));

    // handle events publishing
    $publish.on('click', function () {
        var channel = $publishChannel.val(),
            data = $publishData.val();

        try {
            data = JSON.parse(data);
        } catch (e) {
            data = null;
        }

        if (!channel) {
            $publishChannel.parent().addClass('error');
        } else if (!data) {
            $publishData.parent().addClass('error');
        } else {
            publishEvent(channel, data);
        }
    });

    // handle events subscribing
    $subscribe.on('click', function () {
        var channel = $subscribeChannel.val();

        if (!channel) {
            $subscribeChannel.parent().addClass('error');
        } else {
            subscribeForChannel(channel);
        }
    });

    $subscribeChannel.keypress(function (e) {
        if (e.which === 13) {
            $subscribe.click();
        }
    });

    // handle unsubscribing
    $subscribing.on('click', '.close', function () {
        unsubscribeFromChannel($(this).parent());
    });

    // reset error highlight on focus
    $('#publishChannel, #publishData, #subscribeChannel').on({
        focusin: function () {
            $(this).parent().removeClass('error');
        },
        change: function () {
            $(this).parent().removeClass('error');
        }
    });

    // set apps container min height
    $('#mainbar').find('.well').css('min-height', '650px');

    // dynamic height handling
    $('#dynamicHeight').on('click', function () {
        if ($(this).is(':checked')) {
            enableDynamicHeight();
        } else {
            disableDynamicHeight();
        }
    });

    disableDynamicHeight();

    // $('[data-app-id='ie7app']').click();
    $('[data-app-id="market-stats"]').click();

    $.scrollbarWidth = function () {
        var parent, child, width;
        if (width === undefined) {
            parent = $('<div style="width:50px;height:50px;overflow:auto"><div/></div>').appendTo('body');
            child = parent.children();
            width = child.innerWidth() - child.height(99).innerWidth();
            parent.remove();
        }
        return width;
    };

    loadViewerConfig();
});