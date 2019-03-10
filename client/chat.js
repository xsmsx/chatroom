// Make server connection
let socket = io();

// DOM Query
let username = document.getElementById('username'),
    newMessage = document.getElementById('m'),
    chatLog = document.getElementById('messages'),
    onlineList = document.getElementById('onlineList');
let thisUser = '',
    thisColor = '',
    socketID = '';
let clients = {};

// Session initialization
socket.on('init', function(serverData) {
    let savedUsername = (document.cookie.match(/^(?:.*;)?\s*myName\s*=\s*([^;]+)(?:.*)?$/)||[,null])[1];
    let savedColor = (document.cookie.match(/^(?:.*;)?\s*myColor\s*=\s*([^;]+)(?:.*)?$/)||[,null])[1];
    // if has cookie
    if(savedUsername){
        username.innerHTML ='<p> Welcome back! You are user  <strong>'+ savedUsername +'</strong></p>';
        let elem = document.getElementById('messages');
        elem.scrollTop = elem.scrollHeight;
        thisUser = savedUsername;
        thisColor = '#'+ savedColor;
        socketID = serverData.socketID;
        socket.emit('hasCookie',{
            savedUsername: savedUsername,
            savedColor: savedColor,
            serverUser: serverData.socketID,
            serverColor: serverData.color
        });
        return;
    }
    else{
        socket.emit('noCookie',{});
        username.innerHTML ='<p> Welcome! You are user  <strong>'+ serverData.socketID +'</strong></p>';
        let elem = document.getElementById('messages');
        elem.scrollTop = elem.scrollHeight;
        thisUser = serverData.socketID;
        thisColor = '#'+ serverData.color;
        document.cookie = "myName=" + serverData.socketID;
        document.cookie = "myColor=" + serverData.color;
        socketID = serverData.socketID;
        console.log(document.cookie);
    }
});

// Emit Event
newMessage.addEventListener("keyup", function(event){
    if (event.key !== "Enter" ) {
        return;
    }
    // Check if user wants to change name or color
    let test = newMessage.value.split(" ");
    if (test[0] === "/nick:" || test[0] === "/nickcolor:") {
        let namePattern = new RegExp("\<(.*?)\>");
        let colorPattern = new RegExp("([a-f0-9]{6})", "gi");
        if (test[1].match(namePattern)) {
            let temp = namePattern.exec(test[1]);
            let newName = temp[1].toString();
            // check duplicates
            console.log("checking");
            console.log("clients: ", clients);
            for (c in clients){
                if (c === newName){
                    console.log("aha");
                    changeNameError();
                    return;
                }
            }
            console.log("new name", newName);
            changeName(newName);
            $('#m').val('');
            return;
        }
        if (test[1].match(colorPattern)){
            let temp = colorPattern.exec(test[1]);
            let newColor = temp[1].toString();
            changeColor(newColor);
            $('#m').val('');
            return;
        }
    }
    socket.emit('chat message',{
        chatLog: chatLog.value,
        newMessage: newMessage.value,
        user: thisUser,
        color: thisColor
    });
    // clear input box after sending
    $('#m').val('');
});

// display new message on receiving
socket.on('chat message', function(msg){
    // format timestamp
    let patt = new RegExp("[0-9]{2}:[0-9]{2}:[0-9]{2}", "g");
    let timestamp = patt.exec(msg.timestamp.toString());

    // bold own message
    if(msg.user === thisUser){
        chatLog.innerHTML += '<strong> <p>'+timestamp+" "+'<span style=\"color:' + msg.color + '\">' + msg.user + '</span>' +" "+ msg.newMessage + '</p></strong>';
    }
    else{
        chatLog.innerHTML += '<p>'+timestamp+" "+'<span style=\"color:' + msg.color + '\">' + msg.user + '</span>' +" "+ msg.newMessage + '</p>';
    }
    let elem = document.getElementById('messages');
    elem.scrollTop = elem.scrollHeight;
});

// update onine user list
socket.on('onlineList', function(onlineUsers) {
    console.log("onlineUsers in client", onlineUsers);
    clients = onlineUsers;
    let temp = '';
    for(u in onlineUsers){
        temp += '<li>'+'<span style=\"color:' + onlineUsers[u] + '\">' + u +'</li>';
    }
    onlineList.innerHTML = temp;
});

// update name or color as well as the online user list
socket.on('updateAll', function(socketData){
    console.log(clients);
    for (c in clients){
        if (socketData.flag === 0) {
            if (c === socketData.socketID || c === socketData.oldName) {
                let tempColor = clients[c];
                clients[socketData.newName] = tempColor;
                delete clients[c];
            }
        }
        else if (socketData.flag === 1){
            if (c === socketData.name) {
                clients[socketData.name] = socketData.newColor;
            }
        }
    }
    console.log(clients);
});

function changeName() {
    let newName = String(arguments[0]);
    delete clients[thisUser];
    clients[newName] = thisColor;
    socket.emit('update',{
        flag: 0,
        socketID: socketID,
        newName: newName,
        oldName: thisUser,
        clients: clients
    });
    thisUser = newName;
    document.cookie = "myName=" + newName; //update cookie with new username
    username.innerHTML ='<p> Welcome! You are user  <strong>'+ newName+'</strong></p>';
}

function changeColor(){
    let newColor = String(arguments[0]);
    thisColor = "#"+ newColor;
    clients[thisUser] = thisColor;
    socket.emit('update',{
        flag : 1,
        name: thisUser,
        newColor: newColor,
        socketID: socketID,
        clients: clients
    });
    document.cookie = "myColor=" + newColor; //update cookie with new username
}

function changeNameError(){
    socket.emit('chat message',{
        user: thisUser,
        color: thisColor,
        chatLog: chatLog.value,
        newMessage: 'Error! Username not unique. Please choose a new one.',
    });
}
