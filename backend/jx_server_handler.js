/**
 * license (MIT) Copyright Nubisa Inc. 2014
 */

var helpers = require('./jx_helpers');
var settings = require('./jx_node_settings');
var messages = require('./jx_message_manager');
var mq = require('./jx_custom_method');
var querystring = require('querystring');

var listeners = {}, apps = {};

exports.listeners = listeners; //clientId, cnn
exports.appClients = apps; //appName -> { ALL, etc... }

exports.socketURL = null;
exports.secureSocketURL = null;

exports.handleHttp = function (cnn) {
    var appName = cnn.req.appName;

    if (cnn.ms == "connect") {
        var id;
        if (cnn.req.session) {
            id = cnn.req.session.id;
        }
        else {
            id = null;
        }

        cnn.req.clid = helpers.newClientId(id, cnn.req.cit);

        helpers.logInfo("Client is Connected ", helpers.ProcessId + " - " + cnn.req.clid);

        if (!cnn.req.desktop) {//browserClient
            cnn.res.write(helpers.clientScript);
            cnn.res.write("jxcore.clid='" + cnn.req.clid + "';");
            cnn.res.write("jxcore.ListenUrl='" + cnn.req.path + "';");

            var wss = exports.secureSocketURL || "wss://" + settings.IPAddress;
            cnn.res.write("jxcore.SocketURL = (document.location.protocol == 'https:') ? '" + wss + "' : '" + exports.socketURL + "';");

        } else {//desktopClient
            cnn.res.write(cnn.req.clid + "|" + settings.base64 + "|" + settings.encoding + "|" + settings.listenerTimeout);
        }
        cnn.res.end(0);
    }
    else {
        if (!cnn.req.clid) {
            helpers.log("Warning: no ClientId is provided by the connection request");
            cnn.res.end(0);
            return;
        }

        if (!helpers.IdMatch(cnn.req.clid, cnn.req.cit)) {
            helpers.log("Client ID doesn't match!!! - " + cnn.req.clid + "--" + cnn.req.cit);

            cnn.res.end(0);
            return;
        }

        if (!apps[appName]) {
            apps[appName] = {ALL: {}};
        }

        if (cnn.groups) {
            var aps = apps[appName];
            for (var gr in cnn.groups) {
                if (!aps[gr]) {
                    aps[gr] = {};
                }

                aps[gr][cnn.req.clid] = true;
            }
        }

        if (!cnn.ms) { // listener
            helpers.logInfo("HTTP Listen ", cnn.req.clid);

            apps[appName].ALL[cnn.req.clid] = true;

            cnn.start = Date.now();
            cnn.dataSize = 0;

            if (!cnn.req.desktop) {
                if (cnn.req.ie == 0 || cnn.req.ie > 8) {
                    cnn.res.write("@<br/>?");
                }
            }

            var lst = listeners[cnn.req.clid];

            if (lst) {
                cnn.data = lst.data;
                //helpers.log("HTTP: Duplicate listener found for client ", cnn.req.clid);
                try {
                    if (lst.res) {
                        //lst.res.killed = true;
                        lst.res.end(0);
                    }
                }
                catch (e) {
                }
            }
            else
                cnn.data = [];

            listeners[cnn.req.clid] = cnn;

            messages.syncMessages(cnn);

        }
        else {//send
            helpers.logInfo("Http Send " + cnn.req.clid);

            handleSocketSend(cnn);

            cnn.res.end(0);
        }
    }
};

exports.handleSocket = function (cnn) {
    var appName = cnn.req.appName;

    if (!apps[appName]) {
        apps[appName] = {ALL: {}};
    }

    if (cnn.groups) {
        var aps = apps[appName];
        for (var gr in cnn.groups) {
            if (!aps[gr]) {
                aps[gr] = {};
            }
            aps[gr][cnn.req.clid] = true;
        }
    }

    apps[appName].ALL[cnn.req.clid] = true;

    if (cnn.listen) {//listen
        cnn.start = Date.now();
        cnn.data = [];
        if (!cnn.req.desktop)
            helpers.getSession(cnn);

        if (listeners[cnn.req.clid])
            cnn.data = listeners[cnn.req.clid].data;

        listeners[cnn.req.clid] = cnn;

        helpers.logInfo("Socket Listening " + cnn.req.clid);
        messages.syncMessages(cnn);
    }
    else {//send
        helpers.logInfo("Socket Send", cnn.req.clid);
        handleSocketSend(cnn);
    }
};

var handleSocketSend = function (cnn) {
    var data = querystring.unescape(cnn.ms);
    var sid = cnn.req.session;
    if (sid) {
        sid = cnn.req.session.id;
    }
    mq.handle({sessionId: sid, m: data}, cnn.req);
};

var timeouts = [];
exports.checkClients = function () {
    var tm = Date.now() - settings.listenerTimeout;
    for (var o in listeners) {
        var p = listeners[o];
        var kill = false;
        if (p && !p.ws) {
            kill = p.start <= tm;
        }

        if (kill) {
            timeouts.push(o);
        }
    }

    setTimeout(function () {
        for (var o in timeouts) {
            var clid = timeouts[o];
            //console.log("cleanup", clid);
            cleanClient(clid);
        }
        timeouts = [];
    }, 500);
};

var cleanClient = function (clid, p) {
    if (!p)
        p = listeners[clid];

    if (!p)
        return;

    var appName = p.req.appName;
    var aps = apps[appName];
    if (aps) {
        delete(aps.ALL[clid]);
    }

    if (p.groups) {
        for (var gr in p.groups) {
            delete(aps[gr][p.req.clid]);
        }
    }

    if (!p.ws) {
        p.res.end(0);
    } else {
        p.ws.close(0);
    }

    delete(listeners[clid]);
};

exports.closeHttp = function (type, req, res) {
    if (!res.killed) {
        req.reListen = true;
    }
};


var tickerArray = {}, tickero = 0;
var ticker = function (clid, moveon) {
    tickerArray[clid] = 1;
    tickero++;
    if (tickero === 1) {
        setTimeout(function () {
            for (var o in tickerArray) {
                _ticker(o, moveon);
            }
            tickero = 0;
            tickerArray = {};
        }, 10);
    }
};

var _ticker = function (clid, moveon) {
    var p = listeners[clid];

    if (!p) {
        helpers.logError("Couldn't find the listener!", "ticker");
        return;
    }

    var end = false;

    if (p.data.length > 0) {
        if (p.res) {
            if (p.req.desktop) {
                p.res.write(p.data.join(",") + ",");
            } else {
                p.res.write("@$NB(");
                p.res.write(p.data.join(");?@$NB("));
                p.res.write(");?");
            }

            if (p.req.ie != 0 && p.req.ie <= 9) {
                p.req.reListen = true;
            }
            else {
                p.dataSize++;
                if (p.dataSize > settings.maxLongPollingSize) {
                    p.req.reListen = true;
                }
            }
        } else {
            if (!p.req.desktop) {
                p.ws.send("$NB(" + p.data.join(");$NB(") + ");");
            } else {

                p.ws.send(p.data.join(",") + ",");
            }
        }

        if (p.req.desktop && !p.ws) {
            p.req.reListen = true;
        }

        p.data = [];
    }

    if (moveon)
        return;

    var tm = false;
    if (!p.ws) {
        tm = (p.start + settings.listenerTimeout) <= Date.now();
    }

    if (tm || p.req.reListen) {
        helpers.logInfo("Refreshing the client ", clid);
        if (!p.ws) {
            if (p.req.desktop) {
                p.res.write('{"i":null,"o":{"m":"jxcore.Listen"}}');
            } else {
                p.res.write("@jxcore.Listen();?");
            }
        }
        end = true;
    }
    else if (p.kick) {
        var str = "jxcore.Closed();";
        if (p.req.desktop) {
            str = '{"i":null,"o":{"m":"jxcore.Closed"}}';
        } else {
            if (!p.ws) {
                str = "@" + str + "?";
            }
        }

        if (!p.ws) {
            p.res.write(str);
        } else {
            p.ws.send(str);
        }
        end = true;
    }

    if (end) {
        cleanClient(clid);
    }
};

exports.handleTick = ticker;
