/**
 * Created by Nubisa Inc. on 5/9/14.
 */

var server = require('../../../../backend/jxm.js');

var client = server.createClient(null, "helloworld", "NUBISA-STANDARD-KEY-CHANGE-THIS", "localhost", 8000);

client.on('connect', function(client) {
    console.log("Client connected");
    client.Call("serverMethod", "Hello", function(param, err) {
        if (err) {
            console.log("Error while calling server's method. Code: ", err);
        } else {
            console.log("Received callback from the server:", param);
        }
        client.Close();
    });
});

client.on('close', function(client) {
    console.log("Client disconnected");
});

client.on('error', function(client, err) {
    console.log("Error:", err);
});

client.Connect();