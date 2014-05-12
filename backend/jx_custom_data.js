/**
 * license (MIT) Copyright Nubisa Inc. 2014
 */

var messages = require('./jx_message_manager');
var helpers = require('./jx_helpers');
var handler = require('./jx_server_handler');
var settings = require('./jx_node_settings');

var methods = {
    "nb.stGr": {
        call: function (env, params, req) {

            var groups = null;
            try {
                groups = JSON.parse(helpers.decKeys(params.key));
            } catch (ex) {
                helpers.logError("Could not parse group information.");
            }

            if (groups) {
                var isInGroup = groups[params.gr];

                if (isInGroup) {
                    if (helpers.hasEvent("sendToGroup")) {
                        var args = { req: req, group: params.gr, method: params.m, msg: params.j };

                        try {
                            args.msg = JSON.parse(unescape(JSON.stringify(params.j)));
                        } catch (ex) {
                        }

                        helpers.emitEvent("sendToGroup", env, args, function (group) {
                            messages.sendToGroup(env.ApplicationName, group || params.gr, messages.createMessage(params.m, params.j));
                        });
                    } else {
                        messages.sendToGroup(env.ApplicationName, params.gr, messages.createMessage(params.m, params.j));
                    }
                }
            }
        }
    },
    "nb.ssTo": {
        call: function (env, params, req) {
            if (env.Index == null || !settings.enableClientSideSubscription) {
                return;
            }

            var cnn = handler.listeners[env.ClientId];
            var group = params.gr;
            var groups = null;

            if (params.en) {
                groups = helpers.decKeys(params.en);
            }

            if (!groups) {
                groups = {};
            } else {
                try {
                    groups = JSON.parse(groups);
                } catch (e) {
                    return;
                }
            }

            var subscribe = function () {
                groups[group] = true;

                if (cnn) {
                    messages.subscribeClient(env, cnn, group, groups);
                } else {
                    var rec = {
                        env: env,
                        cmd: "ssTo",
                        group: group,
                        groups: groups
                    };
                    messages.sendSystemMessage(rec);
                }
            };

            if (req && helpers.hasEvent("subscribe")) {
                var args = { req: req, group: params.gr, groups: groups };
                helpers.emitEvent("subscribe", env, args, function () {
                    subscribe();
                });
            } else {
                subscribe();
            }
        }
    },
    "nb.unTo": {
        call: function (env, params, req) {
            if (env.Index == null || !settings.enableClientSideSubscription) {
                return;
            }

            var cnn = handler.listeners[env.ClientId];
            var group = params.gr;
            var groups = helpers.decKeys(params.en);

            if (!groups) {
                return;
            }

            try {
                groups = JSON.parse(groups);
            } catch (e) {
                return;
            }

            if (!groups[group]) {
                return;
            }

            var unsubscribe = function () {
                delete(groups[group]);

                if (cnn) {
                    messages.unsubscribeClient(env, cnn, group, groups);
                } else {
                    var rec = {
                        env: env,
                        cmd: "unTo",
                        group: group,
                        groups: groups
                    };
                    messages.sendSystemMessage(rec);
                }
            };

            if (helpers.hasEvent("unsubscribe")) {
                var args = { req: req, group: params.gr, groups: groups };
                helpers.emitEvent("unsubscribe", env, args, function () {
                    unsubscribe();
                });
            } else {
                unsubscribe();
            }
        }
    }
};

exports.customMethods = methods;

exports.onCallReceived = function (env, methodName, param, req) {
    if (!methodName)
        return;
    if (!methodName.length || !methodName.indexOf)
        return;

    if (methods[env.ApplicationName]) {
        var app = methods[env.ApplicationName];
        if (app[methodName]) {

            var par = param;
            try {
                par = JSON.parse(unescape(JSON.stringify(param)));
            } catch (ex) {
            }

            app[methodName].call(env, par);
            return;
        } else {
            if (methodName.indexOf("nb.") === 0) {
                if (methods[methodName]) {
                    methods[methodName].call(env, param, req);
                }
            }
            return;
        }
    }

    var msg = messages.createError("Method " + methodName + " is not defined on the server side.");

    if (env.Index) {
        messages.sendCallback(env.ClientId, env.Index, msg);
    }
    else {
        helpers.logError(msg);
    }
};
