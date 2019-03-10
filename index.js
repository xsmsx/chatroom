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
    socket.emit('chat message', msg)
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
  clientColors[socket.id] = '#'+clientColor;

  // for new session: update online list
  socket.on('noCookie', function(){
    console.log("no cookie!");
    clientColors[socket.id] = '#'+clientColor;
    clientNames[socket.id] = socket.id;
    console.log("client colors before updating: ", clientColors);
    io.emit("onlineList", clientColors);
  });

  // resume session if client cookie found & update online list
  socket.on('hasCookie', function(cookieData){
    console.log("Cookie found!");
    console.log("client colors BEFORE FOR LOOP: ", clientColors);

    for (c in clientColors){
      if (c === cookieData.serverUser){
        console.log("c: ", c);
        delete clientColors[c];
        clientColors[cookieData.savedUsername] = '#'+cookieData.savedColor;
        console.log("client colors HERE: ", clientColors);
      }
    }
    for (n in clientNames){
      if (n === cookieData.serverUser){
        delete clientNames[n];
        clientNames[cookieData.serverUser] = cookieData.savedUsername;
        clientColors[cookieData.savedUsername] = '#'+cookieData.savedColor;
        console.log("client names HERE: ", clientNames);
      }
    }
    console.log("client colors before updating: ", clientColors);
    io.emit("onlineList", clientColors);
  });

  // delete user from the managed online lists on disconnect
  socket.on('disconnect', function() {
    console.log("A user disconnected!", clientColors);
    console.log("online users names before disconnect: ", clientNames);
    console.log("online users colors before disconnect: ", clientColors);

    let temp = clientNames[socket.id];
    delete clientColors[temp];
    delete clientNames[socket.id];
    console.log("online users names after disconnect: ", clientNames);
    console.log("online users colors after disconnect: ", clientColors);
    io.emit("onlineList", clientColors);
  });

  // calculate timestamp & send new chat message
  socket.on('chat message', function(msg){
    let now = new Date();
    msg["timestamp"] = now.toString();
    chatLog.push(msg);
    io.emit('chat message', msg);
  });

  // process nickname or color change requests
  socket.on('update', function(socketData){
    console.log("Change name or color called from"+ socketData.socketID);
    console.log(socketData);
    console.log("client names before updating : ", clientNames);
    console.log("client colors before updating: ", clientColors);

    clientNames[socketData.socketID] = socketData.newName;
    console.log("client names before updating online: ", clientNames);
    clientColors = socketData.clients;
    io.emit('updateAll', socketData);
    console.log("client colors before updating online: ", clientColors);
    io.emit("onlineList", clientColors);
  });
});

server.listen(port, function(){
  console.log('listening on *:' + port);
});
