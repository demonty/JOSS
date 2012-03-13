//JaHOVA OS MODULES

var JOSM        = {};
JOSM.Map        = require("./CMap");
JOSM.User       = require("./CUser");
JOSM.Session    = require("./CSession");
JOSM.Module     = require("./CModule");
JOSM.Function   = require("./CFunction");
//JOSM.Handler    = new Handler();
module.exports = JOSM;
