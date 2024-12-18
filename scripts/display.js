ROT.Display.create = function(game, opts) {
    opts.fontFamily = '"droid sans mono", Courier, "Courier New", monospace';
    var display = new ROT.Display(opts);
    display.game = game;
    return display;
};

ROT.Display.prototype.errors = [];

ROT.Display.prototype.setupEventHandlers = function() {
    var display = this;
    var game = this.game;

   
    var keys = {
        37: 'left', // left arrow
        38: 'up', // up arrow
        39: 'right', // right arrow
        40: 'down', // down arrow
        65: 'left', // A
        68: 'right', // D
        72: 'left', // H
        74: 'down', // J
        75: 'up', // K
        76: 'right', // L
        81: 'funcPhone', // Q
        82: 'rest', // R
        83: 'down', // S
        87: 'up', // W
        98: 'down', // 2
        100: 'left', // 4
        101: 'rest', // 5
        102: 'right', // 6
        104: 'up' // 8
    };

    $(this.getContainer()).attr("contentEditable", "true");
    this.getContainer().addEventListener("keydown", function(e) {
        if (display._intro == true) {
            game._start();
            display._intro = false;
        } else if (keys[e.keyCode] && game.map.getPlayer()) {
            game.map.getPlayer().move(keys[e.keyCode], true);
        }
        e.preventDefault();
    });

    this.getContainer().addEventListener("click", function(e) {
        $(this).addClass('focus');
        $('.CodeMirror').removeClass('focus');

        $('#helpPane').hide();
        $('#menuPane').hide();
    });
};


ROT.Display.prototype.drawObject = function (map, x, y, object) {
    var type = object.type;
    var definition = map._getObjectDefinition(type) || this.savedDefinitions[type];

    var symbol = definition.symbol;
    var color = object.color || definition.color || "#fff";
    var bgColor = object.bgColor || "#000";

    this.draw(x, y, symbol, color, bgColor);
};

ROT.Display.prototype.drawAll = function(map) {
    if (!this.offset) {this.offset = 0;}

    var game = this.game;


    var grid = new Array(game._dimensions.width);
    for (var x = 0; x < game._dimensions.width; x++) {
        grid[x] = new Array(game._dimensions.height);
        for (var y = 0; y < game._dimensions.height; y++) {
            grid[x][y] = {
                type: 'empty',
                bgColor: 'black'
            };
        }
    }

    for (var x = 0; x < game._dimensions.width; x++) {
        for (var y = 0; y < game._dimensions.height; y++) {
            grid[x][y] = {
                type: map._getGrid()[x][y].type,
                bgColor: map._getGrid()[x][y].bgColor
            };
        }
    }

    var dynamicObjects = map.getDynamicObjects();
    for (var i = 0; i < dynamicObjects.length; i++) {
        var obj = dynamicObjects[i];
        grid[obj.getX()][obj.getY()] = {
            type: obj.getType(),
            bgColor: map._getGrid()[obj.getX()][obj.getY()].bgColor
        };
    }

    
    if (map.getPlayer()) {
        var player = map.getPlayer();
        grid[player.getX()][player.getY()] = {
            type: 'player',
            color: player.getColor(),
            bgColor: map._getGrid()[player.getX()][player.getY()].bgColor
        }
    }

  
    for (var x = 0; x < game._dimensions.width; x++) {
        for (var y = Math.max(0, this.offset - map.getHeight()); y < game._dimensions.height; y++) {
            this.drawObject(map, x, y + this.offset, grid[x][y]);
        }
    }

    if (this.errors && this.errors.length > 0) {
        for (var i = 0; i < this.errors.length; i++) {
            var y = this.game._dimensions.height - this.errors.length + i;
            this.drawText(0, y, this.errors[i]);
        }
    }

   
    this.grid = grid;
};

ROT.Display.prototype.drawPreviousLevel = function(map, offset) {
    if (!offset) {offset = 0;}

    var game = this.game;
    var grid = this.savedGrid;

    if (grid) {
        for (var x = 0; x < game._dimensions.width; x++) {
            for (var y = 0; y < game._dimensions.height; y++) {
                this.drawObject(map, x, y + offset, grid[x][y]);
            }
        }
    }
};

ROT.Display.prototype.saveGrid = function (map) {
    this.savedGrid = this.grid;
    this.savedDefinitions = map._getObjectDefinitions();
}

ROT.Display.prototype.playIntro = function (map, i) {
    display = this;
	playIntro(display, map, i)
};

ROT.Display.prototype.fadeIn = function (map, speed, callback, i) {
    var display = this;
    var game = this.game;
    if (game._currentLevel == "bonus") {
        var levelName = game._currentBonusLevel;
    } else {
        var levelName = game._levelFileNames[game._currentLevel - 1];
    }
    var command = "%c{#0f0}> run " + levelName;

    if (i < -3) {
        if (callback) { callback(); }
    } else {
        if (typeof i === 'undefined') { i = map.getHeight(); }
        this.clear();
        this.errors = [];
        this.drawPreviousLevel(map, i - map.getHeight());

        this.offset = i + 3;
        this.drawAll(map);

        this.drawText(0, i + 1, command);

        setTimeout(function () {
            display.fadeIn(map, speed, callback, i - 1);
        }, speed);
    }
};

ROT.Display.prototype.writeStatus = function(text) {
    var map = this.game.map;

    var strings = [text];
    if (text.length > map.getWidth()) {
        var minCutoff = map.getWidth() - 10;
        var cutoff = minCutoff + text.slice(minCutoff).indexOf(" ");
        strings = [text.slice(0, cutoff), text.slice(cutoff + 1)];
    }

    for (var i = 0; i < strings.length; i++) {
        var str = strings[i];
        var x = Math.floor((map.getWidth() - str.length) / 2);
        var y = map.getHeight() + i - strings.length - 1;
        this.drawText(x, y, str);
    }
};

ROT.Display.prototype.appendError = function(errorText, command) {
    var game = this.game;
    if (game._currentLevel == "bonus") {
        var levelName = game._currentBonusLevel;
    } else {
        var levelName = game._levelFileNames[game._currentLevel - 1];
    }
    if (!command) {
        command = "%c{#0f0}> run " + levelName;
    }

    this.offset -= 3;
    this.errors = this.errors.concat([command, errorText, ""]);
    this.clear();
    this.drawAll(game.map);
};

ROT.Display.prototype.focus = function() {
    $('#screen').show();
    $(this.getContainer()).attr('tabindex', '0').click().focus();
};


ROT.Display.prototype.renderDom = function(html, css) {
 
    $(dummyDom).html(html); 
}
