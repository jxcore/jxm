/**
 * license (MIT) Copyright Nubisa Inc. 2014
 */

var http = require('http');
var https = require('https');
var crypto = require('crypto');
var querystring = require('querystring');
var WebSocket = require('faye-websocket')

var Client = function (localTarget, appName, appKey, url, port, secure) {

/************************************************************
 beginning of modified browser code
*************************************************************/

var jx_obj = {};

jx_obj.Socket = null;
jx_obj.IsConnected = false;
jx_obj.LTimeout = 0;
jx_obj.ReConnCounter = 0;
jx_obj.ListenActive = false;
jx_obj.RequestList = { s: [], l: {}, sc: 0, sn: 0, ready: true, force_false: false };

jx_obj.Callbacks = [];


jx_obj.Call = function (methodName, json, cb, clientCB) {

    if(!methodName || !methodName.length) {
        var errCode = 7; /* null or empty method name */
        if (cb) {
            cb(null, errCode);
            return;
        } else {
            throw "Error no " + errCode;
        }
    }

    var str = '{"m":"' + methodName + '"';

    if (json) {
        str += ',"p":' + JSON.stringify(json);
    }

    if (cb) {
        jx_obj.Callbacks.push( {cb : cb, methodName: methodName, json : json, clientCB : clientCB } );
        str += ',"i":' + (jx_obj.Callbacks.length).toString();
    }

    str += "}";

    jx_obj.Send(escape(str));
};

jx_obj.enc = null;
jx_obj.Subscribe = function (group, cb) {
    if (group && group.length) {
        jx_obj.Call("nb.ssTo", {gr: group, en: jx_obj.enc}, function (r, err, cbData, clientCB) {
            if (!err) {
                jx_obj.enc = r.key;
                if (r.did !== null) {
                    jx_obj.dataId = r.did;
                }
            }
            if(clientCB){
                var gr = cbData && cbData.gr ? cbData.gr : null;
                clientCB(gr, err);
            }
        }, cb);
    }
    else {
        var errCode = 6; /* must be non-empty string*/
        if (cb) {
            cb(group, errCode);
        } else {
            throw "Error no " + errCode;
        }
    }
};

jx_obj.Unsubscribe = function (group, cb) {
    if (!jx_obj.enc) {
        var errCode = 2;  /* not belonging to any group */
        if (cb) {
            cb(group, errCode);
        } else {
            throw "Error no " + errCode;
        }
        return;
    }
    if (group && group.length) {
        jx_obj.Call("nb.unTo", {gr: group, en: jx_obj.enc}, function (r, err, cbData, clientCB) {
            if (!err) {
                jx_obj.enc = r;
            }
            if(clientCB){
                var gr = cbData && cbData.gr ? cbData.gr : null;
                clientCB(gr, err);
            }
        }, cb);
    }
    else {
        var errCode = 6; /* must be non-empty string*/
        if (cb) {
            cb(group, errCode);
        } else {
            throw "Error no " + errCode;
        }
    }
};

jx_obj.SendToGroup = function (groupName, methodName, json, cb) {
    if (!groupName) {
        groupName = "ALL";
    }

    if (cb) {
        jx_obj.Call("nb.stGr", {key:jx_obj.enc, gr:groupName, m:methodName, j:json}, function(r, err, cbData, clientCB){
            if(clientCB){
                clientCB(err);
            }
        }, cb);
    } else {
        jx_obj.Call("nb.stGr", {key:jx_obj.enc, gr:groupName, m:methodName, j:json});
    }
};

jx_obj.dataId = null;

jx_obj.ActualCallbackId = 0;
jx_obj.localTarget = {};
jx_obj.localTarget.$NB = function (a) {
    if (!a) {
        return;
    }
    if (Object.prototype.toString.call(a) != '[object Array]') {
        a = [a];
    }

    for (var o in a) {
        if (!o) {
            continue;
        }

        var p = a[o].o;
        if (!p) {
            continue;
        }

        if (a[o].i) {
            jx_obj.dataId = a[o].i;
        }

        if (p.m) {
            /* not every client MUST have remote method */
            if (jx_obj.localTarget.methodsOfCall && jx_obj.localTarget.methodsOfCall[p.m]) {
                jx_obj.localTarget.methodsOfCall[p.m](_this, p.p);
            }
        } else if (p.i && p.i < 0) {
            jx_obj.sscall(p.i, p.p);
        }
        else if (p.i) {
            var arg1 = p.p.nb_err ? null : p.p;
            var arg2 = p.p.nb_err ? p.p.nb_err : false;

            var nb_method = jx_obj.Callbacks[p.i-1].methodName.indexOf("nb.") === 0;
            var arg3 = nb_method ? jx_obj.Callbacks[p.i-1].json : undefined;
            var arg4 = nb_method ? jx_obj.Callbacks[p.i-1].clientCB : undefined;

            jx_obj.ActualCallbackId = p.i;
            if (jx_obj.backup && p.i > jx_obj.Callbacks.length) {
                jx_obj.backup[p.i - 1].cb(arg1, arg2, arg3, arg4);
                jx_obj.backup[p.i - 1] = null;
            } else {
                if (jx_obj.Callbacks[p.i - 1]) {
                    jx_obj.Callbacks[p.i - 1].cb(arg1, arg2, arg3, arg4);
                    jx_obj.Callbacks[p.i - 1] = null;
                }
            }
            if (p.i > 9998) {
                jx_obj.backup = jx_obj.Callbacks;
                jx_obj.Callbacks = [];
            }
        }
    }
};

jx_obj.GetClientId = function () {
    return jx_obj.clid;
};

jx_obj.Listen = function (cc) {
    if (!jx_obj.IsConnected || (!cc && jx_obj.ListenActive)) {
        return false;
    }

    jx_obj.Act("Li1 - cc:" + cc, true);
    jx_obj._Send(-1, cc);

    return true;
};

jx_obj.Send = function (mess) {
    if (!jx_obj.IsConnected) {
        return null;
    }

    var _id = jx_obj.RequestList.sn++;
    jx_obj.RequestList.s[_id] = { message: mess, is_send: true };

    return _id;
};

jx_obj.SendCheckerActive = function () {
    setTimeout(jx_obj.SendChecker, 10);
};

jx_obj.failCount = 0;

jx_obj.SendChecker = function () {

    if (!jx_obj.Started) {
        return;
    }

    try {
        if (jx_obj.ListenActive) {
            jx_obj.timer = Date.now();
        }

        if (jx_obj.ListenActive) {
            if (jx_obj.RequestList.sn > jx_obj.RequestList.sc) {
                var _pool = jx_obj.RequestList.sc;
                if (jx_obj.RequestList.s[_pool] != null) {
                    jx_obj._Send(_pool);
                }
                jx_obj.RequestList.sc++;
            }
        }

        if (jx_obj.failCount > 2) {
            jx_obj.Closed();
            return;
        }

        if (!jx_obj.ListenActive && jx_obj.IsConnected) {
            if (Date.now() - jx_obj.timer > 3000) {
                jx_obj.timer = Date.now();
                jx_obj.Listen(14);
                jx_obj.failCount++;
            }
        }
    } catch (eo) {
        errorMessage("Error in SendChecker: " + eo);
    }
    jx_obj.SendCheckerActive();
};

jx_obj.Close = function (silent) {
    jx_obj.Closed(1, silent);

    if (jx_obj.Socket && jx_obj.SocketOpen) {
        try {
            jx_obj.SocketAllowClosing = true;
            jx_obj.Socket.close();
        } catch (ex) {
            errorMessage("Cannot close socket: " + ex);
        }
    }
};


jx_obj.Closed = function (ir, silent) {
    if (ir == null) {
        setTimeout(function () {
            jx_obj.ReConnect();
        }, 0);
        eventEmitter.emitIfAssigned('close', true);
        return;
    } else if (!silent) {
        eventEmitter.emitIfAssigned('close', false);
    }

    jx_obj.ListenActive = false;
    jx_obj.IsConnected = false;
    jx_obj.Started = false;
};

jx_obj.Started = false;

jx_obj.Start = function () {
    setTimeout(function () {
        if (!jx_obj) {
            return;
        }

        if (jx_obj.Started) {
            return;
        }

        jx_obj.Started = true;
        jx_obj.SocketDisabled = false;
        jx_obj.RequestList.l = { message: "", is_send: false, connector: null };

        jx_obj.ReConnCounter = 0;
        jx_obj.IsConnected = true;

        eventEmitter.emitIfAssigned('connect');

        jx_obj.SendCheckerActive();

        jx_obj.timer = Date.now();
        jx_obj.Listen();
    }, 1);
};


jx_obj.ParseMessages = function (responseText, forSocket) {
    if (responseText && responseText.length) {
        var smes = unescape(responseText);

        if (smes.slice(-1) == ",") {
            smes = smes.slice(0, -1);
        }

        var mess_arr = null;

        try {
            mess_arr = JSON.parse("[" + smes + "]");
        } catch (ex) {
            errorMessage("Cannot parse incoming message: " + ex);
            return null;
        }

        if (mess_arr && mess_arr.length) {
            var _hl = smes.indexOf("jxcore.Listen") > -1;

            if (jx_obj.OnMessageReceived != null) {
                jx_obj.OnMessageReceived(_mess);
                _mess += ";if(jx_obj.OnMessageExecuted!=null){jx_obj.OnMessageExecuted();};";
            }
            for (var a = 0, len = mess_arr.length; a < len; a++) {
                if (forSocket && mess_arr[a].indexOf("jxcore.Listen") > -1) {
                    continue;
                }
                jx_obj.localTarget.$NB(mess_arr[a]);
            }
            return { hl: _hl };
        }
    } else {
        return null;
    }
};

jx_obj.SocketOpen = false;
jx_obj.SFirst = [];
jx_obj.SocketDisabled = false;

jx_obj.GoSockets = function (call_id) {
    if (jx_obj.SocketDisabled) {
        return false;
    }

    var sendFirsts = function (toSocket) {
        if (jx_obj.SFirst.length > 0) {
            for (var o in jx_obj.SFirst) {
                if (jx_obj.SFirst[o] == null) {
                    continue;
                }
                if (toSocket) {
                    jx_obj.Socket.send(jx_obj.SFirst[o]);
                } else {
                    jx_obj.Send(jx_obj.SFirst[o], false, true);
                }
            }
            jx_obj.SFirst = [];
        }
    };

    if (jx_obj.Socket == null) {


        var url = jx_obj.IsSecure ? "wss://" : "ws://";
        url += jx_obj.SocketURL + ":" + jx_obj.SocketPort + jx_obj.ListenUrl + "c=" + jx_obj.clid + "&sid=" + jx_obj.SecuredKey;
        jx_obj.Socket = new WebSocket.Client(url);

        jx_obj.Socket.on('open', function () {
            jx_obj.SocketOpen = true;
            sendFirsts(true);
        });
        jx_obj.Socket.on('message', function (event) {
            var d = event.data.toString();
            jx_obj.ParseMessages(d);
        });
        jx_obj.Socket.on('error', function (event) {
            jx_obj.Socket = null;
            jx_obj.SocketDisabled = true;
            jx_obj.Act("15", false);

            errorMessage("Socket error. Falling back to reverse ajax: " + event.message.replace(event.target.url, ""));

            setTimeout(function () {
                jx_obj.Listen(1);
                sendFirsts(false);
            }, 800);

        });
        jx_obj.Socket.on('close', function () {
            jx_obj.SocketOpen = false;
            jx_obj.Socket = null;
            jx_obj.SocketDisabled = true;
            jx_obj.Act("15", false);

            if (jx_obj.SocketAllowClosing) {
                return;
            }
            jx_obj.SocketAllowClosing = false;
            errorMessage("Socket closed. Falling back to reverse ajax.");

            setTimeout(function () {
                jx_obj.Listen(1);
                sendFirsts(false);
            }, 5);
        });
    }

    if (call_id == -1) {
        jx_obj.Act("16", true);
        return true;
    }

    if (jx_obj.SocketOpen) {
        jx_obj.Socket.send(jx_obj.RequestList.s[call_id].message);
    } else {
        jx_obj.SFirst.push(jx_obj.RequestList.s[call_id].message);
    }

    return true;
};

jx_obj.actPos = 0;
jx_obj.pasPos = 0;
jx_obj.Act = function (pos, act) {
    if (act) {
        jx_obj.actPos = pos;
    } else {
        jx_obj.pasPos = pos;
    }

    jx_obj.ListenActive = act;
};

jx_obj.arrToString = function (arr) {
    var str = "";
    var first = true;

    var orders = 0;

    for (var o in arr) {
        if (!arr[o]) {
            continue;
        }

        if (first)
            first = false;
        else {
            str += "|";
        }
        var x = 1 + parseInt(o);
        str += x;
        orders++;

        if (orders > 256) {
            break;
        }
    }

    if (!str) {
        str = "|";
    }
    return str;
};

jx_obj._Send = function (call_id, cc) {
    if (!jx_obj.IsConnected) {
        return;
    }

    if (!jx_obj.SocketDisabled) {
        if (jx_obj.GoSockets(call_id, cc)) {
            return;
        }
    }
    var txt = [];
    txt.push('c=' + jx_obj.GetClientId());

    if (call_id != -1) {
        try {
            if (jx_obj.RequestList.s[call_id] != null) {
                txt.push('ms=' + jx_obj.RequestList.s[call_id].message);
            }
        } catch (e) {
            return;
        }
    }
    else {
        if (jx_obj.dataId) {
            txt.push('did=' + jx_obj.dataId);
        }

        txt.push('pi=' + jx_obj.arrToString(jx_obj.Callbacks));

        if (jx_obj.enc) {
            txt.push('en=' + jx_obj.enc);
        }

        if (jx_obj.Timo) {
            clearTimeout(jx_obj.Timo);
        }
        if (jx_obj.LTimeout) {
            jx_obj.Timo = setTimeout(function () {
                jx_obj.Listen(5);
            }, jx_obj.LTimeout);
        }
    }

    sendHttpRequest(txt.join('&'), function (req, responseText) {

        var ret = jx_obj.ParseMessages(responseText, false);
        if (ret) {
            if (!ret.hl) {
                jx_obj.Act("5", true);
            } else {
                jx_obj.Act("6", false);
                setTimeout(function () {
                    if (jx_obj) {
                        jx_obj.Act("6", false);
                        jx_obj.ReCall(14);
                    }
                }, 1);
            }
        }
    });
};


jx_obj.ReCall = function (q) {
    if (!jx_obj.Listen(q)) {
        setTimeout(function () {
            if (jx_obj) {
                jx_obj.Act("67", false);
                jx_obj.ReCall(q);
            }
        }, 200);
    }
};

jx_obj.ReConnect = function (silent) {

    if (jx_obj.IsConnected) {
        jx_obj.Close(silent === undefined ? true : silent);
    }

    jx_obj.ReConnCounter++;

    if (jx_obj.ReConnCounter > 5) {
        jx_obj.ReConnCounter = 0;
        eventEmitter.emitIfAssigned('close', false);
        return;
    }

    setTimeout(function () {
        jx_obj.Connect(function (err) {
            if (err) {
                jx_obj.ReConnect();
            }
        });
    }, 3000);
};

jx_obj.sscall = function (id, param) {
    if (id == -1) {
        if (param.key) {
            jx_obj.enc = param.key;
        }
        if (param.did) {
            jx_obj.dataId = param.did;
        }

        eventEmitter.emitIfAssigned('subscription', param.su, param.gr);
    }
};

// *************************************************************
// end of modified browser code
// *************************************************************

    var getOptions = function (method, path) {
        var ret = {
            port: jx_obj.SocketPort,
            hostname: jx_obj.SocketURL,
            allowHalfOpen: true,
            method: method,
            path: path,
            headers: {
                'Transfer-Encoding': 'chunked'
            }
        };

        if (jx_obj.IsSecure) {
            ret.rejectUnauthorized = false;
        }

        return ret;
    };

    var encrypt = function (key, message) {
        var cipher = crypto.createCipher('aes-128-ecb', key);
        var crypted = cipher.update(message, 'utf8', 'base64');
        crypted += cipher.final('base64');

        return querystring.escape(crypted);
    };

    var events = require("events"),
        eventEmitter = new events.EventEmitter();

    eventEmitter.emitIfAssigned = function (event, arg1, arg2, arg3) {
        if (eventEmitter.listeners(event).length > 0) {
            eventEmitter.emit(event, _this, arg1, arg2, arg3);
        }
    };

    var errorMessage = function (err) {
        eventEmitter.emitIfAssigned('error', err);
    };

    var id = 0;
    var sendHttpRequest = function (message, responseEndCallback) {
        id++;

        var options = getOptions("POST", jx_obj.ListenUrl);
        var req = jx_obj.IsSecure ? https.request(options) : http.request(options);

        req.__id = id;
        var body = "";
        var cb = responseEndCallback;

        req.on('response', function (res) {
            res.setEncoding('utf8');

            res.on('data', function (chunk) {
                body += chunk;
            });

            res.on('end', function () {
                if (body != '') {
                    jx_obj.ListenActive = false;
                    req.abort();
                    req.destroy();

                    if (cb) {
                        cb(req, body);
                    }
                }
            });
        });

        var closing = false;
        var close = function () {
            if (!closing) {
                jx_obj.Closed();
                req = null;
                closing = true;
            }
        };

        req.on('error', function (e) {
            errorMessage(id + ' request error: ' + e);
            close(e);
        });

        req.on('close', function () {
            close();
        });
        req.end(message);
    };


    jx_obj.Connect = function (cb) {

        if (jx_obj.isConnected) {
            errorMessage("jxm.io client is already connected.");
            return false;
        }

        var options = getOptions("GET", jx_obj.ListenUrl + "ms=connect&sid=" + jx_obj.SecuredKey + "&a");
        var req = jx_obj.IsSecure ? https.request(options) : http.request(options);

        var body = "";
        var errorWritten = false;


        var writeError = function (err) {
            if (errorWritten) {
                return;
            }
            errorMessage(err);
            errorWritten = true;

            if (cb) {
                cb(err);
            }
        };

        req.on('response', function (res) {
            res.setEncoding('utf8');

            res.on('data', function (chunk) {
                body += chunk;
            });

            res.on('end', function () {
                req.abort();
                req.destroy();
                var arr = body.split("|");

                if (arr.length == 4) {
                    jx_obj.clid = arr[0];
                    jx_obj.encrypted = arr[1] == 'true';

                    var ltimeout = parseInt(arr[3]);
                    jx_obj.LTimeout = isNaN(ltimeout) ? 60000 : ltimeout;

                    jx_obj.Start(function (status) {
                        if (cb) {
                            cb()
                        }
                    });
                } else {
                    writeError("Couldn't connect to server. Check URL for service.");
                }
            });
        });

        req.on('error', function (e) {
            writeError("Couldn't connect to server. Check URL for service. " + e);
        });

        req.end();
    };

    // constructor initialization

    var id = 0;

    jx_obj.localTarget.methodsOfCall = localTarget;

    jx_obj.SocketURL = url; // ip or domain name
    jx_obj.SocketPort = port;
    jx_obj.IsSecure = secure;  // SSL or not
    jx_obj.applicationKey = Date.now()  + (id++) + "|" + appName;
    jx_obj.SecuredKey = encrypt(appKey, jx_obj.applicationKey);
    jx_obj.ListenUrl = "/" + appName + "/jx?de=1&";

    // public members

    this.Call = jx_obj.Call;
    this.Connect = jx_obj.Connect;
    this.Close = jx_obj.Close;
    this.GetClientId = jx_obj.GetClientId;
    this.SendToGroup = jx_obj.SendToGroup;
    this.Subscribe = jx_obj.Subscribe;
    this.Unsubscribe = jx_obj.Unsubscribe;

    this.ReConnect = function () {
        jx_obj.ReConnect(false);
    };

    this.on = function (event, listener) {
        eventEmitter.on(event, listener);
    };

    var _this = this;
};


// *************************************************************
// exports
// *************************************************************

exports.createClient = function (localTarget, appName, appKey, url, port, secure) {
    return new Client(localTarget, appName, appKey, url, port, secure);
};