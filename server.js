var http = require('http');
var fs = require('fs');
var path = require('path');
var mime = require('mime');
var cache = {}; // 缓存文件内容

var chatServer = require('./lib/chat_server');

// 发送404
function send404(response) {
    response.writeHead(404, {'Content-Type': 'text/plain'});
    response.write('Error 404: 资源未找到');
    response.end();
}

// 发送文件数据
function sendFile(response, filePath, fileContents) {
    response.writeHead(
        200,
        {'Content-Type': mime.getType(path.basename(filePath))}
    );
    response.end(fileContents);
}

// 处理方法
function serverStatic(response, cache, absPath) {
    if (cache[absPath]) {
        sendFile(response, absPath, cache[absPath]);
    } else {
        fs.exists(absPath, function(exists) {
            if (exists) {
                fs.readFile(absPath, function(err, data) {
                    if (err) {
                        send404(response)
                    } else {
                        cache[absPath] = data;
                        sendFile(response, absPath, data);
                    }                    
                });
            } else {
                send404(response);
            }
        })
    }
}

// http服务器
var server = http.createServer(function(request, response) {
    var filePath = false;

    if (request.url === '/') {
        filePath = 'public/index.html';
    } else {
        filePath = 'public' + request.url;
    }
    var absPath = './' + filePath;
    serverStatic(response, cache, absPath);
})

server.listen(8000, function() {
    console.log("Server start")    
})

chatServer.listen(server);  // 可以共享同一个TCP/IP接口