/**
 * license (MIT) Copyright Nubisa Inc. 2014
 */

/*
    client tries to subscribe, but it is not allowed for him (enableClientSideSubscription : false)
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

var groupName = "myGroup";

process.on('exit', function () {
    assert.ok(connected, "Client did not connect to the server.");
    assert.ok(finished, "Test did not finish!");
});


// -------------   server
var server = require("./../../backend/jxm.js");
server.setApplication("TestApp", "/" + appName, appKey);

server.on("subscribe", function (env, params, allow) {
    console.error("Server's `subscribe` event should not be fired!");
});

server.setConfig({ "IPAddress": ipAddress, "httpServerPort": httpServerPort, console : false, consoleInfo : false, enableClientSideSubscription : false});
server.start();

// -------------   client

var client = server.createClient(null, appName, appKey, ipAddress, httpServerPort, false);

client.on("connect", function (client) {
    connected = true;
    client.Subscribe(groupName, function(group, err) {
        var id = server.getConfig("clientErrorCodes").clientSubscriptionDisabled.id;
        assert.strictEqual(err, id, "Client callback received errorCode `" + err + "` instead of `" + id + "`");
        finished = true;
        process.exit();
    });
});

client.on('error', function (client, err) {
    console.error("client error: " + err);
});

client.Connect();
