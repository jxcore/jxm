/**
 * license (MIT) Copyright Nubisa Inc. 2014
 */

/*
 1. client sends multiple requests to the server with Call()
 2. server responds with a sendCallback() and sends unicode characters
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
var client_cb_received = 0;
var strings = jx_commmon.unicodeStrings;

process.on('exit', function () {
    assert.ok(connected, "Client did not connect to the server.");
    assert.strictEqual(server_received, strings.length, "Server did not receive all messages.");
    assert.strictEqual(client_cb_received, strings.length, "Client did not receive all callbacks.");
    assert.ok(finished, "Test did not finish!");
});


// -------------   server
var server = require("./../../backend/jxm.js");
server.setApplication("TestApp", "/" + appName, appKey);

server.addJSMethod("server_method", function (env, params) {
    server_received++;
    server.sendCallBack(env, { id: params, str: strings[params] });
});

server.setConfig({ "IPAddress": ipAddress, "httpServerPort": httpServerPort, console: false });
server.start();

// -------------   client

var client = server.createClient(null, appName, appKey, ipAddress, httpServerPort, false);

client.on("connect", function (client) {
    connected = true;

    for (var id in strings) {
        client.Call("server_method", id, function (params) {
            assert.strictEqual(strings[params.id], params.str, "Client callback received `" + params.str + "` but should receive `" + strings[params.id] + "`");
            client_cb_received++;

            if (client_cb_received >= strings.length) {
                finished = true;
                process.exit();
            }
        });
    }
});

client.on('error', function (client, err) {
    console.error("client error: " + err);
});

client.Connect();
