function DynamicObject(map, type, x, y, __game) {


    var __x = x;
    var __y = y;
    var __type = type;
    var __definition = __game._callUnexposedMethod(function () {
        return map._getObjectDefinition(type);
    });
    var __inventory = [];
    var __destroyed = false;
    var __myTurn = true;
    var __timer = null;

    this._map = map;

   

    function wrapExposedMethod(f, object) {
        return function () {
            var args = arguments;
            return __game._callUnexposedMethod(function () {
                return f.apply(object, args);
            });
        };
    };


    this._computeDestination = function (startX, startY, direction) {
        if (__game._isPlayerCodeRunning()) { throw 'Forbidden method call: object._computeDestination()';}

        switch (direction) {
            case 'up':
                return {'x': startX, 'y': startY - 1};
            case 'down':
                return {'x': startX, 'y': startY + 1};
            case 'left':
                return {'x': startX - 1, 'y': startY};
            case 'right':
                return {'x': startX + 1, 'y': startY};
            default:
                return {'x': startX, 'y': startY};
        }
    };

    this._onTurn = function () {
        if (__game._isPlayerCodeRunning()) { throw 'Forbidden method call: object._onTurn()';}

        var me = this;
        var player = map.getPlayer();

        function executeTurn() {
            if (map._callbackValidationFailed) {
                clearInterval(__timer);
                return;
            }
            __myTurn = true;

            try {
            
                if (__x === player.getX() && __y === player.getY()) {
                    if (__definition.pushable) {
                        me.move(player.getLastMoveDirection());
                    }
                    if (__definition.onCollision) {
                        map._validateCallback(function () {
                            __definition.onCollision(player, me);
                        });
                    }
                }

                if (__myTurn && __definition.behavior) {
                    map._validateCallback(function () {
                        __definition.behavior(me, player);
                    });
                }
            } catch (e) {
               
                map.writeStatus(e.toString());
            }
        }

        if (__definition.interval) {
         
            if (!__timer) {
                __timer = setInterval(executeTurn, __definition.interval);
            }

            
            if (map.getPlayer().atLocation(__x, __y) &&
                    (__definition.onCollision || __definition.projectile)) {
                
                if (__definition.projectile) {
                 
                    map.getPlayer().killedBy('a ' + __type);
                } else {
                    var thing = this;
                    map._validateCallback(function () {
                        __definition.onCollision(map.getPlayer(), thing);
                    });
                }
            }
        } else {
            executeTurn();
        }
    };

    this._afterMove = function () {
        if (__game._isPlayerCodeRunning()) { throw 'Forbidden method call: object._afterMove()';}

      
        var objectName = map._getGrid()[__x][__y].type;
        var object = map._getObjectDefinition(objectName);
        if (object.type === 'item' && !__definition.projectile) {
            __inventory.push(objectName);
            map._removeItemFromMap(__x, __y, objectName);
            map._playSound('pickup');
        } else if (object.type === 'trap') {
            if (object.deactivatedBy && object.deactivatedBy.indexOf(__type) > -1) {
                if (typeof(object.onDeactivate) === 'function') {
                    __game.validateCallback(function(){
                            object.onDeactivate();
                    });
                }
                map._removeItemFromMap(__x, __y, objectName);
            }
        }
    };

    this._destroy = function (onMapReset) {
        if (__game._isPlayerCodeRunning()) { throw 'Forbidden method call: object._destroy()';}

        var me = this;

        __destroyed = true;
        clearInterval(__timer);

       
        map._refreshDynamicObjects();
        if (__definition.onDestroy && !onMapReset) {
            if (!__definition.projectile) {
                map._playSound('explosion');
            }

            map._validateCallback(function () {
                __definition.onDestroy(me);
            });
        }
    };

    this.getX = function () { return __x; };
    this.getY = function () { return __y; };
    this.getType = function () { return __type; };
    this.isDestroyed = function () { return __destroyed; };

    this.giveItemTo = wrapExposedMethod(function (player, itemType) {
        var pl_at = player.atLocation;

        if (!(pl_at(__x, __y) || pl_at(__x+1, __y) || pl_at(__x-1, __y) ||
                pl_at(__x, __y+1) || pl_at(__x, __y-1))) {
            throw (type + ' says: Can\'t give an item unless I\'m touching the player!');
        }
        if (__inventory.indexOf(itemType) < 0) {
            throw (type + ' says: I don\'t have that item!');
        }

        player._pickUpItem(itemType, map._getObjectDefinition(itemType));
    }, this);

    this.move = wrapExposedMethod(function (direction) {
        var dest = this._computeDestination(__x, __y, direction);

        if (!__myTurn) {
            throw 'Can\'t move when it isn\'t your turn!';
        }

        var nearestObj = map._findNearestToPoint("anyDynamic", dest.x, dest.y);

    
        if (map.getPlayer().atLocation(dest.x, dest.y) &&
                (__definition.onCollision || __definition.projectile)) {
          
            if (__definition.projectile) {
              
                map.getPlayer().killedBy('a ' + __type);
            } else {
                var thing = this;
                map._validateCallback(function() {
                    __definition.onCollision(map.getPlayer(), thing);
                });
            }
        } else if (map._canMoveTo(dest.x, dest.y, __type) &&
                !map._isPointOccupiedByDynamicObject(dest.x, dest.y)) {
           
            __x = dest.x;
            __y = dest.y;
            this._afterMove(__x, __y);
        } else {
           
            if (__definition.projectile) {
                this._destroy();

                if (map._isPointOccupiedByDynamicObject(dest.x, dest.y)) {
                    map._findDynamicObjectAtPoint(dest.x, dest.y)._destroy();
                }
            }
        }

        __myTurn = false;
    }, this);

    this.canMove = wrapExposedMethod(function (direction) {
        var dest = this._computeDestination(__x, __y, direction);

        return (map._canMoveTo(dest.x, dest.y, __type) &&
            !map._isPointOccupiedByDynamicObject(dest.x, dest.y));
    }, this);

    this.findNearest = wrapExposedMethod(function (type) {
        return map._findNearestToPoint(type, __x, __y);
    }, this);

   
    this.setTarget = wrapExposedMethod(function (target) {
        if (__type != 'teleporter') {
            throw 'setTarget() can only be called on a teleporter!';
        }

        if (target === this) {
            throw 'Teleporters cannot target themselves!';
        }

        this.target = target;
    }, this);

   
    __game.secureObject(this, type);


    if (!map._dummy && __definition.interval) {
        this._onTurn();
    }

}
