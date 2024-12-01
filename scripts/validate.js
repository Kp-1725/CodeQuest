Game.prototype.verbotenWords = [
    '.call', 'call(', 'apply', 'bind',
    'prototype', 
    'debugger', 
    'delete', 
    'constructor', 
    'window',
    'top', 
    'validate', 'onExit', 'objective',
     '\\u' 
];
Game.prototype.allowedTime = 2000; 

var DummyDisplay = function () {
    this.clear = function () {};
    this.drawAll = function () {};
    this.drawObject = function () {};
    this.drawText = function () {};
    this.writeStatus = function () {};
};

Game.prototype.validate = function(allCode, playerCode, restartingLevelFromScript) {
    var game = this;

    try {
        for (var i = 0; i < this.verbotenWords.length; i++) {
            var badWord = this.verbotenWords[i];
            if (playerCode.indexOf(badWord) > -1) {
                throw "You are not allowed to use '" + badWord + "'!";
            }
        }

        var dummyMap = new Map(new DummyDisplay(), this);
        dummyMap._dummy = true;
        dummyMap._setProperties(this.editor.getProperties().mapProperties);

      
        allCode = allCode.replace(/\)\s*{/g, ") {"); 
        allCode = allCode.replace(/\n\s*while\s*\((.*)\)/g, "\nfor (dummy=0;$1;)"); 
        allCode = $.map(allCode.split('\n'), function (line, i) {
            return line.replace(/for\s*\((.*);(.*);(.*)\)\s*{/g,
                "for ($1, startTime = Date.now();$2;$3){" +
                    "if (Date.now() - startTime > " + game.allowedTime + ") {" +
                        "throw '[Line " + (i+1) + "] TimeOutException: Maximum loop execution time of " + game.allowedTime + " ms exceeded.';" +
                    "}");
        }).join('\n');
        allCode = "'use strict';var validateLevel,onExit,objective\n"+allCode;
        allCode = allCode+"\n({startLevel:startLevel,validateLevel:validateLevel,onExit:onExit,objective:objective})";

        if (this._debugMode) {
            console.log(allCode);
        }

        var allowjQuery = dummyMap._properties.showDummyDom;
       
        var userEnv = this.initIframe(allowjQuery);

       
        var userOutput = this._eval(allCode);

      
        this._setPlayerCodeRunning(true);
        userOutput.startLevel(dummyMap);
        this._setPlayerCodeRunning(false);

       
        this._startOfStartLevelReached = false;
        this._endOfStartLevelReached = false;
        dummyMap._reset();
        this._setPlayerCodeRunning(true);
        userOutput.startLevel(dummyMap);
        this._setPlayerCodeRunning(false);

       
        if (!this._startOfStartLevelReached && !restartingLevelFromScript) {
            throw 'startLevel() has been tampered with!';
        }
        if (!this._endOfStartLevelReached && !restartingLevelFromScript) {
            throw 'startLevel() returned prematurely!';
        }
        this.validateLevel = function () { return true; };
     
        if (typeof(userOutput.validateLevel) === "function") {
            this.validateLevel = userOutput.validateLevel;
            this._setPlayerCodeRunning(true);
            userOutput.validateLevel(dummyMap);
            this._setPlayerCodeRunning(false);
        }
        dummyMap._clearIntervals();

        this.onExit = function () { return true; };
        if (typeof userOutput.onExit === "function") {
            this.onExit = userOutput.onExit;
        }

        this.objective = function () { return false; };
        if (typeof userOutput.objective === "function") {
            this.objective = userOutput.objective;
        }

        return userOutput.startLevel;
    } catch (e) {
        
        this._setPlayerCodeRunning(false);
        if (dummyMap) {
            dummyMap._clearIntervals();
        }

        var exceptionText = e.toString();
        if (e instanceof this.SyntaxError) {
            var lineNum = this.findSyntaxError(allCode, e.message);
            if (lineNum) {
                exceptionText = "[Line " + lineNum + "] " + exceptionText;
            }
        }
        this.display.appendError(exceptionText);

        return null;
    }
};


Game.prototype.validateCallback = function(callback, throwExceptions) {
    var savedException = null;
    var exceptionFound = false;
    try {
    
        try {
            this._setPlayerCodeRunning(true);
            var result = callback();
            this._setPlayerCodeRunning(false);
        } catch (e) {
           
            this._setPlayerCodeRunning(false);

            if (e.toString().indexOf("Forbidden method call") > -1 ||
                e.toString().indexOf("Attempt to modify private property") > -1 ||
                e.toString().indexOf("Attempt to read private property") > -1) {
              
                this.display.appendError(e.toString(), "%c{red}Please reload the level.");
                this.sound.playSound('static');
                this.map.getPlayer()._canMove = false;
                this.map._callbackValidationFailed = true;
                this.map._clearIntervals();
               
                return;
            } else {
               
                savedException = e;
                exceptionFound = true;
            }
        }

       
        try {
            if (typeof(this.validateLevel) === 'function') {
                this._setPlayerCodeRunning(true);
                this.validateLevel(this.map);
                this._setPlayerCodeRunning(false);
            }
        } catch (e) {
            this._setPlayerCodeRunning(false);
           
            this.display.appendError(e.toString(), "%c{red}Validation failed! Please reload the level.");

           
            this.sound.playSound('static');

           
            this.map.getPlayer()._canMove = false;
            this.map._callbackValidationFailed = true;
            this.map._clearIntervals();
            return;
        }

       
        if(!this.map._properties.refreshRate) {
            this.map.refresh();
        }
        if(exceptionFound) {
            throw savedException;
        }
        return result;
    } catch (e) {
        this.map.writeStatus(e.toString());

      
        if (throwExceptions) {
            throw e;
        }
    }
};

Game.prototype.validateAndRunScript = function (code) {
    try {
       
        code = code.replace(/Game.prototype/, 'this');

     
        code = code.replace(/function Map/, 'this._mapPrototype = function');
        code = code.replace(/function Player/, 'this._playerPrototype = function');

        new Function(code).bind(this).call(); 

        if (this._mapPrototype) {
            this.map._reset(); 
            this.map = new this._mapPrototype(this.display, this);
        }

        this.objects = this.getListOfObjects();
        var savedState = this.editor.getGoodState(this._currentLevel);
        this._evalLevelCode(savedState['code'], savedState['playerCode'], false, true);
    } catch (e) {
        this.display.writeStatus(e.toString());
        //throw e; // for debugging
    }
}
var allowedGlobals = {
 
    'Object':true,
    'Array':true,
    'String':true,
    'Number':true,
    'Math':true,
    'parseInt':true,
    'Date':true
}

Game.prototype.initIframe = function(allowjQuery){
    var iframe = $("#user_code")[0];
    iframe.src = "about:blank";
    var iframewindow = iframe.contentWindow;
    if (iframewindow.eval) {
        this._eval = iframewindow.eval;
        this.SyntaxError = iframewindow.SyntaxError;
    }
    function purgeObject(object) {
        var globals = Object.getOwnPropertyNames(object);
        for (var i = 0;i < globals.length;i++) {
            var variable = globals[i];
            if (!allowedGlobals.hasOwnProperty(variable)) {
                delete object[variable];
            }
        }
        var prototype = Object.getPrototypeOf(object);
        if (prototype && prototype != iframewindow.Object.prototype) {
            purgeObject(prototype);
        }
    }
    purgeObject(iframewindow);
   
    purgeObject(iframewindow.document);
   
    iframewindow.ROT = {Map: {DividedMaze: ROT.Map.DividedMaze }}
    if (allowjQuery) {
        iframewindow.$ = iframewindow.jQuery = jQuery;
    }
    return iframewindow;
}
Game.prototype.secureObject = function(object, objecttype) {
    for (var prop in object) {
        if(prop == "_startOfStartLevelReached" || prop == "_endOfStartLevelReached"){
            continue;
        }
        if(prop[0] == "_"){
            this.secureProperty(object, prop, objecttype);
        } else if (typeof object[prop] == "function") {
            Object.defineProperty(object, prop, {
                    configurable:false,
                    writable:false
            });
        }
    }
}
Game.prototype.secureProperty = function(object, prop, objecttype){
    var val = object[prop];
    var game = this;
    Object.defineProperty(object, prop, {
            configurable:false,
            enumerable:false,
            get:function(){
                if (game._isPlayerCodeRunning()) {
                    throw "Attempt to read private property " + objecttype + "." + prop;
                }
                return val;
            },
            set:function(newValue){
                if(game._isPlayerCodeRunning()) {
                    throw "Attempt to modify private property " + objecttype + "." + prop;
                }
                val = newValue
            }
    });
}

Game.prototype.findSyntaxError = function(code, errorMsg) {
    var lines = code.split('\n');
    var phantomLines = 1;
    for (var i = 1; i <= lines.length; i++) {
        var line = lines[i - 1];
        var startStartLevel = "map._startOfStartLevelReached()";
        var endStartLevel = "map._endOfStartLevelReached()";
        if (line == startStartLevel || line == endStartLevel ) {
            phantomLines += 1;
        }
        var testCode = lines.slice(0, i).join('\n');
        try {
            this._eval("'use strict';" + testCode);
        } catch (e) {
            if (e.message === errorMsg) {
                return i - phantomLines;
            }
        }
    }
    return null;
};
