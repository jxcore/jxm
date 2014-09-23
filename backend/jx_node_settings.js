/**
 * license (MIT) Copyright Nubisa Inc. 2014
 */

// PRIVATE :

exports.maxLongPollingSize = 1000; //max messages per listener
exports.oldMessageQueueSize = 500; //cached messages bulk size
exports.base64 = false; // TODO implement base64 encoding


// message position encryption keys

exports.secureID = function (pass) {
    /*_jx_protected_*/  // protected against debugger or function.toString() when you run it on JXcore
    // do not remove the comment

    if (pass != "hju7846eefh") // some pass here to keep custom logic
    // reading it, also update it on jx_helpers.js (exports.decKeys, exports.encKeys)
    {
        return ["01234567890123456789012345678912", "0123456789123456"]; // fake return;
    }

    return [
        "zxcvbnm1234567890asdfghjklqwerty", // must be 32 chars
        "lkjhqwer5678vbnm" // must be 16 chars
    ];
};


// PUBLIC :

//location for the ssl certificate files
exports.httpsKeyLocation = null;
exports.httpsCertLocation = null;

// if port is set to null, protocol will not be used
exports.httpServerPort = 8000;
exports.httpsServerPort = 0; //8443;

exports.collectorLatency = 50;

exports.encoding = "UTF-8";

exports.listenerTimeout = 60000; //long polling request time (ms) NOTE: max 120 seconds! 120 000
exports.IPAddress = "0.0.0.0";

exports.chunked = false;
exports.mapiVersion = "0.3.4";

//enable disable console logging
exports.console = true;
exports.consoleInfo = false;
exports.consoleThreadNumber = true;

exports.enableClientSideSubscription = false;

//exports.rabbitmqOptions = { host :"localhost" };

exports.clientErrorCodes = {

    clientNotInTheGroup: { id: 1, msg: "Client does not belong to this group." },
    clientNotInAnyGroup: { id: 2, msg: "Client does not belong to any group." },
    clientSubscriptionDisabled: { id: 3, msg: "Client-side subscription/unsubscription is disabled on server." },
    clientAlreadySubscribed: {id: 4, msg: "Client is already subscribed." },

    groupsCouldNotParse: { id: 5, msg: "Could not parse group information." },
    groupEmptyName: { id : 6, msg : "Group name must be a non empty string" },

    methodEmptyName: { id: 7, msg: "Name of the method was not provided." },
    methodError: {  id: 8, msg: "Server's custom method error." },
    methodUnknown: { id: 9, msg: "Method is not defined on the server side" }
};