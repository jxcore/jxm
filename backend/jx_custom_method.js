/**
 * license (MIT) Copyright Nubisa Inc. 2014
 */

var settings = require('./jx_node_settings');
var message = require('./jx_message_manager');
var helpers = require('./jx_helpers');
var customCall = require('./jx_custom_data');
var regx = new RegExp("&#43;", "g");
var regxn = new RegExp("&#399;", "g");
var regxq = new RegExp("&#400;", "g");

exports.handle = function (m, req) {
    var ms = m.m;

    var obj = null;
    try {
        if (!ms.m) {
            obj = JSON.parse(ms.replace(regx, "+").replace(regxn, "\\n").replace(regxq, "\\\"").replace(/\t/g, "\\t"));
        } else {
            obj = ms;
        }
    } catch (e) {
        helpers.logError(e, "JCM handleCall: " + ms.replace(regx, "+").replace(regxn, "\\n").replace(regxq, "\\\"").replace(/\t/g, "\\t"));

        return;
    }

    obj.clid = req.clid;
    obj.appName = req.appName;
    obj.sessionId = m.sessionId;

    run(obj, req);
};

var run = function (item, req) {
    try {
        var env = {ClientId: item.clid, ApplicationName: item.appName, SessionID: item.sessionId, Index: item.i };
        customCall.onCallReceived(env, item.m, item.p, req);
    } catch (e) {
        helpers.logError(e, item.clid + " -- messaging.custom.method run");
        return message.createError(e);
    }
};

