
CFunction = function(name, password, foo, fooParams){ //function name, password, function str, function param list
    this.func = foo; //string function
    this.params = fooParams
    this.name = name;
    
    if(password === ""){ //public
        this.access = "public";
        this.password = "";
    }else{ //private...  
        this.access = "private";
        this.password = password;
    }
};


CFunction.prototype.getAccess = function(password){
    //this is commented out because we decided that
    //if access is granted to a module, then all functions inside
    //will also give access...
    
    return this.func;
};

module.exports = CFunction;
