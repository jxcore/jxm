/**
 * license (MIT) Copyright Nubisa Inc. 2014
 */

var settings = require('./jx_node_settings');
var helpers = require('./jx_helpers');
var msgman = require('./jx_message_manager');
var amqp = require('amqp');

exports.OnConnected = null;

var connection = null,
    isConnected = false;

var exchange = null, clients = null, system = null;
var errCount = 0;
var uid = helpers.ProcessId;

if (process.subThread) {
    uid += parseInt(process.threadId);
}

exports.start = function () {
    connection = (global.jxcore && settings.rabbitmqOptions && settings.rabbitmqOptions.host) ? amqp.createConnection(settings.rabbitmqOptions) : null;
    if (connection) {
        connection.on('error', function (err) {
            if (errCount == 0) {
                errCount++;
                helpers.logError("Cannot connect to RabbitMQ. Server will not start.", err);
            }
        });

        connection.on('ready', function () {
            errCount = 0;

            exchange = connection.exchange('nubisa-message');

            connection.queue('nu-message.' + uid, function (q) {

                q.bind("nubisa-message", "#");

                q.subscribe({ack: true}, function (message, headers, info) {

                    var obj = null;
                    try {
                        var data = message.data.toString();
                        obj = JSON.parse(data);
                    } catch (e) {
                        helpers.logError(e, ms);
                        q.shift();
                        return;
                    }

                    var doc = {
                        _id: jxcore.utils.bufferID(info.deliveryTag),
                        Messages: obj.Messages,
                        pid: obj.pid
                    };

                    msgman.dbWorker(doc);
                    q.shift();
                });
            });

            clients = connection.exchange('nubisa-client');

            connection.queue('nu-client.' + uid, function (cq) {

                cq.bind("nubisa-client", "#");

                cq.subscribe({ack: true}, function (message, headers, info) {

                    var obj = null;
                    try {
                        var data = message.data.toString();
                        obj = JSON.parse(data);
                    } catch (e) {
                        helpers.logError(e, ms);
                        cq.shift();
                        return;
                    }

                    var doc = {
                        Messages: obj.Messages,
                        pid: obj.pid
                    };

                    msgman.clientWorker(doc);
                    cq.shift();
                });
            });

            system = connection.exchange('nubisa-system');

            connection.queue('nu-system.' + uid, function (cq) {

                cq.bind("nubisa-system", "#");

                cq.subscribe({ack: true}, function (message, headers, info) {

                    var obj = null;
                    try {
                        var data = message.data.toString();
                        obj = JSON.parse(data);
                    } catch (e) {
                        helpers.logError(e, ms);
                        cq.shift();
                        return;
                    }

                    msgman.sysWorker(obj);
                    cq.shift();
                });
            });

            if (!isConnected) {
                isConnected = true;
                helpers.log("Connected to RabbitMQ service.");
                messagePusher();
                clientMessagePusher();
                if (exports.OnConnected) {
                    exports.OnConnected();
                }
            }
        });
    } else {
        messageTargets["dbWorker"] = msgman.dbWorker;
        messageTargets["clientWorker"] = msgman.clientWorker;
        messageTargets["sysWorker"] = msgman.sysWorker;
        // helpers.log("RabbitMQ is disabled in settings file, so Server will use instant messaging instead of it.");
        messagePusher();
        clientMessagePusher();
        if (exports.OnConnected) {
            exports.OnConnected();
        }
    }
};

var messages = {__count: 0}, clientMessages = {__count: 0}, systemMessages = {__count: 0};

var messagePusher = function () {
    if (messages.__count > 0) {
        var cc = messages.__count;
        delete(messages.__count);

        var rec = {
            Messages: messages,
            pid: uid,
            ___cc:cc
        };
        if (addMessage(rec, exchange, "dbWorker")) {
            messages = {__count: 0};
        }
    }
};

var clientMessagePusher = function () {
    if (clientMessages.__count > 0) {
        delete(clientMessages.__count);

        var rec = {
            Messages: clientMessages,
            pid: uid
        };
        if (addMessage(rec, clients, "clientWorker")) {
            clientMessages = {__count: 0};
        }
    }
};

var systemMessagePusher = function () {
    if (systemMessages.__count > 0) {
        delete(systemMessages.__count);

        var rec = {
            Messages: systemMessages,
            pid: uid
        };
        if (addMessage(rec, system, "sysWorker")) {
            systemMessages = {__count: 0};
        }
    }
};

var msgId = 0;

var addMessage = function (rec, target, callTo) {
    if (target) {//rabbitMQ
        target.publish("", JSON.stringify(rec));
        return true;
    }
    else {//direct push or thread messaging
        // if the current process is not forked, we just send the message back to client
        //callTo(rec);
        rec._id = -1;
        if (process.subThread) {
            process.sendToThreads({hit: callTo, data: rec, origin_jxm: 1});
        }
        else {
            process.sendToMain({hit: callTo, data: rec, origin_jxm: 1});
        }
        return true;
    }
};

var messageTargets = {};
if (global.jxcore) {
    jxcore.tasks.on("message", function (tid, msg) {
        if(msg && msg.origin_jxm){
            if(msg.data && msg.data._id == -1){
                msg.data._id = jxcore.utils.uniqueId();
            }
            messageTargets[msg.hit](msg.data);
        }
    });
} else {
    process.sendToMain = function (msg) {
        if(msg.data && msg.data._id == -1){
            msg.data._id = msgId++;
            msg.data._id %= 999999;// looks silly but this is for development only (node.js backward support)
        }
        messageTargets[msg.hit](msg.data);
    };
}


exports.addClientMessage = function (clid, index, message) {
    if (!clientMessages[clid]) {
        clientMessages[clid] = {starts: index};
    }

    if(clientMessages[clid].starts <= index)
        clientMessages[clid].ends = index;
    else
        clientMessages[clid].starts = index;

    clientMessages[clid][index] = (message);
    clientMessages.__count++;

    if (clientMessages.__count == 1) {
        setTimeout(clientMessagePusher, settings.collectorLatency);
    }
};

exports.addMessage = function (app, group, message) {
    if (!messages[app]) {
        messages[app] = {};
        messages[app][group] = [];
    }
    else if (!messages[app][group]) {
        messages[app][group] = [];
    }

    messages[app][group].push(message);
    messages.__count++;

    if (messages.__count == 1) {
        setTimeout(messagePusher, settings.collectorLatency);
    }
};

exports.addSystemMessage = function (message) {
    if (!systemMessages["sys"]) {
        systemMessages["sys"] = [];
    }

    systemMessages["sys"].push(message);

    systemMessages.__count++;

    if (systemMessages.__count == 1) {
        setTimeout(systemMessagePusher, settings.collectorLatency);
    }
};
