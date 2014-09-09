/**
 * license (MIT) Copyright Nubisa Inc. 2014
 */

/*
 1. client sends multiple requests to the server with Call()
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
var server_received = 0;

// this string is send from client to server
var strings = jx_commmon.unicodeStrings;


process.on('exit', function () {
    assert.ok(connected, "Client did not connect to the server.");
    assert.strictEqual(server_received, strings.length, "Server did not receive all messages.");
    assert.ok(finished, "Test did not finish!");
});

// -------------   server
var server = require("./../../backend/jxm.js");
server.setApplication("TestApp", "/" + appName, appKey);

server.addJSMethod("server_method", function (env, params) {
    server_received++;
    assert.strictEqual(strings[params.id], params.str, "String id: " + params.id + ", server received `" + params.str + "` but should receive `" + strings[params.id] + "`");

    if (server_received >= strings.length) {
        finished = true;
        process.exit();
    }
});

server.setConfig({ "IPAddress": ipAddress, "httpServerPort": httpServerPort, console: false });
server.start();

// -------------   client

var client = server.createClient(null, appName, appKey, ipAddress, httpServerPort, false);

client.on("connect", function (client) {
    connected = true;
    for (var id in strings) {
        client.Call("server_method", { id: id, str: strings[id] });
    }
});

client.on('error', function (client, err) {
    console.error("client error: " + err);
});

client.Connect();