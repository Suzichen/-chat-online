var socketio = require('socket.io');
var io;
var guestNumber = 1;
var nickName = {};
var namesUsed = [];
var currentRoom = {};

exports.listen = function(server) {
    io = socketio.listen(server);
    io.serveClient('log leval', 1);
    // 定义每个用户连接的处理逻辑
    io.sockets.on('connection', function(socket) {
        guestNumber = assignGuestName(socket, guestNumber, nickName, namesUsed);    // 获取访客名
        joinRoom(socket, 'Lobby');      // 加入'Lobby'聊天室
        handleMessageBroadcasting(socket, nickName);    
        handleNameChangeAttempts(socket, nickName, namesUsed);
        handleRoomJoining(socket);

        socket.on('rooms', function() {
            // socket.emit('rooms', io.sockets.manager.rooms);  //bug
            socket.emit('rooms', io.sockets.adapter.rooms)
        });
        handleClientDisconnection(socket, nickName, namesUsed);     // 用户断开连接后的清除
    })
}
// 分配昵称
function assignGuestName(socket, guestNumber, nickName, namesUsed) {
    var name = '访客' + guestNumber;
    nickName[socket.id] = name;
    socket.emit('nameResult', {
        success: true,
        name: name
    });
    namesUsed.push(name);
    return guestNumber + 1;
}
// 进入聊天室
function joinRoom(socket, room) {
    socket.join(room);  // 让用户进入房间
    currentRoom[socket.id] = room;
    socket.emit('joinResult', {room:room});     // 用户加入房间后的信息反馈
    // 房间其它用户的信息反馈
    socket.broadcast.to(room).emit('message', {
        text: nickName[socket.id] + '加入了房间' + room + '。'
    });
    // var usersInRoom = io.sockets.clients(room);  //bug
    var usersInRoom = io.sockets.sockets;
    // var usersInRoom = io.sockets.adapter.rooms[room];
    // 获取此房间用户们的昵称并展示
    if (usersInRoom.length > 1) {
        var usersInRoomSumary = '当前房间的用户：';
        for (var index in usersInRoom) {
            var userSocketId = usersInRoom[index].id;
            if (userSocketId != socket.id) {
                if (index > 0) {
                    usersInRoomSumary += '，';
                }
                usersInRoomSumary += nickName[userSocketId];
            }
        }
        usersInRoomSumary += '。';
        socket.emit('message', {text: usersInRoomSumary});
    }
}
// 更名请求处理
function handleNameChangeAttempts(socket, nickName, namesUsed) {
    socket.on('nameAttempt', function(name) {
        if (name.indexOf('访客') === 0) {
            socket.emit('nameResult', {
                success: false,
                message: '昵称不能以 访客 开头'
            })
        } else {
            if (namesUsed.indexOf(name) === -1) {
                var previousName = nickName[socket.id];
                var previousNameIndex = namesUsed.indexOf(previousName);
                namesUsed.push(name);
                nickName[socket.id] = name;
                delete namesUsed[previousNameIndex];    // 删掉之前用的昵称，让其他用户可以使用

                socket.emit('nameResult', {
                    success: true,
                    name: name
                });
                socket.broadcast.to(currentRoom[socket.id])
                    .emit('message', {
                        text: previousName + 'is now know as' + name + '.'
                    });
            } else {
                socket.emit('nameResult', {
                    success: false,
                    message: '此昵称已被注册'
                });
            }
        }
    })
}
// 发送聊天消息
function handleMessageBroadcasting(socket) {
    socket.on('message', function(message) {
        socket.broadcast.to(message.room)
            .emit('message', {
                text: nickName[socket.id] + '：' + message.text
            })        
    })
}
// 创建房间
function handleRoomJoining(socket) {
    socket.on('join', function(room) {
        socket.leave(currentRoom[socket.id]);
        joinRoom(socket, room.newRoom);        
    })
}
// 断开连接
function handleClientDisconnection(socket) {
    socket.on('disconnect', function () {
        var nameIndex = namesUsed.indexOf(nickName[socket.id]);
        delete namesUsed[nameIndex];
        delete nickName[socket.id];
    });
}