/**
 * Created by Nubisa Inc. on 5/9/14.
 */

var server = require('../../../../../backend/jxm.js');

var methods = {
    clientsMethod: function (client, param) {
        console.log("Received message from sendToGroup():", param);
    }
};

var client = server.createClient(methods, "channels", "NUBISA-STANDARD-KEY-CHANGE-THIS", "localhost", 8000);

client.on('connect', function (client) {
    console.log("Client connected");
    client.Subscribe("programmers", function (group, err) {
        if (err) {
            console.log("Error while subscribing to the group: ", group, ". Error code:", err);
        } else {
            console.log("Subscribed to the group:", group);
            client.SendToGroup(group, "clientsMethod", "Hello from JXcore client!");
        }
    });
});

client.on('close', function (client) {
    console.log("Client disconnected");
});

client.on('error', function (client, err) {
    console.log("Error:", err);
});

client.Connect();