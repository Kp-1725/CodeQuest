function Game(debugMode, startLevel) {
   
    var __currentCode = '';
    var __commands = [];
    var __playerCodeRunning = false;


    this._dimensions = {
        width: 50,
        height: 25
    };

    this._levelFileNames = [

    ];

    this._bonusLevels = [

    ].filter(function (lvl) { return (lvl.indexOf('_') != 0); }); 

    this._mod = '//%MOD%';

    this._viewableScripts = [
        'codeEditor.js',
        'display.js',
        'dynamicObject.js',
        'game.js',
        'inventory.js',
        'map.js',
        'objects.js',
        'player.js',
        'reference.js',
        'sound.js',
        'ui.js',
        'util.js',
        'validate.js'
    ];

    this._editableScripts = [
        'map.js',
        'objects.js',
        'player.js'
    ];

    this._resetTimeout = null;
    this._currentLevel = 0;
    this._currentFile = null;
    this._currentBonusLevel = null;
    this._levelReached = 1;
    this._displayedChapters = [];

    this._playerPrototype = Player; 

    this._nextBonusLevel = null;

  

    this._getHelpCommands = function () { return __commands; };
    this._isPlayerCodeRunning = function () { return __playerCodeRunning; };
    this._getLocalKey = function (key) { return (this._mod.length == 0 ? '' : this._mod + '.') + key; };


    this._setPlayerCodeRunning = function (pcr) { __playerCodeRunning = pcr; };

   

    this._initialize = function () {
      
        var levelKey = this._mod.length == 0 ? 'levelReached' : this._mod + '.levelReached';
        this._levelReached = parseInt(localStorage.getItem(levelKey)) || 1;

    
        if (this._levelReached > this._levelFileNames.length) {
            for (var l = 1; l <= this._levelFileNames.length; l++) {
                if (!localStorage[this._getLocalKey("level" + l + ".lastGoodState")]) {
                    this._levelReached = l - 1;
                    break;
                }
            }
        }

     
        this.sound = new Sound('local');
       
        this.display = ROT.Display.create(this, {
            width: this._dimensions.width,
            height: this._dimensions.height,
            fontSize: 20
        });
        this.display.setupEventHandlers();
        var display = this.display;
        $('#screen').append(this.display.getContainer());
        $('#drawingCanvas, #dummyDom, #dummyDom *').click(function () {
            display.focus();
        });

      
        this.editor = new CodeEditor("editor", 600, 500, this);
        this.map = new Map(this.display, this);
        this.objects = this.getListOfObjects();

      
        this.enableShortcutKeys();
        this.enableButtons();
        this.setUpNotepad();

     
        if (localStorage.getItem(this._getLocalKey('helpCommands'))) {
            __commands = localStorage.getItem(this._getLocalKey('helpCommands')).split(';');
        }

      
        if (debugMode) {
            this._debugMode = true;
            this._levelReached = 999; 
            __commands = Object.keys(this.reference);
            this.sound.toggleSound(); 
        }

      
        if (startLevel) {
            this._currentLevel = startLevel - 1;
            this._getLevel(startLevel, debugMode);
        } else if (!debugMode && this._levelReached != 1) {
          
            this._getLevel(Math.min(this._levelReached, 21));
        } else {
            this._intro();
        }
    };

    this._intro = function () {
        this.display.focus();
        this.display.playIntro(this.map);
    };

    this._start = function (lvl) {
        this._getLevel(lvl ? lvl : 1);
    };

    this._moveToNextLevel = function () {
    
        if (typeof this.onExit === 'function') {
            var game = this;
            var canExit = this.validateCallback(function () {
                    return game.onExit(game.map);
            });
            if (!canExit) {
                this.sound.playSound('blip');
                return;
            }
        }

        this.sound.playSound('complete');

     
        this.map.getPlayer()._canMove = false;

        if (this._currentLevel == 'bonus') {
            if (this._nextBonusLevel) {
                this._getLevelByPath("levels/bonus/" + this._nextBonusLevel);
            } else {

                $('#helpPane, #notepadPane').hide();
                $('#menuPane').show();
            }
        } else {
            this._getLevel(this._currentLevel + 1, false, true);
        }
    };

    this._jumpToNthLevel = function (levelNum) {
        this._currentFile = null;
        this._getLevel(levelNum, false, false);
        this.display.focus();
        this.sound.playSound('blip');
    };

   
    this._getLevel = function (levelNum, isResetting, movingToNextLevel) {
        var game = this;
        var editor = this.editor;

        if (levelNum > this._levelFileNames.length) {
            return;
        }

        this._levelReached = Math.max(levelNum, this._levelReached);
        if (!debugMode) {
            localStorage.setItem(this._getLocalKey('levelReached'), this._levelReached);
        }

        var fileName = this._levelFileNames[levelNum - 1];

        lvlCode = this._levels['levels/' + fileName];
        if (movingToNextLevel) {
         
            editor.saveGoodState();
            editor.createGist();
        }

        game._currentLevel = levelNum;
        game._currentBonusLevel = null;
        game._currentFile = null;

     
        editor.loadCode(lvlCode);

     
        if (!isResetting && editor.getGoodState(levelNum)) {
        
            var newVer = editor.getProperties().version;
            var savedVer = editor.getGoodState(levelNum).version;
            if (!(newVer && (!savedVer || isNewerVersion(newVer, savedVer)))) {
               
                if (editor.getGoodState(levelNum).endOfStartLevel) {
                    editor.setEndOfStartLevel(editor.getGoodState(levelNum).endOfStartLevel);
                }
                if (editor.getGoodState(levelNum).editableLines) {
                    editor.setEditableLines(editor.getGoodState(levelNum).editableLines);
                }
                if (editor.getGoodState(levelNum).editableSections) {
                    editor.setEditableSections(editor.getGoodState(levelNum).editableSections);
                }

               
                editor.setCode(editor.getGoodState(levelNum).code);
            }
        }

       
        game._evalLevelCode(null, null, true);
        game.display.focus();

       
        __commands = __commands.concat(editor.getProperties().commandsIntroduced).unique();
        localStorage.setItem(this._getLocalKey('helpCommands'), __commands.join(';'));
    };

    this._getLevelByPath = function (filePath) {
        var game = this;
        var editor = this.editor;

        $.get(filePath, function (lvlCode) {
            game._currentLevel = 'bonus';
            game._currentBonusLevel = filePath.split("levels/")[1];
            game._currentFile = null;

        
            editor.loadCode(lvlCode);

        
            game._nextBonusLevel = editor.getProperties()["nextBonusLevel"];

          
            game._evalLevelCode(null, null, true);
            game.display.focus();

            
            __commands = __commands.concat(editor.getProperties().commandsIntroduced).unique();
            localStorage.setItem(this._getLocalKey('helpCommands'), __commands.join(';'));
        }, 'text');

    };

  
    this._editFile = function (filePath) {
        var game = this;

        var fileName = filePath.split('/')[filePath.split('/').length - 1];
        game._currentFile = filePath;

        $.get(filePath, function (code) {
           
            if (game._editableScripts.indexOf(fileName) > -1) {
                game.editor.loadCode('#BEGIN_EDITABLE#\n' + code + '\n#END_EDITABLE#');
            } else {
                game.editor.loadCode(code);
            }
        }, 'text');
    };

    this._resetLevel = function( level ) {
        var game = this;
        var resetTimeout_msec = 2500;
        var reset_game_msg = "To reset this level press ^4 again.";

        if ( this._resetTimeout != null ) {
            $('body, #buttons').css('background-color', '#000');
            window.clearTimeout( this._resetTimeout );
            this._resetTimeout = null;

            if (game._currentBonusLevel) {
                game._getLevelByPath('levels/' + game._currentBonusLevel);
            } else {
                this._getLevel(level, true);
            }
            if(game.map._status == reset_game_msg) {
                game.map.writeStatus("");
            }
        } else {
            this.map.writeStatus(reset_game_msg);
            $('body, #buttons').css('background-color', '#900');

            this._resetTimeout = setTimeout(function () {
                game._resetTimeout = null;
                if(game.map._status == reset_game_msg) {
                    game.map.writeStatus("");
                }

                $('body, #buttons').css('background-color', '#000');
            }, resetTimeout_msec );
        }
    };

   
    this._restartLevel = function () {
        this.editor.setCode(__currentCode);
        this._evalLevelCode();
    };

    this._evalLevelCode = function (allCode, playerCode, isNewLevel, restartingLevelFromScript) {
        this.map._clearIntervals();
        var game = this;

    
        var loadedFromEditor = false;
        if (!allCode) {
            allCode = this.editor.getCode();
            playerCode = this.editor.getPlayerCode();
            loadedFromEditor = true;
        }

       
        if (this._currentFile !== null && !restartingLevelFromScript) {
            __currentCode = allCode;
            this.validateAndRunScript(allCode);
            return;
        }

       
        this.display.saveGrid(this.map);

        
        var validatedStartLevel = this.validate(allCode, playerCode, restartingLevelFromScript);

        if (validatedStartLevel) { 
           
            this.map._reset(); 
            this.map = new Map(this.display, this);
            this.map._reset();
            this.map._setProperties(this.editor.getProperties()['mapProperties']);

           
            if (!restartingLevelFromScript) {
                __currentCode = allCode;
            }
            if (loadedFromEditor && !restartingLevelFromScript) {
                this.editor.saveGoodState();
            }

           
            var screenCanvas = $('#screen canvas')[0];
            $('#drawingCanvas')[0].width = screenCanvas.width;
            $('#drawingCanvas')[0].height = screenCanvas.height;
            $('#drawingCanvas').hide();
            $('#dummyDom').hide();

            // set correct inventory state
            this.setInventoryStateByLevel(this._currentLevel);

            // start the level
            validatedStartLevel(this.map);
            
            // Add the computer to bonus levels that lack it
            if (this._currentLevel == "bonus" && this.map.countObjects("computer") == 0) {
                this.addToInventory("computer")
                $('#editorPane, #savedLevelMsg').show();
                this.editor.refresh();
            }

         
            this.display.fadeIn(this.map, isNewLevel ? 100 : 10, function () {
                game.map.refresh(); 
              
                if (game.map._properties.showDrawingCanvas) {
                    $('#drawingCanvas').show();
                } else if (game.map._properties.showDummyDom) {
                    $('#dummyDom').show();
                }

                
                if (game.editor.getProperties().startingMessage) {
                    game.map.writeStatus(game.editor.getProperties().startingMessage);
                }
            });

            this.map._ready();

          
            if (this.editor.getProperties().music) {
                this.sound.playTrackByName(this.editor.getProperties().music);
            }

          
            if (this._levelReached >= 21) {
                this.activateSuperMenu();
            }

          
            if (this.map.getPlayer()) {
                this.map.getPlayer()._canMove = true;
                game.display.focus();
            }
        } else { 
            this.sound.playSound('static');

           
            this.map.getPlayer()._canMove = false;
        }
    };

    this._callUnexposedMethod = function(f) {
        if (__playerCodeRunning) {
            __playerCodeRunning = false;
            try {
                res = f();
            } finally {
                __playerCodeRunning = true;
            }
            return res;
        } else {
            return f();
        }
    };
    this._checkObjective = function() {
        if (typeof(this.objective) === 'function') {
            var game = this;
            var objectiveIsMet = this.validateCallback(function() {
                return game.objective(game.map);
            });
            if (objectiveIsMet) {
                this._moveToNextLevel();
            }
        }
    }
}
