/**
 * license (MIT) Copyright Nubisa Inc. 2014
 */


var jx_commmon = require("./jx-common-simple.js"),
    console = jx_commmon.console,
    assert = jx_commmon.assert;


// -------------   init part

var appName = jx_commmon.getAppName();
var appKey = "NUBISA-STANDARD-KEY-CHANGE-THIS";
var ipAddress = "localhost";
var httpServerPort = 8001;

var finished = false;
var clients_connected = { cnt : 0 };
var server_received = false;
var clients_received = { cnt : 0};

var clients_count = 5;
var response = "response";

var checkArray = function (arr, errMessage) {
    var error_ids = [];
    for (var a = 0; a < clients_count; a++) {
        if (!arr[a]) {
            error_ids.push(a);
        }
    }
    assert.strictEqual(error_ids.length, 0, errMessage + error_ids.join(","));
};


process.on('exit', function () {
    assert.ok(server_received, "Server did not receive message from the client.");

    checkArray(clients_connected, "Not all of the clients was able to connect. Failed clients: ");
    checkArray(clients_received, "Not all of the clients received server's sendToAll(). Failed clients: ");

    assert.ok(finished, "Test did not finish!");
});


// -------------   server
var server = require("./../../backend/jxm.js");
server.setApplication("TestApp", "/" + appName, appKey);

// server receives ony from one client
server.addJSMethod("server_method", function (env, params) {
    server_received = true;
    server.sendToAll("client_method", response);
});

server.setConfig({ "IPAddress": ipAddress, "httpServerPort": httpServerPort, console: false });
server.start();

// -------------   client

var customMethods = {
    "client_method": function (client, params) {
//        console.log("client received " + client.iddd + ", "  + JSON.stringify(params));
        clients_received[client.iddd] = true;
        clients_received.cnt++;

        assert.strictEqual(params, response, "Client received `" + params + "` but should receive `" + response + "`");

        if (clients_received.cnt == clients_count) {
            finished = true;
            process.exit();
        }
    }
};


for (var id = 0; id < clients_count; id++) {

    var client = server.createClient(customMethods, appName, appKey, ipAddress, httpServerPort, false);
    client.iddd = id;

    client.on("connect", function (client) {
        clients_connected[client.iddd] = true;
        clients_connected.cnt++;

        // only one client (last connected) calls server's method
        if (clients_connected.cnt == clients_count) {
            client.Call("server_method", client.iddd);
        }
    });

    client.on('error', function (client, err) {
        console.error("client " + client.iddd + " error: " + err);
    });

    client.Connect();
}