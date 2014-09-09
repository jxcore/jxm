/**
 * license (MIT) Copyright Nubisa Inc. 2014
 */

/*
 1. client sends request to the server with Call()
 2. server responds with a sendCallback()
 */

var jx_commmon = require("./jx-common-simple.js"),
    console = jx_commmon.console,
    assert = jx_commmon.assert;


// -------------   init part

var appName = jx_commmon.getAppName();
var appKey = "NUBISA-STANDARD-KEY-CHANGE-THIS";
var ipAddress = "localhost";
var httpServerPort = 8001;

var connected = false;
var finished = false;
var server_received = false;
var client_cb_received = false;

var response = "response";

process.on('exit', function () {
    assert.ok(connected, "Client did not connect to the server.");
    assert.ok(server_received, "Server did not receive message from the client.");
    assert.ok(client_cb_received, "Client did not receive callback from the server.");
    assert.ok(finished, "Test did not finish!");
});


// -------------   server

var server = require("./../../backend/jxm.js");
server.setApplication("TestApp", "/" + appName, appKey);

server.addJSMethod("server_method", function (env, params) {
    server_received = true;
    server.sendCallBack(env, response);
});

server.setConfig({ "IPAddress": ipAddress, "httpServerPort": httpServerPort, console : false });
server.start();

// -------------   client

var client = server.createClient(null, appName, appKey, ipAddress, httpServerPort, false);

client.on("connect", function (client) {
    connected = true;
    client.Call("server_method", null, function(str) {
        assert.strictEqual(str, response, "Client callback received `" + str + "` but should receive `" + response + "`");
        client_cb_received = true;
        finished = true;
        process.exit();
    });
});

client.on('error', function (client, err) {
    console.error("client error: " + err);
});

client.Connect();
