/**
 * license (MIT) Copyright Nubisa Inc. 2014
 */

var settings = require('./jx_node_settings');
var app = require('./jx_applications');
var customs = require('./jx_custom_data');
var helpers = require('./jx_helpers');
var messages = require('./jx_message_manager');
var handler = require('./jx_server_handler');
var fs = require('fs');
var path = require('path');
var mediaserver = require('mediaserver');
var jxm_client = require('./jxm_client');

var store;
if (global.jxcore) {
    store = jxcore.store.shared;
} else {
    store = helpers.store;
}

var appName = null;
var appURL = null;

/**
 * Defines new application.
 * @param applicationName {string} - Name of the application.
 * @param urlPath {string} - The application's root url.
 * @param secretKey {string} - The key for encrypting the client locator.
 * @example <caption>server-side (my_server.js):</caption>
 * server.setApplication("ChatSample", "/chat", "NUBISA-STANDARD-KEY-CHANGE-THIS");
 * @example <caption>HTML#client-side (index.html):</caption>
 * Please note, that the "/chat" part in the url below is the urlPath parameter described above.
 * <script src="http://example.com:8000/chat/jx?ms=connect" type="text/javascript"></script>
 */
exports.setApplication = function (applicationName, urlPath, secretKey) {
    if (!urlPath) {
        throw "urlPath can not be null or undefined!";
    }

    if (!urlPath.trim || !urlPath.indexOf || !urlPath.length) {
        throw "urlPath must be a string or at least supporting trim, length(>0) and indexOf";
    }
    urlPath = urlPath.trim();
    var ln = urlPath.length;
    if (!ln) {
        throw "urlPath must have something. i.e. trimmed length>0";
    }

    appURL = urlPath;
    var location;
    if (urlPath[ln - 1] === "/")
        location = urlPath + "jx";
    else
        location = urlPath + "/jx";

    app.apps[location] = {name: applicationName, key: secretKey};
    appName = applicationName;

    customs.customMethods[appName] = {};
};

/**
 * Adds custom method to the application. This method can be called from the client's side.
 * @param name {string} - Name of the method.
 * @param method {function} - Method itself.
 * @method
 * @example <caption>server-side (my_server.js):</caption>
 * server.addJSMethod("chatMessage", function (env, params) {
 *     server.sendToAll("addText", params );
 * });
 * @example <caption>HTML#client-side (index.html):</caption>
 * <script type="text/javascript">
 *     messaging.Call("chatMessage", "hello");
 * </script>
 */
exports.addJSMethod = function (name, method) {
    if (!appName || !method) {
        if (!method)
            throw "method can not be null or undefined";
        throw "You should define the Application Name first! Call addApplication prior to adding a method.";
    }

    customs.customMethods[appName][name] = {"call": method};
};

/**
 * Defines static resource file used by the application.
 * @param urlPath {string} - The url path, from which your application will access the resource file.
 * Please note, that it will be combined with urlPath provided in setApplication() method.
 * @param filePath {string} - Server's filesystem path (relative or absolute) to the resource file.
 * @example <caption>server-side (my_server.js):</caption>
 * server.setApplication("ChatSample", "/chat", "NUBISA-STANDARD-KEY-CHANGE-THIS");
 *
 * // if we add resource like this:
 * server.linkResource("/app", ["./index.html", "text/html" ]);
 *
 * // we could access it for example with a browser:
 * // http://host:port/chat/app
 *
 * // please note, that "/chat" part is a root path for entire application
 * // (provided in setApplication()), while "/app" part is an argument from the linkResource().
 * // now, the both combine into "/chat/assets"
 */
exports.linkResource = function (urlPath, filePath) {
    if (!urlPath || !filePath) {
        throw "urlPath and filePath can not be null or undefined!";
    }

    var m = urlPath.length;
    if (m && !store.exists(urlPath)) {
        if (filePath instanceof Array) {
            filePath = {loc: filePath[0], type: filePath[1]};
        }
        filePath = JSON.stringify(filePath);

        var location;
        if (appURL[appURL.length - 1] === '/' && urlPath[0] === '/') {
            location = appURL.substr(0, appURL.length - 1) + urlPath;
        }
        else
            location = appURL + urlPath;

        store.set(location, filePath);
        m = location.length;

        if (m > 1) {
            if (location.charAt(m - 1) == "/") {
                store.set(location.substr(0, m - 1), filePath);
            }
            else {
                store.set(location + "/", filePath);
            }
        }
    }
};

/**
 * Links assets embedded inside compiled JX file and defines them as static resource used by the application.
 * @param urlPath {string} - The url path, from which your application will access the asset files.
 * Please note, that it will be combined with urlPath provided in setApplication() method.
 * @param JXP {object} - The JXP object, which is embedded inside compiled JX file, and holds contents of JXP project file.
 * You can access the JXP object by calling exports.$JXP.
 * @example
 * // let's assume, that your JXP file contains asset definition:
 * {
 *      ...
 *      ...
 *      "assets": [
 *          "README.txt",
 *          "Licence.txt"
 *      ],
 *      ...
 * }
 *
 * // then you can link them to your application in a runtime:
 * server.linkAssets("/files", exports.$JXP);
 *
 * // now, we could access it for example with a browser:
 * // http://host:port/chat/files/README.txt
 *
 * // please note, that "/chat" part is a root path for entire application
 * // (provided in setApplication()), while "/files" part is an argument from the linkAssets().
 * // now, the both combine into "/chat/files"
 */
exports.linkAssets = function (urlPath, JXP) {
    if (!JXP || !JXP.assets) {
        return;
    }
    exports.linkResourcesFromPath(urlPath, JXP.assets);
};

/**
 * List of supported types for resource files. You can edit it as you want.
 * @enum {string}
 * @example <caption>server-side (my_server.js):</caption>
 * // If you want to add new 'avi' type, you can do it like this:
 * server.allowedResourceTypes.avi = "video/avi";
 * // Or you can delete the existing one:
 * delete server.allowedResourceTypes.woff;
 */
exports.allowedResourceTypes = mediaserver.types;

/**
 * Allows linking multiple resources recursively from a given directory.
 * @param url {string} - The url path, from which your application will access the resource files.
 * Please note, that it will be combined with urlPath provided in setApplication() method.
 * @param dir {string} - Server's filesystem path (relative or absolute) to the folder containing resource files.
 * @example <caption>server-side (my_server.js):</caption>
 * server.setApplication("ChatSample", "/chat", "NUBISA-STANDARD-KEY-CHANGE-THIS");
 *
 * // adding the whole ./assets directory (relative path from nodeJX server's working directory).
 * server.linkResourcesFromPath("/assets/", "./assets/");
 *
 * // now we could access it for example with a browser:
 * // http://host:port/chat/assets
 *
 * // please note, that "/chat" part is a root path for entire application
 * // (provided in setApplication()), while "/assets" part is an argument
 * // from the linkResourcesFromPath().
 * // now, the both combine into "/chat/assets"
 */
exports.linkResourcesFromPath = function (url, dir) {
    if (!dir || !url) {
        throw "url or dir can not be null or undefined";
    }

    var files;
    if (dir instanceof Array)
        files = dir;
    else
        files = fs.readdirSync(dir);

    for (var a = 0, len = files.length; a < len; a++) {
        var file = dir + path.sep + files[a];
        var fileInfo = fs.statSync(file);

        if (fileInfo.isDirectory()) {
            exports.linkResourcesFromPath(url + files[a] + path.sep, dir + path.sep + files[a] + path.sep);
            continue;
        }

        var ext = path.extname(file).toLowerCase();
        if (ext.length && mediaserver.mediaTypes[ext]) {
            exports.linkResource(url + files[a], {loc: file, type: mediaserver.mediaTypes[ext]});
        }
        else continue;
    }
};

/**
 * Sends message to group of subscribers, currently connected to the application.
 * @param groupName {string} - Name of the subscribers' group.
 * @param methodName {string} - Name of the method invoked on the client's side (every subscriber of this group should has this method defined).
 * @param params {object} - Argument for the method above. It can be anything - string, number or json object containing many values.
 * @example <caption>server-side (my_server.js):</caption>
 * // Server can send message to group of subscribers, but they need to subscribe first.
 * // See the documentation for Client API.
 *
 * // In the code below, whenever client will call server's sendFromServer() method
 * // with "Hello" as params argument, the server for each client
 * // subscribed to programmers channel, will invoke his clientCustomMethod()
 * // passing there "Hello World!" string.
 *
 * server.addJSMethod("sendFromServer", function (env, params) {
 *     server.sendToGroup("programmers", "clientCustomMethod", params + "World!");
 * });
 */
exports.sendToGroup = function (groupName, methodName, params) {
    messages.sendToGroup(appName, groupName, messages.createMessage(methodName, params));
};

/**
 * Send message to all of the clients connected currently to the application.
 * @param methodName {string} - Name of the method invoked on the client's side (every subscriber of this group should has this method defined).
 * @param params {object} - Argument for the method above. It can be anything - string, number or json object containing many values.
 */
exports.sendToAll = function (methodName, params) {
    exports.sendToGroup("ALL", methodName, params);
};

/**
 * Calls the callback method at specific client.
 * @param env {object} - This is the same parameter, which you received as argument for a custom method defined by you with addJSMethod.
 * @param params {object} - Argument for the callback. It can be anything - string, number or json object containing many values.
 * @example <caption>server-side (my_server.js):</caption>
 * server.addJSMethod("serverMethod", function (env, params) {
 *     // server responses to a client by calling it's callback
 *     server.sendCallBack(env, params + " World!");
 * });
 */
exports.sendCallBack = function (env, params) {
    messages.sendCallback(env.ClientId, env.Index, params);
};


/**
 * Starts JXcore application. From now on, it will be accessible for the clients.
 * @param options {object} - optional parameters for the server
 * @subparam port {int} - optional port address for server to listen (default 8000)
 * @subparam securePort {int} - optional port address for https server to listen (default 8443)
 * @subparam address {string} - optional ip address or url for the service (default localhost)
 */
exports.start = function (options) {

    // let this message display always, no matter if server starts or not
    helpers.log("jxm.io v" + settings.mapiVersion);

    if (options) {
        if (options.port) {
            settings.httpServerPort = options.port;
        }
        if (options.securePort) {
            settings.httpsServerPort = options.securePort;
        }
        if (options.address) {
            settings.IPAddress = options.address;
        }
    }

    // https
    if (settings.httpsServerPort) {
        // let's check cert files before we start the server

        if (!settings.httpsCertLocation || !fs.existsSync(settings.httpsCertLocation)) {
            settings.httpsServerPort = null;
            helpers.log("The httpsCertLocation setting is not defined or the file does not exist. HTTPS server will not start");
        }

        if (!settings.httpsKeyLocation || !fs.existsSync(settings.httpsKeyLocation)) {
            settings.httpsServerPort = null;
            helpers.log("The httpsKeyLocation setting is not defined or the file does not exist. HTTPS server will not start");
        }

        if (settings.httpsServerPort) {
            handler.secureSocketURL = "wss://" + settings.IPAddress + ":" + settings.httpsServerPort;
        }
    }

    // http
    if (settings.httpServerPort) {
        handler.socketURL = "ws://" + settings.IPAddress + ":" + settings.httpServerPort;
    }

    if (settings.httpServerPort > 0 || settings.httpsServerPort > 0) {
        require('./jx_server_events').Start(function () {

            // now the server is started
            if (settings.httpServerPort) {
                helpers.log("HTTP  -> http" + handler.socketURL.substr(2) + appURL);
            }
            if (settings.httpsServerPort) {
                helpers.log("HTTPS -> http" + handler.secureSocketURL.substr(2) + appURL);
            }

            helpers.emitEvent("start");
        });
    }
    else {
        throw "set either httpServerPort or httpsServerPort";
    }
};

/**
 * Defines value for application's parameter. Allows to change server's configuration.
 * @param key {string} - Name of the parameter.
 * @param value {object} - New value for the parameter.
 * OR
 * @param settings {object} - combined key value set
 */
exports.setConfig = function (key, value) {
    // null values should be allowed
    if (value !== undefined) {
        settings[key] = value;
    } else {
        for (var o in key) {
            settings[o] = key[o];
        }
    }
};

/**
 * Get value of application's parameter.
 * @param key {string} - Name of the parameter.
 * @returns {object} - Current value of the parameter.
 */
exports.getConfig = function (key) {
    if (!key) {
        return null;
    }

    return settings[key];
};

/**
 * Defines the server engine (like express)...
 * @param app {object}
 */
exports.setEngine = function (app) {
    if (!app.use) {
        throw "app.use does not exist!";
    }

    settings.Application = app;
};


/**
 * Adds event listeners for the server.
 * @param event {string} - Event name.
 * @param listener {function} - Callback function which will be invoked upon emit of the event.
 */
exports.on = function (event, listener) {
    if(typeof listener === "function") {
        helpers.addEvent(event, listener);
    } else {
        throw new TypeError("Listener is not a function.");
    }
};


exports.subscribeClient = function (env, group) {
    // server-side subscription
    env.ssCall = true;
    var cnn = handler.listeners[env.ClientId];

    if (cnn) {
        messages.subscribeClient(env, cnn, group, cnn.groups || {});
    } else {
        var rec = {
            env: env,
            cmd: "ssTo",
            group: group,
            groups: {}
        };
        messages.sendSystemMessage(rec);
    }
};


exports.unSubscribeClient = function (env, group) {
    env.ssCall = true;
    var cnn = handler.listeners[env.ClientId];

    if (cnn) {
        messages.unsubscribeClient(env, cnn, group, cnn.groups || {});
    } else {
        var rec = {
            env: env,
            cmd: "unTo",
            group: group,
            groups: {}
        };
        messages.sendSystemMessage(rec);
    }
};

/**
 * Creates an instance of JXcore Client with specified application name `appName` and application key `appKey`.
 * The url parameter specifies JXcore server URL, e.g. sampledomain.com or 120.1.2.3.
 * @param localTarget {object} - Object containing custom methods, which will be answering the calls from server.
 * In that object you will define client methods, which will be callable by other clients or the server itself.
 * @param appName {string} - Name of the application.
 * @param appKey {string} - Unique key for the application.
 * @param url {string} - IP or dns address, on which server will be accessible for the clients.
 * @param port {number} - Port for the server.
 * @param secure {boolean} - Enabling SSL support
 * @return {exports.createClient}
 */
exports.createClient = function (localTarget, appName, appKey, url, port, secure) {
    return new jxm_client.createClient(localTarget, appName, appKey, url, port, secure);
};


exports.mediaserver= require('mediaserver');