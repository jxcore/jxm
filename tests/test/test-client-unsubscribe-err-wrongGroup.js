/**
 * license (MIT) Copyright Nubisa Inc. 2014
 */

/*
 1. client subscribes to the channel, waits for the callback and then unsubscribes from a wrong group
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
var subscribed_cb_received = false;

process.on('exit', function () {
    assert.ok(connected, "Client did not connect to the server.");
    assert.ok(subscribed_cb_received, "Client did not receive subscription callback.");
    assert.ok(finished, "Test did not finish!");
});


// -------------   server
var server = require("./../../backend/jxm.js");
server.setApplication("TestApp", "/" + appName, appKey);
server.setConfig({ "IPAddress": ipAddress, "httpServerPort": httpServerPort, console : false, consoleInfo : false, enableClientSideSubscription : true});
server.start();

// -------------   client

var client = server.createClient(null, appName, appKey, ipAddress, httpServerPort, false);

client.on("connect", function (client) {
    connected = true;

    client.Subscribe("group", function(group) {
        subscribed_cb_received = true;
        client.Unsubscribe("wrongGroup", function(group, err) {
            var id = server.getConfig("clientErrorCodes").clientNotInTheGroup.id;
            assert.strictEqual(err, id, "Client callback received errorCode `" + err + "` instead of `" + id + "`");
            finished = true;
            process.exit();
        });
    });


});

client.on('error', function (client, err) {
    console.error("client error: " + err);
});

client.Connect();
