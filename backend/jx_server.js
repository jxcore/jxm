/**
 * license (MIT) Copyright Nubisa Inc. 2014
 */

var settings = require('./jx_node_settings');
var helpers = require('./jx_helpers');
var jxapps = require('./jx_applications');
var querystring = require('querystring');
var webSocket = require('faye-websocket'),
    http = require('http'), https = require('https'),
    handler = require('./jx_server_handler'),
    mediaserver = require('mediaserver');

var store;
if (global.jxcore) {
    store = jxcore.store.shared;
} else {
    store = helpers.store;
}

var fs = require("fs");
var serverEvents = {open: null, message: null, close: null, error: null};
var server = null;
var serverHttps = null;

var createServer = function (apx) {

    handler.gcInterval = setInterval(function () {
        handler.checkClients();
    }, 8000);

    var getSetCookies = function (req, res) {

        var arr = {_count: 0};
        var cookie = req.headers.cookie;

        if (cookie) {
            cookie.split(';').forEach(function (cookie) {
                var parts = cookie.split('=');
                arr[parts.shift().trim()] = querystring.unescape(parts.join('='));
                arr._count++;
            });
        }

        if (!arr.sid) {
            arr.sid = helpers.newSessionId();
            res.setHeader(
                'Set-Cookie', 'sid=' + arr.sid
            );
        }

        req.session = {id: arr.sid};
    };

    var serve = function (req, res) {
        if (!req.path) {
            return false;
        }

        var _path = null;
        if(store.exists(req.path))
            _path = req.path;
        else if(req.path == "/" && store.exists("/index.html")){
            _path = "/index.html";
        }

        if (_path) {
            var json = store.read(_path);
            var file = JSON.parse(json);
            return mediaserver.pipe(req, res, file.loc, file.type);
        }

        return false;
    };

    var fillReq = function (req, res) {
        var ip = req.connection.remoteAddress;

        if (ip) {
            var cit = 0, n = ip.length;
            while (n--) {
                cit += ip.charCodeAt(n);
            }
            req.cit = cit;
        }

        var socket = webSocket.isWebSocket(req);

        var appName = jxapps.apps[req.path];
        if (appName) {
            req.ctype = "application/json; charset=" + settings.encoding;
            if (!socket) {
                res.setHeader("Transfer-Encoding", "chunked");
            }
            req.appName = appName.name;
            req.appKey = appName.key;
        }
        else {
            req.ctype = "text/html;charset=" + settings.encoding;
            if (!socket) {
                res.writeHeader(404, {"Content-Type": req.ctype});
                res.write("JXcore Messaging v" + settings.mapiVersion + ". Resource not found.");
                res.end(0);
            }
            else {
                res.close(0);
            }
            return null;
        }

        return req;
    };

    var app = function (req, res) {

        if (!req.url) {
            res.end(0);
            return;
        }

        var socket = webSocket.isWebSocket(req);

        req.path = exports.getNormalizedPath(req.url.split('?')[0]);

        getSetCookies(req, res);

        if(helpers.emitEvent('request', req, res) === false){
            return;
        }

        if (serve(req, res)) {
            return;
        }

        req = fillReq(req, res);
        if (!req) {
            return;
        }

        if (!socket) {
            res.setHeader("Access-Control-Allow-Origin", req.headers.origin || "*");
            res.setHeader("Access-Control-Allow-Methods", "POST, GET, OPTIONS");
            res.setHeader("Access-Control-Allow-Headers", "POST, GET, OPTIONS");
            res.writeHeader(200, {"Content-Type": req.ctype});

            if (serverEvents.open) {
                serverEvents.open(helpers.ConnectionType.HTTP, res, req);
            }

            var listenClose = true;
            if (req.method == 'POST') {
                listenClose = false;
                var body = '';

                req.on('data', function (data) {
                    body += data;
                });

                req.on('end', function () {
                    var post = querystring.parse(body);
                    if (serverEvents.message) {
                        serverEvents.message(helpers.ConnectionType.HTTP, res, req, null, post);
                    }
                });
            }
            else {
                if (serverEvents.message) {
                    serverEvents.message(helpers.ConnectionType.HTTP, res, req, null);
                }
            }

            if (listenClose) {
                try {
                    var httpRequestClosed = function () {
                        if (serverEvents.close) {
                            serverEvents.close(helpers.ConnectionType.HTTP, res, req);
                        }

                        req.connection.removeListener('close', httpRequestClosed);
                    };
                    req.connection.setMaxListeners(0);
                    req.connection.addListener('close', httpRequestClosed);
                } catch (e) {
                }
            }
        }
    };

    if (apx) {
        apx.use(app);
    }
    else {
        apx = app;
    }

    if (settings.httpServerPort) {
        server = http.createServer(apx);
    }

    if (settings.httpsServerPort) {

        var https_options = {
            key: fs.readFileSync(settings.httpsKeyLocation),
            cert: fs.readFileSync(settings.httpsCertLocation)
        };

        serverHttps = https.createServer(https_options, apx);
    }

    var onupgrade = function (req, socket, body) {

        if (webSocket.isWebSocket(req)) {

            var ws = new webSocket(req, socket, body, null, {ping: 10});

            req.path = exports.getNormalizedPath(req.url.split('?')[0]);
            ws.req = fillReq(req, ws);
            if (!req) {
                return;
            }

            ws.onopen = function (ev) {
                if (serverEvents.open) {
                    serverEvents.open(helpers.ConnectionType.WebSocket, ev.currentTarget, ev.currentTarget.req, ev);
                }
            };

            ws.on('message', function (ev) {
                if (serverEvents.message) {
                    serverEvents.message(helpers.ConnectionType.WebSocket, ev.currentTarget, ev.currentTarget.req, ev);
                }
            });

            ws.on('error', function (ev) {
                if (serverEvents.error) {
                    serverEvents.error(helpers.ConnectionType.WebSocket, ev.currentTarget, ev.currentTarget.req, ev);
                }
            });

            ws.on('close', function (ev) {
                if (serverEvents.close) {
                    serverEvents.close(helpers.ConnectionType.WebSocket, ev.currentTarget, ev.currentTarget.req, ev);
                }
                ws = null;
            });
        }
    }
    if (server) {
        server.on('upgrade', onupgrade);
    }
    if (serverHttps) {
        serverHttps.on('upgrade', onupgrade);
    }
};

exports.startServer = function () {
    http.globalAgent = false;
    https.globalAgent = false;

    createServer(settings.Application);
    if (server) {
        server.listen(settings.httpServerPort);
    }
    if (serverHttps) {
        serverHttps.listen(settings.httpsServerPort);
    }
};

exports.listenOpen = function (cb) {
    serverEvents.open = cb;
};

exports.listenClose = function (cb) {
    serverEvents.close = cb;
};

exports.listenError = function (cb) {
    serverEvents.error = cb;
};

exports.listenMessage = function (cb) {
    serverEvents.message = cb;
};


exports.getNormalizedPath = function(str) {
    if (str && str.length > 2) {
        // removing repeated slashes from beginning of path, e.g. //jx
        while(str.indexOf("//") === 0) {
            str = str.slice(1);
        }
    }
    return str;
};