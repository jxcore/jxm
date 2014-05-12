/**
 * license (MIT) Copyright Nubisa Inc. 2014
 */

var server = require('../../backend/jxm.js');

server.setApplication("ChatSample", "/chat", "NUBISA-STANDARD-KEY-CHANGE-THIS");

server.addJSMethod("chatMessage", function (env, params) {
    server.sendToAll("addText", params);
});

// below file will be available from: /chat/index.html
server.linkResource("/", ["./index.html", "text/html" ]);

// below file will be available from: /chat/assets/
server.linkResourcesFromPath("/assets/", "./assets/");


var options = {
    "rabbitmqOptions": {
        host: "server.cloudapp.net",
        login: "my_user",
        password : "my_pwd"
    },
    "httpServerPort" : 8002,
    "IPAddress" : "server.cloudapp.net"
};

server.setConfig(options);


server.start();

