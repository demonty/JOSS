var map = require("./CMap");
var func = require("./CFunction");

var ModuleID = 0;

CModule = function(name, password){
    this.location = "local"; // or remote
    this.name = name;
    
    this.id = ModuleID;
    ModuleID++;
    
    this.CFunctionMap = new map();
    this.functions = new map();
    
    if(password === ""){ //public
        this.access = "public";
        this.password = "";
    }else{ //private...  
        this.access = "private";
        this.password = password;
    }
};

CModule.prototype.execute = function(name, args){
    var fun = this.CFunctionMap.get(name);
    if(fun == undefined){
        console.log("function (" + name + ") not found");
        return;
    }
    
    var functionAccess = fun.getAccess(this.password);
    
    //if not undefined, functionAccess will be the function string
    //check to make sure function has not already been created.
    var createdFunction = this.functions.get(name);
    if(createdFunction == undefined){
        createdFunction = new Function(fun.params, functionAccess);
        this.functions.put(name, createdFunction);    
    }
    
    try{
        createdFunction.apply(createdFunction, args);
    }catch(exx){
        console.log("an exception was caught for function: " + name + " in module: " + this.name);
        console.log(exx);
    }
};

CModule.prototype.createFunction = function(name, password, foo, fooParams){
    var newfunc = new func(name, password, foo, fooParams);
    this.CFunctionMap.put(name, newfunc);
};

CModule.prototype.getFunctionList = function(){
  
};

CModule.prototype.getAccess = function(password){ //if password fails, returns "false".
    if(this.access == "public"){
        return "true";
    }
    
    return this.password === password ? "true" : "false";
};


//make available through require..
module.exports = CModule;
