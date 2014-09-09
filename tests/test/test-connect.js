/**
 * license (MIT) Copyright Nubisa Inc. 2014
 */

/*
    This unit tests jx messaging client connection to messaging server
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

process.on('exit', function () {
    assert.ok(connected, "Client did not connect to the server.");
});

// -------------   server
var server = require("./../../backend/jxm.js");
server.setApplication("TestApp", "/" + appName, appKey);
server.setConfig({ "IPAddress": ipAddress, "httpServerPort": httpServerPort, console : false });
server.start();

// -------------   client

var client = server.createClient(null, appName, appKey, ipAddress, httpServerPort, false);

client.on("connect", function (client) {
    connected = true;
    process.exit();
});

client.on('error', function (client, err) {
    console.error("client error: " + err);
    process.exit();
});

client.Connect();
