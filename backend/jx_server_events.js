/**
 * license (MIT) Copyright Nubisa Inc. 2014
 */

var nserver = require('./jx_server');
var helpers = require('./jx_helpers');
var url = require('url');
var handler = require('./jx_server_handler');

function fillCNN(cnn) {
    cnn.parts = url.parse(cnn.req.url, true).query;

    if (cnn.parts.ms) {
        cnn.ms = cnn.parts.ms;
    }

    if (cnn.parts.c) {
        cnn.req.clid = cnn.parts.c;
    }

    if (cnn.parts.io) {
        cnn.req.ie = cnn.parts.io;
    }

    if (cnn.parts.did) {
        try {
            cnn._id = parseInt(cnn.parts.did);
        } catch (e) {
            cnn.res.end(0);
            return;
        }
    }

    if (cnn.parts.en) {
        var res = helpers.decKeys(cnn.parts.en);
        if (res) {
            cnn.groups = JSON.parse(res);
        }
    }

    if (cnn.parts.de) {
        try {
            cnn.req.desktop = parseInt(cnn.parts.de) == 1;
        } catch (e) {
        }
    }

    if (cnn.parts.sid && cnn.req.desktop) {

        var cp = helpers.decrypt(cnn.req.appKey, cnn.parts.sid);

        var end = false;

        if (!cp) {
            end = true;
        } else {
            var arr = cp.split('|');

            if (arr.length < 2) {
                end = true;
            }

            if ("/" + arr[1] != cnn.req.path && nserver.getNormalizedPath("/" + arr[1] + "/jx") != cnn.req.path) {
                end = true;
            }

            if (cnn.req.session) {
                cnn.req.session.id = arr[0];
            }
            else {
                cnn.req.session = {id: arr[0]};
            }
        }

        if (end) {
            if (cnn.type == helpers.ConnectionType.WebSocket) {
                cnn.ws.close(0);
            } else {
                cnn.res.end(0);
            }
            return null;
        }

    }

    return cnn;
}

nserver.listenOpen(function (tp, a, b) {
    if (tp == helpers.ConnectionType.WebSocket) {
        var cnn = fillCNN({type: tp, req: b, ws: a});
        if (!cnn) {
            return;
        }

        cnn.listen = true;

        handler.handleSocket(cnn);
    }
});

nserver.listenMessage(function (tp, a, b, ev, post) {
    var cnn = fillCNN({type: tp, req: b, res: a});

    if (!cnn) {
        return;
    }

    if (cnn.type == helpers.ConnectionType.HTTP) {
        cnn.res = a;
        cnn.post = post;

        if (post && post.c) {
            cnn.req.clid = post.c;
        }

        if (post && post.ms) {
            cnn.ms = post.ms;
        }

        if (post && post.did) {
            try {
                cnn._id = parseInt(post.did);
            } catch (e) {
                cnn.res.end(0);
                return;
            }
        }

        if (post && post.pi) {
            try {
                cnn.pi = post.pi.split('|');
            } catch (e) {
                cnn.res.end(0);
                return;
            }
        }

        // groups are parsed in fillCNN, but only from GET['en'] param.
        // if 'en' is not there, let's check POST['en']
        if (!cnn.groups && post && post.en) {
            var res = helpers.decKeys(post.en);
            if (res) {
                cnn.groups = JSON.parse(res);
            }
        }

        handler.handleHttp(cnn);
    } else {
        cnn.ws = a;
        cnn.ms = ev.data;
        cnn.res = null;
        handler.handleSocket(cnn);
    }
});

nserver.listenClose(function (type, a, b, ev) {
    if (b.clid) {
        handler.closeHttp(type, b, a);
    }
});

exports.Start = function (cb) {
    helpers.loadClientScript();
    process.setMaxListeners(0);

    var rabbit = require('./jx_rabbit_api');
    rabbit.OnConnected = function () {
        nserver.startServer();
        if (cb) {
            cb();
        }
    };
    rabbit.start();
};