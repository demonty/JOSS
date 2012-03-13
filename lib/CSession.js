var mod = require("./CModule");
var usr = require("./CUser");
var map = require("./CMap");

var sessionID = 0;

CSession = function(tag, password, properties){
    this.id = sessionID;
     sessionID++;
     this.tag = tag;
     this.persistent = "true";
     
     this.Events = {};
     this.Events.onOpen  = null;
     this.Events.onClose = null;
     this.Events.onMsg   = null;
     this.Events.onError = null;
     
     
     //list of current modules for this session ((key)name, (val)CModule)
    this.modules = new map();
    //list of users in this session
    this.users = [];
    
    //set the properties for this session type to undefined
    this.properties = new map();
    if(properties){
        for(var i = 0; i < properties.size; i++){
            var prop = {};
            prop.key = properties[i];
            prop.value = undefined;
            this.properties.put(prop.key, prop);
        }
    }
    
    if(password === ""){ //public
        this.access = "public";
        this.password = "";
    }else{ //private...  
        this.access = "private";
        this.password = password;
    }
};

CSession.prototype.createModule = function(name, password){
    var newMod = new mod(name, password);
    this.modules.put(name, newMod);
};

CSession.prototype.removeModule = function(name, password){
    if(name === "AdminModule"){
        console.log("someone attempted to remove the admin module, access was denied");
    }
    if(this.modules.get(name).getAccess(password) === "true"){
        this.modules.remove(name);
        return;
    }
    
    console.log("attempted removal of module (" + name + ") in session: " + this.id + " failed");
    console.log("invalid access, or undefined module");
};

CSession.prototype.createFunction = function(moduleName, functionName, functionBody, functionParams){
    var theMod = this.modules.get(moduleName);
    if(theMod == undefined){
        console.log("attempted addition of function: " + functionName + " to module: " + moduleName + " in session: " + this.id + " failed");
        console.log("undefined module");
        return;
    }
    
    theMod.createFunction(functionName, theMod.password, functionBody, functionParams);
};

CSession.prototype.executeFunction = function(moduleName, functionName, functionArgs){
    var theMod = this.modules.get(moduleName);
    if(theMod == undefined){
        console.log("attempted execution of function: " + functionName + " to module: " + moduleName + " in session: " + this.id + " failed");
        console.log("undefined module");
        return;
    }
    
    theMod.execute(functionName, functionArgs);
};

CSession.prototype.addUser = function(user){
    this.users.push(user); 
};

CSession.prototype.removeUser = function(user){
    for(var i = 0; i < this.users.length; i++){
        if(this.users[i].id == user.id){
            this.users.splice(i, 1);
            break;
        }
    }
    
    //if this returns -1, kill the session
    return (this.users.length == 0 && this.persistent === "false") ? -1 : 1;
};

CSession.prototype.hasUser = function(userid){//returns string "true" if user is in this session
    for(var i = 0; i < this.users.length; i++){
        if(this.users[i].id == userid){
            return "true";
        }
    }
    return "false";
};

CSession.prototype.getAccess = function(password){
    if(this.access == "public"){
            return "true";
        }
        
    return this.password === password ? "true" : "false";
};

CSession.prototype.getAccesssModule = function(moduleName, password){
    var theMod = this.modules.get(moduleName);
    return theMod.getAccess(password);
};

CSession.prototype.broadcast = function(senderID, msg){
    //broadcasts to all users in a session
    console.log("session broadcast from: " + senderID);
    console.log("users in session (" + this.tag + ") :" + this.users.length);
    for(var i = 0; i < this.users.length; i++){
        if(this.users[i].id == senderID) continue;
        
        this.users[i].sendMsg(msg);
        console.log("broadcast message to user: " + this.users[i].id);
    }
};

CSession.prototype.setSessionProperty = function(identifier, value){
    var prop = this.properties.get(identifier);
    if(prop == undefined){
        console.log("some problem finding the property: " + identifier);
        console.log("adding that property now...");
        this.addSessionProperty(identifier, value);
        return;
    }
    
    prop.key = identifier;
    prop.value = value;
    
    //may not be 100%, but it should work..
    this.properties.put(prop.key, prop);
};

CSession.prototype.addSessionProperty = function(identifier, value){
    var prop = {};
    prop.value = value;
    prop.key   = identifier;
    
    this.properties.put(prop.key, prop);
};

CSession.prototype.getSessionProperties = function(){
    return this.properties.listValues();    
};

CSession.prototype.getSessionPropertyKeys = function(){
    return this.properties.listKeys();    
};

CSession.prototype.setOnEvent = function(event, value){
    switch(event){
        case "open":{
            this.Events.onOpen = value;    
        }
        break;
        
        case "close":{
            this.Events.onClose = value;
        }
        break;
        
        case "msg":{
            this.Events.onMsg = value;
        }
        break;
    
        case "error":{
            this.Events.onError = value;
        }
        break;
    
        default:{
            console.log("undefined OnEvent Type: " + event);
        }
        break;
    };
};


module.exports = CSession;