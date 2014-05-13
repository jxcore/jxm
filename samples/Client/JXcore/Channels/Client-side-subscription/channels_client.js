/**
 * Created by Nubisa Inc. on 5/9/14.
 */

var server = require('./../../../../../index.js');

var message = "message from JXcore client";

var methods = {
    clientsMethod: function (client, param) {
        console.log("Received message from sendToGroup():", param);
    }
};

var client = server.createClient(methods, "channels", "NUBISA-STANDARD-KEY-CHANGE-THIS", "localhost", 8000);

client.on('connect', function (client) {
    console.log("Client connected");
    client.Subscribe("programmers", function (group) {
        console.log("Subscribed to the group:", group);
        client.SendToGroup(group, "clientsMethod", message);
    });
});

client.on('close', function (client) {
    console.log("Client disconnected");
});

client.on('error', function (client, err) {
    console.log("Error:", err);
});

client.Connect();