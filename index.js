let express = require('express');
let http = require('http');
let socket = require('socket.io');

// app setup
let app = express();
let server = http.Server(app);

// client array vars setup
let clientList = [];
let chatLog = [];
let clientNames = {};
let clientColors = {};

// static files
app.use(express.static('client'));

// socket setup
let io = socket(server);
const port = process.env.PORT || 3000;

// make callback connections
io.on('connection', function(socket){
  console.log('made callback connection on socket id: ', socket.id);

  // recover entire chat history
  chatLog.forEach(function(msg){
    io.emit('chat message', msg)
  });

  // add new socket to client list
  clientList.push(socket);

  // generate initial random name using the socket id and generate random color & send over socket
  let clientColor = ((1<<24)*Math.random()|0).toString(16);
  io.emit('init',{
    socketID: socket.id,
    color: clientColor
  });

  // add above info into dictionaries and arrays to store on server end
  clientNames[socket.id] = socket.id;
  clientColors[socket.id] = clientColor;

  // for new session: update online list
  socket.on('noCookie', function(){
    console.log(" ");
    console.log("NEW session for new user: ", socket.id);
    console.log("clientColors BEFORE COOKIE:");
    console.log(clientColors);
    console.log("BEFORE COOKIE:");
    console.log(clientNames);
    clientColors[socket.id] = clientColor;
    clientNames[socket.id] = socket.id;

    io.emit("onlineList", clientColors);
    console.log("clientColors after cookie:");
    console.log(clientColors);
    console.log("clientNames after cookie:");
    console.log(clientNames);
  });

  // resume session if client cookie found & update online list
  socket.on('hasCookie', function(cookieData){
    console.log(" ");
    console.log("resuming session for returning user: ", cookieData.savedUsername);
    console.log("clientColors BEFORE COOKIE:");
    console.log(clientColors);
    console.log("clientNames BEFORE COOKIE:");
    console.log(clientNames);
    for (c in clientColors){
      if (c === cookieData.serverUser){
        delete clientColors[c];
        clientColors[cookieData.savedUsername] = cookieData.savedColor;
      }
    }
    for (n in clientNames){
      if (n === cookieData.serverUser){
        console.log("~~~~~~~~~~~~~~~~~");
        console.log("n is ", n);
        console.log("serverUser is", cookieData.serverUser);
        console.log("~~~~~~~~~~~~~~~~~");

        delete clientNames[n];
       // delete clientColors[n];
        clientNames[cookieData.serverUser] = cookieData.savedUsername;
       // clientColors[cookieData.savedUsername] = cookieData.savedColor;
      }
    }
    console.log("clientColors AFTER COOKIE:");
    console.log(clientColors);
    console.log("clientNames AFTER COOKIE:");
    console.log(clientNames);
    io.emit("onlineList", clientColors);
  });


  // delete user from the managed online lists on disconnect
  socket.on('disconnect', function() {
    console.log('user disconnected, socket id: ' + socket.id);
    console.log("clientColors before DELETE:");
    console.log(clientColors);
    console.log("clientNames before DELETE:");
    console.log(clientNames);
    let temp = clientNames[socket.id];
    delete clientColors[temp];
    delete clientNames[socket.id];
    console.log("clientColors after DELETE:");
    console.log(clientColors);
    console.log("clientNames after DELETE:");
    console.log(clientNames);
    io.emit("onlineList", clientColors);
  });

  // calculate timestamp & send new chat message
  socket.on('chat message', function(msg){
    let now = new Date();
    msg["timestamp"] = now.toString();
    chatLog.push(msg);
    io.emit('chat message', msg);
    console.log("clientColors in SENDING:");
    console.log(clientColors);
    console.log("clientNames in SENDING:");
    console.log(clientNames);
  });

  // process nickname or color change requests
  socket.on('update', function(socketData){
    console.log("Change name or color called from server"+ socketData)
    console.log(socketData);
    clientNames[socketData.socketID] = socketData.newName;
    console.log(clientNames);
    clientColors = socketData.clients;
    io.emit('updateAll', socketData);
    console.log("before updating online: ", clientColors);
    io.emit("onlineList", clientColors);
  });
});

server.listen(port, function(){
  console.log('listening on *:' + port);
});