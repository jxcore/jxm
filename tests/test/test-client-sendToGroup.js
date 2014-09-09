/**
 * license (MIT) Copyright Nubisa Inc. 2014
 */

/*
 1. client subscribes to the channel
 2. waits for the callback
 3. sends to group
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
var client_received = false;

var groupName = "myGroup";

var message = jx_commmon.unicodeStrings.join(',');

process.on('exit', function () {
    assert.ok(connected, "Client did not connect to the server.");
    assert.ok(client_received, "Client did not receive message sent to the group.");
    assert.ok(finished, "Test did not finish!");
});


// -------------   server
var server = require("./../../backend/jxm.js");
server.setApplication("TestApp", "/" + appName, appKey);
server.setConfig({ "IPAddress": ipAddress, "httpServerPort": httpServerPort, console: false, consoleInfo: false, enableClientSideSubscription: true});
server.start();

// -------------   client


var customMethods = {
    client_method: function (client, str) {
        client_received = true;
        assert.strictEqual(str, message, "The message received is `" + str + "` but should be `" + message + "`");
        finished = true;
        process.exit();
    }
};

var client = server.createClient(customMethods, appName, appKey, ipAddress, httpServerPort, false);

client.on("connect", function (client) {
    connected = true;
    client.Subscribe(groupName, function (group) {
        client.SendToGroup(groupName, "client_method", message);
    });
});

client.on('error', function (client, err) {
    console.error("client error: " + err);
});

client.Connect();


