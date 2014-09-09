/**
 * license (MIT) Copyright Nubisa Inc. 2014
 */

var assert = require("assert");
var path = require("path");
var fs = require("fs");

var filename_displayed = false;
var argv = process.argv.join(" ").replace(process.cwd(), ".");

var testTimeout = 15000;

if(!global.jxcore){
    console.error("jxm.io test files require JXcore is installed.");
    process.exit(-1);
}

var log = function (arg, color) {
    if (!filename_displayed) {
        filename_displayed = true;

        log("=== " + argv + (process.threadId > -1 ? ", threadId: " + process.threadId : "" ) + ":", "cyan");
        if (argv.indexOf("jx-package.js") > -1) {
            jxcore.utils.console.log("This test is executed as JX package.", "yellow");
        }
    }

    if (typeof arg === "undefined") {
        return;
    }

    if (typeof jxcore === "undefined") {
        console.log(arg);
    } else {
        jxcore.utils.console.log(arg, color);
    }
};


// just for now, later we'll do this to file, or something
exports.console = {
    log: function (arg) {
        log(arg, "white");
    },
    logOrg: console.log,
    error: function (arg) {
        log("\t" + arg, "red");
    }
};


var uncaughtExceptionlistener = function(err) {
    exports.console.error("uncaughtException: " + err);
    process.exit();
};


process.on("uncaughtException", uncaughtExceptionlistener);

/*
    Removes listener from "uncaughtException".
    It's useful for process recovery tets units, when uncaughtException should not be attached
 */
exports.dontCatchUncaught = function() {
    process.removeListener('uncaughtException', uncaughtExceptionlistener);
};


var _assert = {};

/**
 * Throws when actual string DOES NOT contain the substring
 * @param actual
 * @param substring
 * @param message
 */
_assert.contains = function (actual, substring, message) {
    var yes = actual.toString().indexOf(substring) > -1;
    _assert.strictEqual(yes, true, message);
};

/**
 * Throws when actual string CONTAINS the substring
 * @param actual
 * @param substring
 * @param message
 */
_assert.doesNotContain = function (actual, substring, message) {
    var yes = actual.toString().indexOf(substring) > -1;
    _assert.strictEqual(yes, false, message);
};


/**
 * Throws when actual value IS undefined
 * @param actual
 * @param message
 */
_assert.ifUndefined = function (actual, message) {
    // MUST NOT be undefined, otherwise throws
    _assert.notStrictEqual(actual, undefined, message || "Value can not be undefined");
};


/**
 * Throws when actual string IS NOT undefined
 * @param actual
 * @param message
 */
_assert.ifNotUndefined = function (actual, message) {
    // has to be undefined, otherwise throws
    _assert.strictEqual(actual, undefined, message + ". Value should be undefined but is: " + actual);
};

/**
 * Throws when array is not null (contains error messages)
 * @param array
 */
_assert.ifErrors = function (array) {
    _assert.strictEqual(array.length, 0, array.join("\n"));
};

_assert.equal = function (actual, expected, message) {
    if (actual != expected) {
        exports.throw(message);
    }
};

_assert.notEqual = function (actual, expected, message) {
    if (actual == expected) {
        exports.throw(message);
    }
};


_assert.strictEqual = function (actual, expected, message) {
    if (actual !== expected) {
        exports.throw(message);
    }
};

_assert.notStrictEqual = function (actual, expected, message) {
    if (actual === expected) {
        exports.throw(message);
    }
};

_assert.ok = function (actual, message) {
    if (!actual) {
        exports.throw(message);
    }
};

exports.assert = _assert;


/**
 * Forcing exit code, because at some point there was bug, that assert/throw ended the process with exit code = 0
 * and test was passing instead of failing.
 * There is even special test case for it: test-others-throw-exitcode.js
 * @param msg
 */
exports.throw = function (message) {
    exports.console.error(jxcore.utils.console.setColor(message, "red"));
    //process.exit(8);
};


exports.rmdirSync = function (fullDir) {

    fullDir = path.normalize(fullDir);
    if (!fs.existsSync(fullDir)) {
        return;
    }

    var cmd = process.platform === 'win32' ? "rmdir /s /q " : "rm -rf ";
    jxcore.utils.cmdSync(cmd + fullDir);
};



setTimeout(function() {
    exports.console.error("The process did not exit by itself. Timeout occured.");
    process.exit();
}, testTimeout).unref();  //90 secs of timeout

exports.unicodeStrings = [ "норм чё",
    " المتطرّف الأمريكية بحق. بل ضمنها المقاومة الاندونيسية",
    "諙 軿鉯頏 禒箈箑 聬蕡, 驧鬤鸕 袀豇貣 崣惝 煃, 螷蟞覮 鵳齖齘 肒芅邥 澂 嬼懫 鯦鯢鯡",
    "Εξπετενδα θχεωπηραστυς ατ μελ",
    "text with slashes \ / \\ //"];


exports.getAppName = function() {
    var argv = process.argv.join(" ");

    var ret = "";
    if (argv.indexOf("appName=emptyString") !== -1) ret = ""; else
        ret = "test";

    return ret;
};