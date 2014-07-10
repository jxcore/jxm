/**
 * mediaserver module for JXcore and Node.JS
 *
 * MIT license, Oguz Bastemur 2014
 */

var fs = require('fs'),
    exts = require('./libs/exts'),
    pathModule = require('path');

var fileInfo, shared;
var pipe_extensions = {};
var pipe_extension_id = 0;

// in case the host process is JXcore, lets benefit from the
// shared memory store. This way, the app doesn't need to read file stat
// per each thread OR use v8 heap memory for storing the information
if(global.jxcore){
    shared = jxcore.store.shared;
    fileInfo = function(path){
        if(path){
            if(shared.exists(path)){
                return parseInt(shared.read(path));
            }
            else{
                if(!fs.existsSync(path)){
                    return null;
                }
                var stat = fs.statSync(path);
                shared.set(path, stat.size);
                return stat.size;
            }
        }
        return 0;
    };
}
// otherwise, use a local key value store
else
{
    shared = {};
    fileInfo = function(path){
        if(path){
            if(shared[path]){
                return shared[path];
            }
            else{
                if(!fs.existsSync(path)){
                    return null;
                }
                var stat = fs.statSync(path);
                shared[path] = stat.size;
                return stat.size;
            }
        }
        return 0;
    };
}


exports.mediaTypes = exts;


var getRange = function(req, total){
    var range = [0, total, 0];
    var rinfo = req.headers.range;

    if(rinfo){
        var rloc = rinfo.indexOf('bytes=');
        if(rloc>=0){
            var ranges = rinfo.substr(rloc+6).split('-');
            try{
                range[0] = parseInt(ranges[0]);
                if(ranges[1]){
                    if(ranges[1].length){
                        range[1] = parseInt(ranges[1]);
                    }
                }
            }catch(e){}
        }

        range[2] = range[1] - range[0];//chunk size

        if(total-1<range[2]){
            range[2] = total-1;
        }
    }

    return range;
};


var isString = function(str){
    if(!str) return false;
    return (typeof str == 'string' || str instanceof String);
};


exports.pipe = function(req, res, path, type){

    if (!isString(path)){
        throw "path must be a string value";
    }

    var total = fileInfo(path);

    if(total == null){
        res.end(path + " not found");
        return false;
    }

    var range = getRange(req, total);

    var ext = pathModule.extname(path);
    if(!type){
        if(ext && ext.length){
            type = exts[ext];
        }
    }

    if(!type){
        res.write("Media format couldn't found for " + pathmodule.basename(path));
    }
    else {
        var file = fs.createReadStream(path, {start: range[0], end: range[1]});
        if(!ext.length || !pipe_extensions[ext]){
            if (range[2]) {
                res.writeHead(206,
                    {
                        'Accept-Ranges': 'bytes',
                        'Content-Range': 'bytes ' + range[0] + '-' + range[1] + '/' + total,
                        'Content-Length': range[2],
                        'Content-Type': type,
                        'Access-Control-Allow-Origin': req.headers.origin || "*",
                        'Access-Control-Allow-Methods': 'POST, GET, OPTIONS',
                        'Access-Control-Allow-Headers': 'POST, GET, OPTIONS'
                    });
            }
            else{
                res.writeHead(200,
                    {
                        'Content-Length': range[1],
                        'Content-Type': type,
                        'Access-Control-Allow-Origin': req.headers.origin || "*",
                        'Access-Control-Allow-Methods': 'POST, GET, OPTIONS',
                        'Access-Control-Allow-Headers': 'POST, GET, OPTIONS'
                    });
            }

            file.pipe(res);
            file.on('close', function(){
                res.end(0);
            });
        }else{
            var exts = pipe_extensions[ext];
            res.writeHead(200,
            {
                'Content-Type': type,
                'Access-Control-Allow-Origin': req.headers.origin || "*",
                'Access-Control-Allow-Methods': 'POST, GET, OPTIONS',
                'Access-Control-Allow-Headers': 'POST, GET, OPTIONS'
            });
            for(var o in exts){
                exts[o](file, req, res, function(){
                    if(!res.__ended){
                        res.__ended = true;
                        res.end(0);
                    }
                });
            }
        }

        return true;
    }

    return false;
};

exports.on = function(ext, m){
    if(!pipe_extensions[ext]){
        pipe_extensions[ext] = [];
    }

    m.pipe_extension_id = pipe_extension_id++;
    m.pipe_extension = ext;

    pipe_extensions[ext].push(m);
};

exports.removeEvent = function(method){
    if(!method.pipe_extension || !method.pipe_extension_id){
        return;
    }
    if(pipe_extensions[method.pipe_extension]){
        var exts = pipe_extensions[method.pipe_extension];
        for(var i = 0, ln = exts.length;i<ln;i++){
            if(exts[i].pipe_extension_id == method.pipe_extension_id){
                pipe_extensions[method.pipe_extension] = exts.splice(i, 1);
            }
        }
    }
};