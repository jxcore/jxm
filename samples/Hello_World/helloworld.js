/**
 * license (MIT) Copyright Nubisa Inc. 2014
 */

var server = require('../../index.js');

server.setApplication("Hello World", "/helloworld", "NUBISA-STANDARD-KEY-CHANGE-THIS");

server.addJSMethod("serverMethod", function (env, params) {
    server.sendCallBack(env, params + " World!");
});

server.linkResource("/", ["./index.html", "text/html" ]);

server.start( { address: "127.0.0.1"});