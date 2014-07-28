/**
 * Created by Nubisa Inc. on 12/19/13.
 */

// api docs:    http://jxcore.com/docs/jxcore-messaging.html
// tutorials:   http://jxcore.com/messaging-api/

var server = require('../../../../backend/jxm.js');

server.setApplication("Channels", "/channels", "NUBISA-STANDARD-KEY-CHANGE-THIS");

// here we define server's custom method "sendFromServer"
// what it does is invoking params.methodName on every client subscribed to a params.groupName
server.addJSMethod("sendFromServer", function (env, params) {
    server.sendToGroup(params.groupName, params.methodName, params.message + "World!");
});

server.linkResource("/", ["./index.html", "text/html" ]);

// the following two event are to control client's subscription/unsubsription requests
server.on("subscribe", function(env, params, allow) {
    if (params.group !== "admin_group") {
        allow();
    }
});

server.on('sendToGroup', function(env, params, allow) {
    if (params.group === "programmers" && params.method === "clientsMethod") {
        allow();
    }
});

server.setConfig("enableClientSideSubscription", true);
server.start();