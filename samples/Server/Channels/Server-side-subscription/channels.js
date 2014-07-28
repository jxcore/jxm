/**
 * Created by Nubisa Inc. on 12/19/13.
 */

// api docs:    http://jxcore.com/docs/jxcore-messaging.html
// tutorials:   http://jxcore.com/messaging-api/

var server = require('../../../../backend/jxm.js');

server.setApplication("Channels", "/channels", "NUBISA-STANDARD-KEY-CHANGE-THIS");
server.linkResource("/", ["./index.html", "text/html" ]);

// when client will call "someMethod" with argument "true"
// server will subscribe him to a "testGroup"
server.addJSMethod("someMethod", function(env, param) {
    if (param) {
        server.subscribeClient(env, "testGroup");
    } else {
        server.unSubscribeClient(env, "testGroup");
    }
});

server.start();