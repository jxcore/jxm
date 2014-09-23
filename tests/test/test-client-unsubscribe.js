/**
 * license (MIT) Copyright Nubisa Inc. 2014
 */

/*
 1. client subscribes to the channel, waits for the callback and then unsubscribes
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
var unsubscribed_on_server = false;
var subscribed_cb_received = false;

var groupName = "myGroup";

process.on('exit', function () {
    assert.ok(connected, "Client did not connect to the server.");
    assert.ok(unsubscribed_on_server, "Server did not receive subscribe request.");
    assert.ok(subscribed_cb_received, "Client did not receive subscription callback.");
    assert.ok(finished, "Test did not finish!");
});


// -------------   server
var server = require("./../../backend/jxm.js");
server.setApplication("TestApp", "/" + appName, appKey);

server.on("unsubscribe", function (env, params, allow) {
    unsubscribed_on_server = true;
    assert.strictEqual(params.group, groupName, "The group name don't match: `" + params.group + "` and `" + groupName + "`");
    finished = true;
    process.exit();
});

server.setConfig({ "IPAddress": ipAddress, "httpServerPort": httpServerPort, console : false, consoleInfo : false, enableClientSideSubscription : true});
server.start();

// -------------   client

var client = server.createClient(null, appName, appKey, ipAddress, httpServerPort, false);

client.on("connect", function (client) {
    connected = true;
    client.Subscribe(groupName, function(group) {
        subscribed_cb_received = true;
        assert.strictEqual(group, groupName, "The group name don't match in client's callback: `" + group + "` and `" + groupName + "`");
        client.Unsubscribe(groupName);
    });
});

client.on('error', function (client, err) {
    console.error("client error: " + err);
});

client.Connect();
