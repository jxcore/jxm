/**
 * license (MIT) Copyright Nubisa Inc. 2014
 */

var fs = require('fs');
var settings = require('./jx_node_settings');
var crypto = require('crypto');
var counter = 0, incA = 10, incB = 20, incC = 30, counter2 = 1111;
var chars = 'qwertyuiopasdfghjklzxcvbnmQWERTYUIOPASDFGHJKLZXCVBNM0123456789';
var querystring = require('querystring');

exports.clientScript = null;
exports.ProcessId = process.pid + process.threadId;

var regPlus = new RegExp("\\*\\*43\\;", "g");
var events = {};
var sdata = {};
exports.store = {
    set: function (k, v) {
        sdata[k] = v;
    },
    read: function (k) {
        return sdata[k];
    },
    exists: function (k) {
        return sdata[k] !== undefined;
    }
};

exports.addEvent = function (event, cb) {
    if(typeof cb === "function") {
        if (!events[event]) {
            events[event] = [];
        }
        events[event].push(cb);
    } else {
        throw new TypeError("Callback is not a function.");
    }
};

exports.emitEvent = function (event, param1, param2, param3) {
    if (events[event]) {
        for (var id in events[event]) {
            try {
                var res = events[event][id](param1, param2, param3);
                if(res === false){
                    return false;
                }
            }
            catch (e) {
                exports.logError("emitting " + event, e);
            }
        }
    }
    return true;
};

exports.hasEvent = function (event) {
    return events[event] && events[event].length;
};


exports.encKeys = function (txt) {
    if (!txt) {
        return null;
    }
    try {
        var cr = require('crypto');
        var id = settings.secureID("hju7846eefh");
        var cp = cr.createCipheriv('aes-256-cbc', id[0], id[1]); // 32 x 16
        var ed = cp.update(txt, 'utf8', 'hex');
        var str = ed + cp.final('hex');

        return str;
    } catch (e) {
        exports.logError("string could not encrypted", txt);
    }

    return null;
};

exports.decKeys = function (txt) {
    if (!txt) {
        return null;
    }
    try {
        var cr = require('crypto');
        var id = settings.secureID("hju7846eefh");
        var cp = cr.createDecipheriv('aes-256-cbc', id[0], id[1]);
        var ed = cp.update(txt, 'hex', 'utf8');

        try {
            ed += cp.final('utf8');
        }
        catch (e) {

        }

        return ed;
    } catch (e) {
        exports.logError("string could not be decrypted", txt);
    }
    return null;
};

exports.IdMatch = function (clid, cit) {
    if (!cit) {
        return true;
    }
    var n = cit.length;


    while (n--) {
        if (clid[n] != cit[n]) {
            return false;
        }
    }

    return true;
};

String.prototype.trimASCII = function () {
    return this.replace(/([^\x00-\xFF]|\s)*$/g, '');
};

exports.encrypt = function (key, message) {
    var cipher = crypto.createCipher('aes-128-ecb', key);
    // should be base64, otherwise encrypt() is not compatible with decrypt()
    var crypted = cipher.update(message, 'utf8', 'base64');
    crypted += cipher.final('base64');

    return querystring.escape(crypted);
};

exports.decrypt = function (key, encryptdata) {
    try {
        encryptdata = encryptdata.replace(regPlus, "+").trimASCII();

        var str = querystring.unescape(encryptdata);

        var data = new Buffer(str, 'base64').toString('binary');

        var decipher = crypto.createDecipher('aes-128-ecb', key);
        decipher.setAutoPadding(true);
        var decoded = decipher.update(data);

        decoded += decipher.final();
        return decoded;
    } catch (e) {
        return null;
    }
};


var colors = {
    black: 30,
    red: 31,
    green: 32,
    brown: 33,
    blue: 34,
    magenta: 35,
    cyan: 36,
    gray: 37,

    thread0: 36, // cyan
    thread1: 32, // green
    thread2: 35,  // magenta
    thread3: 34 // blue
};

var colorize = function (txt, color) {

    if (!color) return txt;
    if (color == -1 && process.subThread) {
        color = colors["thread" + process.threadId % 3]
    }

    if (color) {
        return "\033[" + color + "m" + txt + "\033[0m";
    } else {
        return txt;
    }
};

exports.log = function (message, message2) {
    if (!settings.console) {
        return;
    }

    if (!message2) {
        message2 = "";
    }

    if (settings.consoleThreadNumber && process.subThread) {
        console.log(colorize("Thread#" + process.threadId, -1), message, message2);
    } else {
        console.log(message, message2);
    }
};

exports.logError = function (e, message) {
    if (!settings.console) {
        return;
    }

    if (!e) {
        e = "";
    }
    if (!message) {
        message = "";
    }
    if (settings.consoleThreadNumber && process.subThread) {
        console.log(colorize("Thread#" + process.threadId, -1), "Error:", e, message);
    } else {
        console.log("Error: ", e, message);
    }
};

exports.logInfo = function (message, details) {

    if (!settings.consoleInfo) {
        return;
    }

    if (!details) {
        details = "";
    }

    if (settings.consoleThreadNumber && process.subThread) {
        console.log(colorize("Thread#" + process.threadId, -1), message, details);
    } else {
        console.log(message, details);
    }
};

exports.logDebug = function () {
    var args = [];
    for (var id in arguments) {
        args.push(arguments[id]);
    }
    console.log(args.join(", "));
};

exports.getSession = function (cnn) {
    var clid = cnn.req.clid;

    var pos = clid.indexOf('a');
    var pos2 = clid.indexOf('@');

    var sid = null;
    if (pos > 0 && pos2>pos) {
        sid = clid.substr(pos+1, pos2-(pos+1));
    }
    cnn.req.session = {id: sid};
};

exports.newSessionId = function () {
    var clid = exports.ProcessId + "" + chars[incA] + chars[incB] + chars[incC] + "" + ((counter++));

    if (counter >= 10) {
        counter = 0;
        incA++;
    }

    if (incA >= 62) {
        incA = 0;
        incB++;
    }

    if (incB >= 62) {
        incB = 0;
        incC++;
    }

    if (incC >= 62) {
        incC = 0;
    }

    return clid;
};

exports.newClientId = function (sid, cit) {

    if (counter2++ >= 9999) {
        counter2 = 1111;
    }

    var extra = Math.floor(Math.random() * 1000).toString().slice(0, 3);

    if (sid) {
        return cit + "a" + sid + "@" + counter2 + extra;
    }

    /* 2M unique ids per ip - thread */

    return cit + "a" + exports.newSessionId() + "@" + counter2 + extra;
};

exports.ConnectionType = {HTTP: 1, WebSocket: 2};

exports.readStaticContent = function (dir, isBinaryFile) {
    var _file = fs.readFileSync(dir);

    if (isBinaryFile) {
        return _file;
    } else {
        return "" + _file;
    }
};

var clientScript = null;
exports.loadClientScript = function () {
    if (clientScript) {
        return clientScript;
    }

    clientScript = fs.readFileSync(__dirname + '/jx_browser_client.txt') + "";

    clientScript = clientScript.replace("$$encMode$$", settings.base64.toString().toLowerCase())
        .replace("$$encoding$$", settings.encoding)
        .replace("$$listenerTimeout$$", settings.listenerTimeout)
        .replace("JXMAPI_VERSION", settings.mapiVersion)
        .replace("$$chunked$$", settings.chunked)

    exports.clientScript = clientScript;
};