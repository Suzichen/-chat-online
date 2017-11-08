// 处理可疑文本
function divEscapedContentElement(message) {
    return $('<div></div>').text(message);
}
// 显示系统创建的受信任内容
function divSystemContentElement(message) {
    return $('<div></div>').html('<i>' + message + '</i>');
}
// 处理原始的用户输入
function processUserInput(chatApp, socket) {
    var message = $('#send-message').val();
    var systemMessage;

    // 如果内容以斜杠开头，作为聊天命令
    if (message.charAt(0) == '/') {
        systemMessage = chatApp.processCommand(message);
        if (systemMessage) {
            $('.messages').append(divSystemContentElement(systemMessage));
        }
    // 否则作为普通信息展现给其他用户
    } else {
        chatApp.sendMessage($('.room').text, message);
        $('.messages').append(divEscapedContentElement(message));
        $('.messages').scrollTop($('.messages').prop('scrollHeight'));
    }

    $('#send-massage').val('');
}

var socket = io.connect();

function appStart() {
    var chatApp = new Chat(socket);

    socket.on('nameResult', function(result) {
        var message;
        if (result.success) {
            message = '成功更换昵称为 ' + result.name;
        } else {
            message = result.message;
        }
        $('.messages').append(divEscapedContentElement(message));
    });

    socket.on('joinResult', function(result) {
        $('.room').text(result.room);
        $('.messages').append(divEscapedContentElement('房间更换成功'));
    });

    socket.on('message', function(message) {
        var newElement = $('<div></div>').text(message.text);
        $('.messages').append(newElement);
    });

    socket.on('rooms', function(rooms) {
        $('.room-list').empty();
        for (var room in rooms) {
            room = room.substring(1, room.length);
            if (room != '') {
                $('.room-list').append(divEscapedContentElement(room));
            }
        }
        $('.room-list div').click(function() {
            chatApp.processCommand('/join ' + $(this).text());
            $('#send-massage').focus();
        });
    });

    setInterval(function() {
        socket.emit('rooms');
    }, 1000);

    $('#send-message').focus();

    $('#send-form').submit(function(e) {
        e.preventDefault();
        processUserInput(chatApp, socket);
        $('#send-message').val('');
        return false;
    })
}

document.addEventListener('DOMContentLoaded', function() {
    appStart();
})