var joss = require("JOSS");
var app = require("express").createServer();
var io = require("socket.io");

io = io.listen(app);
app.listen(1337);

io.sockets.on('connection', function(socket){
   joss.addUser("WS", socket);
   
   socket.on('message', function(msg){
      joss.onMessage(msg);
   });
   
   socket.on('disconnect', function(){
      joss.removeUser("WS", socket);
   });
});

console.log("websocket server listening on port 1337");

//

joss.createSession("MySession", "password", ["myVar1", "myVar2"]);

var _onOpen = function(){
   console.log("onOpen function called!");
};

joss.setSessionOnEvent("MySession", "open", _onOpen);
joss.setPersistent("MySession", "false");