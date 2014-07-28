/**
 * Created by Nubisa Inc. on 12/19/13.
 */

// api docs:    http://jxcore.com/docs/jxcore-messaging.html
// tutorials:   http://jxcore.com/messaging-api/

var server = require('./../../../backend/jxm.js');

server.setApplication("ChatSample", "/chat", "NUBISA-STANDARD-KEY-CHANGE-THIS");

server.addJSMethod("chatMessage", function (env, params) {
    server.sendToAll("addText", params);
});

// below file will be available from: /chat/index.html
server.linkResource("/", ["./index.html", "text/html" ]);

// below file will be available from: /chat/assets/
server.linkResourcesFromPath("/assets/", "./assets/");

server.start();