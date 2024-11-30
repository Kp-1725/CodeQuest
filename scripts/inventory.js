Game.prototype.inventory = [];

Game.prototype.getItemDefinition = function (itemName) {
	var map = this.map;
	return this._callUnexposedMethod(function () {
		return map._getObjectDefinition(itemName);
	});
};

Game.prototype.addToInventory = function (itemName) {
	if (this.inventory.indexOf(itemName) === -1) {
		this.inventory.push(itemName);
		this.drawInventory();
	}
};

Game.prototype.checkInventory = function (itemName) {
	return this.inventory.indexOf(itemName) > -1;
};

Game.prototype.removeFromInventory = function (itemName) {
	var object = this.getItemDefinition(itemName);
	if (!object) {
		throw 'No such object: ' + itemName;
	}
	if (object.type != 'item') {
		throw 'Object is not an item: ' + itemName;
	}

	this.inventory.remove(itemName);
	this.drawInventory();

	if (object.onDrop) {
		this._setPlayerCodeRunning(true);
		try {
			object.onDrop();
		} catch (e) {
			this.map.writeStatus(e.toString())
		}
		this._setPlayerCodeRunning(false);
	}
};

Game.prototype.setInventoryStateByLevel = function (levelNum) {
	
	if (levelNum == 1 || levelNum == "bonus") {
		this.removeFromInventory('computer');
	}
	if (levelNum <= 7 || levelNum == "bonus") {
		this.removeFromInventory('phone');
	}

	
	this.inventory = [];

	if (levelNum > 1) {
		this.addToInventory('computer');
		$('#editorPane, #savedLevelMsg').fadeIn();
		this.editor.refresh();
	}
	if (levelNum > 7) {
		this.addToInventory('phone');
		$('#phoneButton').show();
	}
	if (levelNum > 11) {
		this.addToInventory('redKey');
	}
	if (levelNum > 12) {
		this.addToInventory('greenKey');
	}
	if (levelNum > 13) {
		this.addToInventory('blueKey');
	}
	if (levelNum > 14) {
		this.addToInventory('theAlgorithm');
		this.removeFromInventory('redKey');
		this.removeFromInventory('greenKey');
		this.removeFromInventory('blueKey');
	}
	if (levelNum > 15) {
		this.removeFromInventory('theAlgorithm');
	}
	if (levelNum > 20) {
		this.addToInventory('theAlgorithm');
	}

    this.map.writeStatus("");
};

Game.prototype.drawInventory = function () {
	var game = this;

	if (this.inventory.length > 0) {
		$('#inventory').text('INVENTORY: ');

		this.inventory.forEach(function (item) {
			var object = game.map._getObjectDefinition(item);

			$('<span class="item">')
				.attr('title', item)
				.css('color', object.color ? object.color : '#fff')
				.text(object.symbol)
				.appendTo($('#inventory'));
		});
	} else {
		$('#inventory').html('');
	}
};

Game.prototype.usePhone = function () {
	var player = this.map.getPlayer();
	if (player && player._canMove && player.hasItem('phone')) {
		if (player._phoneFunc) {
			this.sound.playSound('select');
			this.validateCallback(player._phoneFunc);
		} else {
			this.sound.playSound('static');
			this.map.writeStatus("Your function phone isn't bound to any function!");
		}
	}
};
