/**
 * license (MIT) Copyright Nubisa Inc. 2014
 */

var server = require('../../index.js');

server.setApplication("ChatSample", "/chat", "NUBISA-STANDARD-KEY-CHANGE-THIS");

server.addJSMethod("chatMessage", function (env, params) {
//    console.log("server received", params);
    server.sendToAll("addText", params);
});

// below file will be available from: /chat/index.html
server.linkResource("/", ["./index3.html", "text/html" ]);

// below file will be available from: /chat/assets/
server.linkResourcesFromPath("/assets/", "./assets/");


var options = {
//    "rabbitmqOptions": {
//        host: "server.cloudapp.net",
//        login: "my_user",
//        password : "my_pwd"
//    },
    "httpServerPort" : 8001,
    "IPAddress" : "192.168.1.11",
//    "httpsServerPort" : 8000
};

//server.setConfig("rabbitmqOptions", { host: "server.cloudapp.net", login: "my_user", password : "my_pwd" });
//server.setConfig("rabbitmqOptions", { host: "localhost" });
//server.setConfig("IPAddress", "192.168.1.11");
server.setConfig(options);

server.start();