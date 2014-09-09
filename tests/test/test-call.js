/**
 * license (MIT) Copyright Nubisa Inc. 2014
 */

var jx_commmon = require("./jx-common-simple.js"),
    console = jx_commmon.console,
    assert = jx_commmon.assert;


var appName = jx_commmon.getAppName();
var appKey = "NUBISA-STANDARD-KEY-CHANGE-THIS";
var ipAddress = "localhost";
var httpServerPort = 8001;

var connected = false;
var finished = false;
var server_received = false;

// this string is send from client to server
var request = "request - some string";

process.on('exit', function () {
    assert.ok(connected, "Client did not connect to the server.");
    assert.ok(server_received, "Server did not receive message from the client.");
    assert.ok(finished, "Test did not finish!");
});


// -------------   server

var server = require("./../../backend/jxm.js");
server.setApplication("TestApp", "/" + appName, appKey);

server.addJSMethod("server_method", function (env, params) {
    server_received = true;
    assert.strictEqual(params, request, "Server received `" + params + "` but should receive `" + request + "`");
    finished = true;
    process.exit();
});

server.setConfig({ "IPAddress": ipAddress, "httpServerPort": httpServerPort, console : false });
server.start();

// -------------   client

var client = server.createClient(null, appName, appKey, ipAddress, httpServerPort, false);

client.on("connect", function (client) {
    connected = true;
    client.Call("server_method", request);
});

client.on('error', function (client, err) {
    console.error("client error: " + err);
});

client.Connect();
