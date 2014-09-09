/**
 * license (MIT) Copyright Nubisa Inc. 2014
 */

var jx_commmon = require("./jx-common-simple.js"),
    console = jx_commmon.console,
    assert = jx_commmon.assert;

// -------------   init part

var appName = jx_commmon.getAppName();
var appKey = "NUBISA-STANDARD-KEY-CHANGE-THIS";
var ipAddress = "localhost";
var httpServerPort = 8001;

var finished = false;
var clients_connected = {};
var clients_received = { cnt: 0};

var clients_count = 5;

var groupName = "myGroup";
var response = "response";

var message = jx_commmon.unicodeStrings.join(',');


var checkArray = function (arr, errMessage, checkDeep) {
    var error_ids = [];
    for (var a = 0; a < clients_count; a++) {
        if (!arr[a]) {
            error_ids.push(a);
        }
        if (checkDeep) {
            for (var b = 0; b < clients_count; b++) {
                if (!arr[a][b]) {
                    error_ids.push(a + ":" + b);
                }
            }
        }
    }
    assert.strictEqual(error_ids.length, 0, errMessage + error_ids.join(","));
};


process.on('exit', function () {
    checkArray(clients_connected, "Not all of the clients was able to connect. Failed clients: ");
    checkArray(clients_received, "Not all of the clients received from sendToGroup(). Failed clients: ", true);

    assert.ok(finished, "Test did not finish!");
});


// -------------   server
var server = require("./../../backend/jxm.js");
server.setApplication("TestApp", "/" + appName, appKey);
server.setConfig({ "IPAddress": ipAddress, "httpServerPort": httpServerPort, console: false, consoleInfo: false, enableClientSideSubscription: true});
server.start();

// -------------   client

var customMethods = {
    "client_method": function (client, params) {
        clients_received[client.iddd][params.id] = true;
        clients_received.cnt++;

        assert.strictEqual(params.str, message, "Client received `" + params.str + "` but should receive `" + message + "`");

        // each client should receive message from each other client
        if (clients_received.cnt == clients_count * clients_count) {
            finished = true;
            process.exit();
        }
    }
};

for (var id = 0; id < clients_count; id++) {

    var client = server.createClient(customMethods, appName, appKey, ipAddress, httpServerPort, false);
    client.iddd = id;

    client.on("connect", function (client) {
//        console.log("client connected " + client.iddd)
        clients_connected[client.iddd] = true;
        clients_received[client.iddd] = {};

        client.Subscribe(groupName, function (group) {
            client.SendToGroup(groupName, "client_method", { id: client.iddd, str: message });
        });
    });

    client.on('error', function (client, err) {
        console.error("client " + client.iddd + " error: " + err);
    });

    client.Connect();
}


setTimeout(process.exit, 5000);