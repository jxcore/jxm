/**
 * license (MIT) Copyright Nubisa Inc. 2014
 */

var server = require('../../index.js');

server.setApplication("Channels", "/channels", "NUBISA-STANDARD-KEY-CHANGE-THIS");

server.addJSMethod("sendFromServer", function (env, params) {
    server.sendToGroup(params.groupName, params.methodName, params.message + "World!");
});

server.linkResource("/", ["./index.html", "text/html" ]);


server.on("subscribe", function(env, params, allow) {
    console.log("subscribing " + params.group);

    if (params.group === "fake") {
        allow("testGroup");
    } else {
        allow();
    }
});


server.on("subscribed", function(env, group, groups) {
    console.log("subscribed to ", group, groups);
});

server.addJSMethod("someMethod", function(env, param) {
    console.log("someMethod", param, env);
    if (param===2) {
        console.log("unsubs");
        server.unSubscribeClient(env, "testGroup");
    } else {
        console.log("subs");
        server.subscribeClient(env, "testGroup");
    }
    server.sendCallBack(env, "osiem");
});


server.start();