var map = require("./CMap");

var userID = 1;

CUser = function(){
    this.joinedSessions = [];
    this.modulePasswords = new map();
    this.sessionPasswords = new map();
    
    this.typeComm = null; //http/tcp/websocket
    this.stream   = null; //sendstream, depends on type^^
    
    this.id = userID; //unique server-side id
    userID++;
    
    this.tag = "User " + this.id; //username
};

CUser.prototype.storeSessionAccess = function(sessionID, password){
    this.sessionPasswords.put(sessionID, password);    
};

CUser.prototype.hasSessionAccess = function(sessionID){
    return this.sessionPasswords.get(sessionID) == undefined ? "false" : "true";    
};

CUser.prototype.storeModuleAccess = function(moduleID, password){
    this.modulePasswords.put(moduleID, password);    
};

CUser.prototype.hasModuleAccess = function(moduleID){
    this.modulePasswords.get(moduleID) == undefined ? "false" : "true";    
};

CUser.prototype.setTag = function(name){
    if(name === "") return; //don't allow empty username
    this.tag = name;
};

CUser.prototype.sendMsg = function(msg){
    switch(this.typeComm){
        case "WS":
            {
                if(this.stream == null){
                    console.log("attempt to send msg to user: " + this.id + ", a.k.a. : " + this.tag + " failed");
                    console.log("stream undefined!");
                    return;
                }
                
                try{
                    this.stream.send(JSON.stringify(msg));
                }catch(exx){
                    console.log("exception caught trying to send data to user: " + this.id + ", a.k.a. : " +  this.tag);
                    console.log(exx);
                }
            }
            break;
        
        default:
            break;
    };
};
module.exports = CUser;
