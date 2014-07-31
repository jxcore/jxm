/**
 * license (MIT) Copyright Nubisa Inc. 2014
 */

var rabbit = require('./jx_rabbit_api');
var handler = require('./jx_server_handler');
var settings = require('./jx_node_settings');
var helpers = require('./jx_helpers');

var oldMessages = {items: [], count: 0},
    oldCMessages = {items: [], count: 0},
    oldSysMessages = {items: [], count: 0};

exports.oldMessages = oldMessages;
exports.oldCMessages = oldCMessages;

var lastMessageID = null;

var handleSubMessages = function (app, msg, cnn, id, moveon) {
    var isSent = false;
    for (var a in msg) {//a is groupName
        var gr = app[a];
        if (gr) {
            var items = msg[a];
            if (!cnn) {
                for (var o in gr) {
                    var s = sendToClient(o, items, id, moveon);
                    if (!isSent)
                        isSent = s;
                }
            } else {
                if (gr[cnn.req.clid]) {
                    var s = sendToClient(cnn.req.clid, items, id, moveon);
                    if (!isSent)
                        isSent = s;
                }
            }
        }
    }

    return isSent;
};

var handleMessages = function (message, cnn, moveon) {
    var mss = message.Messages;
    var isSent = false;
    if (!cnn) {
        for (var n in mss) { // n is appName
            var app = handler.appClients[n];
            if (app) {
                var s = handleSubMessages(app, mss[n], cnn, message._id, moveon);
                if (!isSent)
                    isSent = s;
            }
        }
    } else {
        var app = handler.appClients[cnn.req.appName];
        var msg = mss[cnn.req.appName];
        if (app) {
            var s = handleSubMessages(app, msg, cnn, message._id, moveon);
            if (!isSent)
                isSent = s;
        }
    }

    return isSent;
};

exports.dbWorker = function (doc) {
    oldMessages.items.push(doc);
    oldMessages.count++;

    if (oldMessages.count > settings.oldMessageQueueSize) {
        oldMessages.items.shift();
        oldMessages.count--;
    }
    handleMessages(doc);
};

var handleClientMessages = function (doc) {
    var msgs = doc.Messages;

    for (var cl in msgs) {
        var cnn = handler.listeners[cl];
        var mss = msgs[cl];
        if (cnn) {
            sendCallback(cnn, mss);
        }
    }
};


exports.clientWorker = function (doc) {
    oldCMessages.items.push(doc);
    oldCMessages.count++;

    if (oldCMessages.count > settings.oldMessageQueueSize) {
        oldCMessages.items.shift();
        oldCMessages.count--;
    }

    handleClientMessages(doc);
};


var handleSystemMessages = function (doc) {
    if (!doc.Messages || !doc.Messages.sys) {
        return;  // empty array
    }
    var msgs = doc.Messages.sys;

    for (var n in msgs) {

        var msg = msgs[n];
        var cnn = handler.listeners[msg.env.ClientId];

        if (cnn) {
            if (msg.cmd == "ssTo") {
                exports.subscribeClient(msg.env, cnn, msg.group, msg.groups || cnn.groups);
            }
            if (msg.cmd == "unTo") {
                exports.unsubscribeClient(msg.env, cnn, msg.group, msg.groups || cnn.groups);
            }
        }
    }
};


exports.sysWorker = function (doc) {
    oldSysMessages.items.push(doc);
    oldSysMessages.count++;

    if (oldSysMessages.count > settings.oldMessageQueueSize) {
        oldSysMessages.items.shift();
        oldSysMessages.count--;
    }

    handleSystemMessages(doc);
};


exports.syncMessages = function (cnn) {

    if (!cnn.pi && !cnn._id) {
        return;
    }

    var n = oldCMessages.count;
    var items = oldCMessages.items;
    var clid = cnn.req.clid;

    var q = 10;
    var sentBefore = false;
    while (n--) {
        var ms = items[n].Messages[clid];
        if (ms) {
            if (!sendCallback(cnn, ms, true)) {
                q++;
            }
            else {
                sentBefore = true;
                q = 0;
            }

            if (q > 10) //walk in the q for 10 levels more (after the last success)
                break;
        }
    }

    //the client might be coming from other jx process
    //grab the old missing messages from the cache and push them
    items = oldMessages.items;
    n = oldMessages.count;

    while (n--) {
        var gr = items[n];

        if (gr._id > cnn._id) {
            continue;
        }
        else {
            n++;
            break;
        }
    }

    if (n >= 0) {
        while (n < oldMessages.count) {
            var isSent = handleMessages(items[n], cnn, true);
            if (!sentBefore)
                sentBefore = isSent;
            n++;
        }
    }

    if (sentBefore)
        handler.handleTick(cnn.req.clid);

};

var sendCallback = function (cnn, msgs, moveon) {
    var rf = false;

    if (cnn.pi && moveon) {
        for (var a in cnn.pi) {
            try {
                if (!cnn.pi[a])
                    continue;

                if ((cnn.pi[a] + "").length === 0)
                    continue;

                var o = parseInt(cnn.pi[a]);
                if (o < msgs.starts || o > msgs.ends) {
                    continue;
                }
                else
                    rf = true;

                if (msgs[o])
                    cnn.data.push('{"i":null,"o":' + msgs[o] + "}");
            } catch (e) {
                //corrupted message;
                helpers.log("Corrupted Callback ID list received from the client ", cnn.clid);
                rf = false;
                break;
            }
        }
    } else {
        for (var o = msgs.starts; o <= msgs.ends; o++) {
            if (msgs[o])
                cnn.data.push('{"i":null,"o":' + msgs[o] + "}");
        }
    }

    handler.handleTick(cnn.req.clid, moveon);

    return rf;
};

var sendToClient = function (clid, arrms, _id, moveon) {
    var cnn = handler.listeners[clid];
    if (cnn) {
        if (cnn._id != undefined && cnn._id > _id) {
            return;
        }

        cnn._id = _id;
        lastMessageID = _id;
        for (var o in arrms) {
            cnn.data.push('{"i":' + _id + ',"o":' + arrms[o] + "}");
        }

        handler.handleTick(clid, moveon);

        return true;
    }

    return false;
};

exports.sendToGroup = function (appName, group, ms) {
    rabbit.addMessage(appName, group, ms);
};

exports.sendCallback = function (clientId, index, ms) {
    rabbit.addClientMessage(clientId, index, makeCallBack(index, ms));
};


exports.sendSystemMessage = function (ms) {
    rabbit.addSystemMessage(ms);
};

exports.subscribeClient = function (env, cnn, group, groups) {
    var app = handler.appClients[env.ApplicationName];
    if (!app) {
        if (!env.ssCall) {
            exports.sendCallbackWithError(env, "Application is not defined.");
        }
        return;
    }

    if (!app[group]) {
        app[group] = {};
    }

    app[group][env.ClientId] = true;
    groups[group] = true;
    cnn.groups = groups;

    var str = JSON.stringify(groups);
    // when user subscribes, she/he should receive lastMessageId. otherwise she/he would receive messages sent to group
    if (env.ssCall) {
        exports.sendCallback(env.ClientId, -1, { key: helpers.encKeys(str), did: lastMessageID, gr: group, su: true });
    } else {
        exports.sendCallback(env.ClientId, env.Index, { key: helpers.encKeys(str), did: lastMessageID });
    }
};

exports.unsubscribeClient = function (env, cnn, group, groups) {
    var app = handler.appClients[env.ApplicationName];
    if (!app) {
        if (!env.ssCall) {
            exports.sendCallbackWithError(env, "Application is not defined.");
        }
        return;
    }

    cnn.groups = groups;

    if (app[group]) {
        delete(app[group][env.ClientId]);
    }

    var str = JSON.stringify(groups);
    var enc = str === "{}" ? null : helpers.encKeys(str)
    // in case, if client does not belong to any group, let's just send null
    // like this, calling Unscubscribe() on client side will not need to connect to server
    if (env.ssCall) {
        exports.sendCallback(env.ClientId, -1, { key: enc, gr: group, su: false });
    } else {
        exports.sendCallback(env.ClientId, env.Index, { key: enc });
    }
};

exports.createError = function (ms) {
    return {error: ms};
};

var regExps = [new RegExp("@", "g"), new RegExp("\\?", "g"), new RegExp("\\+", "g")];

exports.createMessage = function (methodName, params) {
    var obj = {
        m: methodName, p: params
    };

    return  JSON.stringify(obj).replace(regExps[0], "&#64;")
        .replace(regExps[1], "&#63;")
        .replace(regExps[2], "&#43;");
};

var makeCallBack = function (index, params) {
    var obj = {
        i: index, p: params
    };

    var msg = JSON.stringify(obj);
    msg = msg.replace(regExps[0], "&#64;")
        .replace(regExps[1], "&#63;")
        .replace(regExps[2], "&#43;");

    return msg;
};


exports.sendCallbackWithError = function(env, err) {

    if (env.Index) {
        exports.sendCallback(env.ClientId, env.Index, { "nb_err": err.id });
    } else {
        helpers.log(err.msg);
    }
};