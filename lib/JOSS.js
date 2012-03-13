var josm = require("./JOSM"); //JaHOVA OS Modules

//private functions for this module
defineAdminSession = function(joss){
    joss.adminSession = new josm.Session("MainSession", "", []); //admin session is public..

    joss.adminSession.createModule("AdminModule", "godfather"); //admin module is private, however..
    var rpBody = "console.log(\"Resetting Admin Password\"); admod.password = password; console.log(\"Admin Password Is Now: \" + password);";
    var rpInput = ["admod", "password"];
    joss.adminSession.createFunction("AdminModule", "ResetPassword", rpBody, rpInput);

    joss.adminSession.createModule("Public", ""); //'Public' session is public. Methods for everyone!
    var pfBody = "console.log(msg)";
    var pfInput = ["msg"];
    joss.adminSession.createFunction("Public", "Shout", pfBody, pfInput);

    joss.sessions.put(Number(joss.adminSession.id), joss.adminSession);
    return joss.adminSession;
};

//==============================================
// start of module:::::::::::::::::::::::::::::
//==============================================

JOSS = function(){

    this.users = new josm.Map();
    this.sessions = new josm.Map();
    this.adminSession = defineAdminSession(this);
    this.loadedTypes = new josm.Map();
    
    //test..
    this.josm = josm;
};

JOSS.prototype.addUser = function(type, sendStream){

    var newUser = new josm.User();
    newUser.typeComm = type;
    newUser.stream = sendStream;
    this.users.put(Number(newUser.id), newUser);

    //auto-join admin session
    newUser.joinedSessions.push(this.adminSession);
    this.adminSession.addUser(newUser);
    
    this.respond(newUser, "userID", [newUser.id]);
};

JOSS.prototype.removeUser = function(type, sendStream){
    for(var i = 0; i < this.users.size; i++){
        var user = this.users.value();
        if(user.stream === sendStream){
            console.log("user: " + user.id + " a.k.a. : " + user.tag + " found, and is now being removed.");
            //remove from all joined sessions...
            console.log("removing user from sessions...");
            for(var j = 0; j < user.joinedSessions.length; j++){
                console.log("session id: " + user.joinedSessions[j].id);
                var kill = user.joinedSessions[j].removeUser(user);
                console.log("num users in session after remove: " + user.joinedSessions[j].users.length);
                if(kill == -1){
                    console.log("session: " + user.joinedSessions[j].id + " is now empty.");
                    console.log("removing session from server...");
                    this.sessions.remove(user.joinedSessions[j].id); 
                }
            }
            this.users.remove(user.id);
            sendStream.emit('disconnect', {msg:'disconnect message'});
            sendStream.disconnect();
            return;
        }
        this.users.next();
    }
    console.log("websocket user: " + sendStream.id + " not found. user may not be removed correctly!");
};

JOSS.prototype.sessionBroadcast = function(user, sessionID, msg){
   var sesh = this.sessions.get(sessionID);
   if(sesh == undefined){
    console.log("undefined session, broadcasting to main for debugging");
    this.sessions.get(this.adminSession.id).broadcast(user.id, msg);
    return;
   }
   sesh.broadcast(user.id, msg);
};

JOSS.prototype.onMessage = function(sentMsg){    
    //msg.UserID;
    //msg.SessionID;
    //msg.ModuleID;
    //msg.FunctionID;
    //msg.Data.Type;
    //msg.Data.Args;
    
    try{
        msg = JSON.parse(sentMsg);
    }catch(exx){
        console.log("exception" + exx);
        return;
    }
    
   // var msg = sentMsg;
    
    var msgUser = this.users.get(Number(msg.UserID));
    if(msgUser == undefined){
        console.log("invalid user: " + msg.UserID);
        return;
    }

    var session = this.sessions.get(Number(msg.SessionID));
    if(session == undefined){
        console.log("invalid sessionID: " + msg.SessionID);
        return;
    }

    switch(msg.Data.Type){
        
        case "getList":{
                this.respond(msgUser, "sessionList", this.getActiveSessions(msg.Data.Args[0]));    
            }
            break;
        
        case "getAvailableTypes":{
                this.respond(msgUser, "availableTypes", this.getAvailableSessionTypes());    
        }
            break;
        
        case "createSession":{
            var newSession = this.createSession(msg.Data.Args[0],
                                                msg.Data.Args[1],
                                                msg.Data.Args[2]);
            
            this.sessions.put(Number(newSession.id), newSession);
            
            // keep track of join
            msgUser.storeSessionAccess(newSession.tag, newSession.password); //store access
            msgUser.joinedSessions.push(newSession);
            newSession.addUser(msgUser);
            
            //send response to user
            this.respond(msgUser, "sessionCreated", [newSession.id]);
        }
            break;
        
        case "createRegisteredSession":{
            var sessionType = this.loadedTypes.get(msg.Data.Args[0]);
            
            if(sessionType == undefined){
                //some error has occurred..
                this.respond(msgUser, "creationError", ["undefined session-type"]);
                break;
            }
            
            var newSession = this.createSession(sessionType.tag,
                                                msg.Data.Args[1],
                                                sessionType.properties);
            newSession.modules = sessionType.modules;
            newSession.Events  = sessionType.Events;
            newSession.persistent = sessionType.persistent;
            
            this.sessions.put(Number(newSession.id), newSession);
            
            msgUser.storeSessionAccess(newSession.tag, newSession.password); //store access
            msgUser.joinedSessions.push(newSession);
            newSession.addUser(msgUser);
            
            if(newSession.Events.onOpen){
                newSession.Events.onOpen();
            }
            
            this.respond(msgUser, "sessionCreated", [newSession.id]);
        }
            break;

        case "joinSession":{
                if(session.getAccess(msg.Data.Args[0]) === "true"){
                    if(session.hasUser(msgUser.id) === "false"){
                        session.addUser(msgUser);
                        msgUser.storeSessionAccess(msg.SessionID, msg.Data.Args[0]);
                        msgUser.joinedSessions.push(session);
                    }
                    
                    if(session.Events.onOpen){
                        session.Events.onOpen();
                    }
                    
                    this.respond(msgUser, "sessionJoined", [session.id]);
                }
            }
            break;
        
        case "leaveSession":{
                if(session.hasUser(msgUser.id) === "true"){
                    for(var i = 0; i < msgUser.joinedSessions.length; i++){
                        if(msgUser.joinedSessions[i].id == session.id){
                            msgUser.joinedSessions.splice(i, 1);
                            break;
                        }
                    }
                    var kill = session.removeUser(msgUser);
                    if(kill == -1){
                        console.log("session: " + session.id + " is now empty.");
                        console.log("removing session from server...");
                        this.sessions.remove(session.id);
                        
                    }
                }
                this.respond(msgUser, "sessionLeft", [session.id]);
            }
            break;

        case "accessSession":{
                if(session.getAccess(msg.Data.Args[0]) === "true"){
                    msgUser.storeSessionAccess(msg.SessionID, msg.Data.Args[0]);
                    this.respond(msgUser, "sessionAccessDenied", [msg.SessionID]);
                    break;
                }
                
                this.respond(msgUser, "sessionAccessGranted", [msg.SessionID]);
            }
            break;
        
        case "sessionBroadcast":{
            this.sessionBroadcast(msgUser, msg.SessionID, msg);
        }
            break;

        case "accessModule":{
                if(msgUser.hasSessionAccess(Number(msg.SessionID)) === "true"){
                    if(session.getAccessModule(msg.ModuleID, msg.Data.Args[0]) === "true"){
                        msgUser.storeModuleAccess(msg.ModuleID, msg.Data.Args[0]);
                        this.respond(msgUser, "moduleAccessDenied", [Number(msg.SessionID), msg.ModuleID]);
                        break;
                    }
                    
                    this.respond(msgUser, "moduleAccessGranted", [msg.SessionID, msg.ModuleID]);
                }
            }
            break;
        
        case "createFunction":{
                if(msgUser.hasSessionAccess(msg.SessionID) === "true"){
                    if(msgUser.hasModuleAccess(msg.ModuleID) === "true"){
                        session.createFunction(msg.Data.Args[0], msg.Data.Args[1], msg.Data.Args[2], msg.Data.Args[3]);    
                    }
                }
                
                this.respond(msgUser, "functionCreated", [msg.ModuleID, msg.Data.Args[0]]);
        }
            break;

        case "executeFunction":{
                if(msgUser.hasSessionAccess(Number(msg.SessionID)) === "true" && msgUser.hasModuleAccess(msg.ModuleID) === "true"){
                    var session = this.sessions.get(Number(msg.SessionID));
                    session.executeFunction(msg.ModuleID, msg.FunctionID, msg.Data.Args);
                }
            }
            break;

        case "createModule":{
                if(msgUser.hasSessionAccess(msg.SessionID) == "true"){
                    session.createModule(msg.Data.Args[0], msg.Data.Args[1]);
                    msgUser.storeModuleAccess(msg.Data.Args[0], msg.Data.Args[1]);
                }
                
                this.respond(msgUser, "moduleCreated", [msg.Data.Args[0]]);
            }
            break;
        
        case "getSessionProperties":{
                this.respond(msgUser, "sessionProperties", session.getSessionPropertyKeys());    
        }
            break;
        
        case "getSessionValues":{
                this.respond(msgUser, "sessionValues", session.getSessionProperties());
        }
            break;
        
        case "setSessionProperty":{
            session.setSessionProperty(msg.Data.Args[0], msg.Data.Args[1]);
            this.respond(msgUser, "propertySet", [msg.Data.Args[0], msg.Data.Args[1]]);
        }
            break;
        
        case "disconnect":{   
                this.removeUser("", msgUser.stream);        
        }
            break;

        default:{
            console.log("unhandled message type: " + msg.Data.Type);
            console.log("from user: " + msg.UserID + " for session: " + msg.SessionID);
        }
            break;
    };
};

JOSS.prototype.respond = function(user, type, args){
    
    var msg = {};
    msg.SessionID = this.adminSession.id;
    msg.UserID = 0;
    msg.ModuleID = 0;
    msg.Data = {};
    msg.Data.Type = type;
    msg.Data.Args = args;
    user.sendMsg(msg);    
};

JOSS.prototype.sessionList = function(type){
    //if no type is defined, send all open sessions
    if( type === "" ) return this.sessions.listKeys();
    
    var res = [];
    
    //if there is a type, match it with a tag, then send that out
    for(var i = 0; i < this.sessions.size; i++){
        var curr = this.sessions.value();
        
        if(curr.tag === type){
            res.push(curr.id);
        }
        
        this.sessions.next();
    }
    
    return res;
};

JOSS.prototype.getAvailableSessionTypes = function(){
    return this.loadedTypes.listKeys();    
};

JOSS.prototype.getActiveSessions = function(type){ //returns active session by specified type
//if no type is specified, then returns all active sessions

    var list = [];

    if(type === "" || type == undefined){
        //send all    
    }
    
    for(var i = 0; i < this.sessions.size; i++){
        var sesh = this.sessions.value();
        
        if(sesh.tag === type){
            var active = {};
            active.name = sesh.tag;
            active.id   = sesh.id;
            active.properties = [];
            for(var j = 0; j < sesh.properties.size; j++){
                active.properties.push(sesh.properties.value());
                sesh.properties.next();
            }
            list.push(active);
        }
        
        this.sessions.next();
    }
    
    return list;
};

JOSS.prototype.createSession = function(tag, password, properties){
    var newSession = new josm.Session(tag, password, properties);
    
    //if tag doesn't already exist, keep track of it..
    var loadedSession = this.loadedTypes.get(newSession.tag)
    if(loadedSession == undefined){
        this.loadedTypes.put(newSession.tag, newSession);
        var realNewSession = this.createSession(tag, password, properties);
        return realNewSession;
    }
    
    return newSession;
};

JOSS.prototype.setSessionOnEvent = function(sessionType, event, value){
    var session = this.loadedTypes.get(sessionType);
    if(session == undefined){
        console.log("JOSS.setSessionOnEvent:: error finding session type: " + sessionType);
        return;
    }
    session.setOnEvent(event, value);
};

JOSS.prototype.setPersistent = function(sessionType, persistent){
    var session = this.loadedTypes.get(sessionType);
    if(session == undefined){
        console.log("JOSS.setPersistent:: error finding session type: " + sessionType);
        return;
    }
    console.log("setting persistent value for session type: " + sessionType + " to: " + persistent);
    session.persistent = persistent;
};


module.exports = new JOSS();