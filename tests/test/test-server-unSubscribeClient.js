/**
 * license (MIT) Copyright Nubisa Inc. 2014
 */

/*
 This unit unsubscribes a client from a group by a server-side all
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
var client_received = false;

var response = "response";
var groupName = "testGroup";

process.on('exit', function () {
    assert.ok(connected, "Client did not connect to the server.");
    assert.ok(server_received, "Server did not receive message from the client.");
    assert.ok(client_received, "Client did not receive on 'subscription' event.");
    assert.ok(finished, "Test did not finish!");
});


// -------------   server
var server = require("./../../backend/jxm.js");
server.setApplication("TestApp", "/" + appName, appKey);

server.addJSMethod("server_method", function (env, params) {
    server_received = true;
    server.unSubscribeClient(env, groupName);
});

server.setConfig({ "IPAddress": ipAddress, "httpServerPort": httpServerPort, console : false });
server.start();

// -------------   client

var client = server.createClient(null, appName, appKey, ipAddress, httpServerPort, false);

client.on("connect", function (client) {
    connected = true;
    client.Call("server_method", null);
});

client.on('error', function (client, err) {
    console.error("client error: " + err);
});

client.on('subscription', function (client, subscribed, group) {
    client_received = true;
    assert.strictEqual(subscribed, false, "Value of 'subscribed` should be false");
    assert.strictEqual(group, groupName, "The group name don't match: `" + group + "` and `" + groupName + "`");
    finished = true;
    process.exit();
});


client.Connect();
