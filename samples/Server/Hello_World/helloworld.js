/**
 * Created by Nubisa Inc. on 12/19/13.
 */

// api docs:    http://jxcore.com/docs/jxcore-messaging.html
// tutorials:   http://jxcore.com/messaging-api/

var server = require('./../../../backend/jxm.js');

server.setApplication("Hello World", "/helloworld", "NUBISA-STANDARD-KEY-CHANGE-THIS");

// this method ("serverMethod") will be called by a client
server.addJSMethod("serverMethod", function (env, params) {
    server.sendCallBack(env, params + " World!");
});

server.linkResource("/", ["./index.html", "text/html" ]);

server.on('request', function(req, res){
    //do something here

    // if you don't want the request continue handling by jxm, return false, otherwise
    return true;
});

server.start();