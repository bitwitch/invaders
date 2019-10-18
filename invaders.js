// usage: 
// var invaders = new Game(oldHtml);
// invaders.run();

var WINDOW_HEIGHT = 800;
var WINDOW_WIDTH = WINDOW_HEIGHT * 3 / 4;

function randInt(min, max) {
  min = Math.ceil(min);
  max = Math.floor(max);
  return Math.floor(Math.random() * (max - min)) + min;
}

function lerp(a, b, amount) {
    return a + amount * (b - a);
}

// distance between two points
function distance(a, b) {
    var x = b.x - a.x;
    var y = b.y - a.y;
    return Math.sqrt(x*x + y*y)
}

function Game(prevHtml) {
    this.prevHtml = prevHtml;    
    this.running = true;
    this.input = {
        'left' : false,
        'right': false,
        'fire' : false
    };
    this.spritePaths = {
        'spritesheet': 'spritesheet.png',
    };
    this.sprites = {
        'spritesheet': null,
    };
    this.player = null;
    this.enemyFormation = null;
    this.starfield = null;
    this.prevFrame = 0;
}

Game.prototype.handleKeyDown = function (e) {
    if (e.key === 'Escape') {
        this.die();
        return;
    }

    switch(e.key) {
    case "ArrowLeft":
        this.input.left = true;
        break;
    case "ArrowRight":
        this.input.right = true;
        break;
    case " ": // spacebar
        this.input.fire = true;
        break;
    }
}

Game.prototype.handleKeyUp = function (e) {
    switch(e.key) {
    case "ArrowLeft":
        this.input.left = false;
        break;
    case "ArrowRight":
        this.input.right = false;
        break;
    case " ": // spacebar
        this.input.fire = false;
        break;
    }
}

Game.prototype.update = function(dt) {
    this.player.update(this.input, this.enemyFormation.enemies, dt);
    this.enemyFormation.update(dt);
    this.starfield.update(dt);
}

Game.prototype.draw = function(ctx) {
    ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height);
    this.starfield.draw(ctx);
    this.player.draw(ctx);
    this.enemyFormation.draw(ctx);
}

// to be called externally to run game
Game.prototype.run = function(prevHtml) {
    //WINDOW_HEIGHT = $(window).height() - 200; 
    WINDOW_HEIGHT = window.innerHeight - 15; 

    WINDOW_WIDTH = WINDOW_HEIGHT * 3 / 4;

    var canvas = document.getElementById('canvas');
    canvas.width = WINDOW_WIDTH;
    canvas.height = WINDOW_HEIGHT; 
    var ctx = canvas.getContext('2d');

    document.addEventListener('keydown', this.handleKeyDown.bind(this));
    document.addEventListener('keyup', this.handleKeyUp.bind(this));

    this.prevFrame = Date.now();    
    
    this.loadAndRun(this.spritePaths, this.loop.bind(this, ctx));
}

Game.prototype.loadAndRun = function(spritePaths, callback) {
    var totalLoaded = 0;

    this.starfield = new Starfield();
    this.starfield.fill();

    // create player 
    this.player = new Player(canvas.width/2, canvas.height - 100); 
    this.player.gameOver = this.gameOver;

    // create enemies
    this.enemyFormation = new Formation();
    this.enemyFormation.player = this.player;

    var spritesheet = new Image();
    spritesheet.src = spritePaths.spritesheet; 

    spritesheet.onload = function () {
        this.sprites.spritesheet = spritesheet;
        this.player.spritesheet = spritesheet;
        this.enemyFormation.spritesheet = spritesheet;

        this.enemyFormation.add(new Enemy(
            spritesheet, randInt(0, 4), 100, 50, Math.random()*0.2 + 0.2));
        this.enemyFormation.add(new Enemy(
            spritesheet, randInt(0, 4), 200, 50, Math.random()*0.2 + 0.2));
        this.enemyFormation.add(new Enemy(
            spritesheet, randInt(0, 4), 300, 50, Math.random()*0.2 + 0.2));
        this.enemyFormation.add(new Enemy(
            spritesheet, randInt(0, 4), 400, 50, Math.random()*0.2 + 0.2));
        this.enemyFormation.add(new Enemy(
            spritesheet, randInt(0, 4), 500, 50, Math.random()*0.2 + 0.2));

        var enemies = this.enemyFormation.enemies;
        var i, col, row;
        for (i=0; i<enemies.length; i++) {
            col = i % 5;
            row = Math.floor(i / 5);
            enemies[i].formationTarget.x = 100 * col; 
            enemies[i].formationTarget.y = 100 * row; 
        }

        //this.enemyFormation.add(new Enemy(spritesheet, randInt(0, 4), 100, 900)),
        //this.enemyFormation.add(new Enemy(spritesheet, randInt(0, 4), 200, 900)),
        //this.enemyFormation.add(new Enemy(spritesheet, randInt(0, 4), 300, 1020)),
        //this.enemyFormation.add(new Enemy(spritesheet, randInt(0, 4), 400, 900)),
        //this.enemyFormation.add(new Enemy(spritesheet, randInt(0, 4), 500, 900))

        if (++totalLoaded >= Object.keys(spritePaths).length) {
            callback();
        }
    }.bind(this);

}

Game.prototype.gameOver = function () {
    console.log("GAME OVER!");
    this.running = false;
}

Game.prototype.die = function() {
    this.running = false;
    // return page to its state before starting game
    //$('main').html(this.prevHtml);
    //$('main').css('text-align', '');
}

Game.prototype.loop = function(ctx) {
    if (this.running) {
        window.requestAnimationFrame(this.loop.bind(this, ctx));
    }

    var thisFrame = Date.now();
    var dt = thisFrame - this.prevFrame;
    this.prevFrame = thisFrame;

    this.update(dt);
    this.draw(ctx);
}

// Player
// ---------------------------------------------------------------------------
function Player(x, y) {
    this.x = x;
    this.y = y;
    this.w = 50;
    this.h = 50;
    this.spritesheet = null;

    this.shipX = 184;
    this.shipY = 55;
    this.shipW = 16;
    this.shipH = 16;

    this.explosionX = 205;
    this.explosionY = 43;
    this.explosionW = 40;
    this.explosionH = 40;

    this.frame = 0;
    this.totalFrames = 4;
    this.curFrameTime = 0;
    this.timePerFrame = 300; // milliseconds

    this.states = {
        "NORMAL":  0,
        "EXPLODE":  1,
    };
    this.state = 0;

    this.enemies = null;
    this.speed = 0.3;
    this.canFire = true;
    this.reloadTime = 250;
    this.bullets = [];
    this.bulletSpeed = 0.5;
    this.bulletX = 366; 
    this.bulletY = 195; 
    this.bulletW = 3; 
    this.bulletH = 8; 

    this.gameOver = null; // game over function to be assigned
}

Player.prototype.draw = function(ctx) {

    if (this.state == this.states.NORMAL) {
        ctx.drawImage(this.spritesheet,
            this.shipX, this.shipY, this.shipW, this.shipH,
            this.x, this.y, this.w, this.h
        );
    } else {
        ctx.drawImage(this.spritesheet,
            this.explosionX + (this.frame * this.explosionW), this.explosionY, 
            this.explosionW, this.explosionH,
            this.x, this.y, this.w, this.h
        );
    }

    for (var i=0; i<this.bullets.length; i++) {
        ctx.drawImage(this.spritesheet,
            this.bulletX, this.bulletY, this.bulletW, this.bulletH,
            this.bullets[i].x, this.bullets[i].y, 8, 24);
    }
}

Player.prototype.update = function(input, enemies, dt) {
    switch(this.state) {
    case this.states.NORMAL: 
        this.updateNormal(input, enemies, dt);
        break;
    case this.states.EXPLODE: 
        this.explode(dt);
        break;
    }
}

Player.prototype.updateNormal = function(input, enemies, dt) {
    // Move Left
    if (input.left && !input.right) {
        this.x -= this.speed * dt; 
        // left wall collision
        if (this.x <= 0) { this.x = 0; }
    }  

    // Move right
    if (input.right && !input.left) {
        this.x += this.speed * dt; 
        // right wall collision
        if (this.x + this.w >= WINDOW_WIDTH) { 
            this.x = WINDOW_WIDTH - this.w; 
        }
    }  
    
    // Fire
    if (input.fire && this.canFire && this.bullets.length < 2) {
        this.canFire = false;
        setTimeout(function() {
            this.canFire = true;
        }.bind(this), this.reloadTime);

        this.bullets.push({ 
            x: -8 + this.x + this.w/2, 
            y: this.y });
    }

    // Bullet update
    var i, j;
    for (i=0; i<this.bullets.length; i++) {
        var bullet = this.bullets[i];

        bullet.y -= this.bulletSpeed * dt;
        if (bullet.y < 0) {
            this.bullets.splice(i, 1);
        }
    }

    for (j=0; j<enemies.length; j++) {
        var enemy = enemies[j];

        // player collisions
        if (// top left
            (this.x >= enemy.x && 
            this.x <= enemy.x + enemy.w && 
            this.y >= enemy.y && 
            this.y <= enemy.y + enemy.h) ||
            // top right
            (this.x + this.w >= enemy.x && 
            this.x + this.w <= enemy.x + enemy.w &&
            this.y >= enemy.y && 
            this.y <= enemy.y + enemy.h) ||
            // bottom left
            (this.x >= enemy.x && 
            this.x <= enemy.x + enemy.w &&
            this.y + this.h >= enemy.y && 
            this.y + this.h <= enemy.y + enemy.h) ||
            // bottom right
            (this.x + this.w >= enemy.x && 
            this.x + this.w <= enemy.x + enemy.w &&
            this.y + this.h >= enemy.y && 
            this.y + this.h <= enemy.y + enemy.h)
        ) {
            this.state = this.states.EXPLODE;
        }

        // bullet collisions
        for (i=0; i<this.bullets.length; i++) {
            var bullet = this.bullets[i];
            if (// top left
                (bullet.x >= enemy.x && 
                bullet.x <= enemy.x + enemy.w && 
                bullet.y >= enemy.y && 
                bullet.y <= enemy.y + enemy.h) ||
                // top right
                (bullet.x + bullet.w >= enemy.x && 
                bullet.x + bullet.w <= enemy.x + enemy.w &&
                bullet.y >= enemy.y && 
                bullet.y <= enemy.y + enemy.h) ||
                // bottom left
                (bullet.x >= enemy.x && 
                bullet.x <= enemy.x + enemy.w &&
                bullet.y + bullet.h >= enemy.y && 
                bullet.y + bullet.h <= enemy.y + enemy.h) ||
                // bottom right
                (bullet.x + bullet.w >= enemy.x && 
                bullet.x + bullet.w <= enemy.x + enemy.w &&
                bullet.y + bullet.h >= enemy.y && 
                bullet.y + bullet.h <= enemy.y + enemy.h)
            ) {
                this.bullets.splice(i, 1);
                //enemies.splice(j, 1);
                enemies[j].state = enemy.states.EXPLODE;
            }
        }
    }


}

Player.prototype.explode = function(dt) {
    // Animate
    this.curFrameTime += dt;
    if (this.curFrameTime > this.timePerFrame) {
        this.frame++;
        this.curFrameTime = 0;
        if (this.frame >= this.totalFrames)
            this.gameOver();
    }
}

// Enemy
// ---------------------------------------------------------------------------
function Enemy(spritesheet, spriteIndex, x, y, scrambleSpeed = 0.32) {
    this.spritesheet = spritesheet;
    this.x = x;
    this.y = y;
    this.w = 50;
    this.h = 50;

    this.spriteIndex = spriteIndex % 4; // which enemy sprite to use
    this.spriteOffY = 24; // these sprites need a 24px vertical offset between 
    this.spriteX = 184;
    this.spriteY = 103; // 103, 127, 151, 175
    this.spriteW = 16;
    this.spriteH = 16;

    this.explosionX = 196;
    this.explosionY = 186;
    this.explosionW = 40;
    this.explosionH = 40;

    this.frame = 0;
    this.totalFrames = 4;
    this.curFrameTime = 0;
    this.timePerFrame = 200; // milliseconds

    this.speed = 0.08;
    this.scrambleSpeed = scrambleSpeed;
    this.canFire = true;
    this.reloadTime = 4000;
    this.bullets = [];
    this.bulletSpeed = 0.5;

    this.states = {
        "NORMAL": 0,
        "EXPLODE": 1
    };
    this.state = 0; 

    this.numMoves = 0;
    this.moveTarget = { x: 0, y: 0 };
    this.formationTarget = { x: 0, y: 0 };
    this.inFormation = false;
}

Enemy.prototype.draw = function(ctx) {
    if (this.state == this.states.EXPLODE) {
        ctx.drawImage(this.spritesheet,
            this.explosionX + (this.frame * this.explosionW), this.explosionY, 
            this.explosionW, this.explosionH,
            this.x, this.y, this.w, this.h
        );
    } else {
        ctx.drawImage(this.spritesheet,
            this.spriteX, this.spriteY + (this.spriteIndex * this.spriteOffY), 
            this.spriteW, this.spriteH,
            this.x, this.y, this.w, this.h
        );
    }

    //for (var i=0; i<this.bullets.length; i++) {
        //ctx.drawImage(
            //this.bulletSprite,
            //this.bullets[i].x,
            //this.bullets[i].y,
            //15,
            //15
        //);
    //}
}

function Formation() {
    this.enemies = [];
    this.player = null;
    this.spritesheet = null;
    this.direction = 1;
    this.states = {
        "LATERAL":  0,
        "ADVANCE":  1,
        "SCRAMBLE": 2
    };
    this.state = 2;
    this.movesPerScramble = 3;
}

Formation.prototype.add = function(enemy) {
    this.enemies.push(enemy);
}

Formation.prototype.update = function(dt) {

    // Add more enemies if there are very few
    if (this.enemies.length < 3) {

        var start = this.enemies.length;

        this.add(new Enemy(
            this.spritesheet, randInt(0, 4), 100, 50, Math.random()*0.2 + 0.2));
        this.add(new Enemy(
            this.spritesheet, randInt(0, 4), 200, 50, Math.random()*0.2 + 0.2));
        this.add(new Enemy(
            this.spritesheet, randInt(0, 4), 300, 50, Math.random()*0.2 + 0.2));
        this.add(new Enemy(
            this.spritesheet, randInt(0, 4), 400, 50, Math.random()*0.2 + 0.2));
        this.add(new Enemy(
            this.spritesheet, randInt(0, 4), 500, 50, Math.random()*0.2 + 0.2));


        var i, col, row;
        for (i = start; i<this.enemies.length; i++) {
            col = i % 5;
            row = Math.floor(i / 5);
            this.enemies[i].formationTarget.x = 100 * col; 
            this.enemies[i].formationTarget.y = 100 * row; 
        }


    }

    switch(this.state) {
    case this.states.LATERAL:
        this.lateral(dt);
        break;
    case this.states.ADVANCE:
        this.advance(dt);
        break;
    case this.states.SCRAMBLE:
        this.scramble(dt);
        break;
    }

    for (var i=0; i<this.enemies.length; i++) {
        var enemy = this.enemies[i];
        if (enemy.state == enemy.states.EXPLODE) {
            enemy.curFrameTime += dt;
            if (enemy.curFrameTime > enemy.timePerFrame) {
                enemy.frame++;
                enemy.curFrameTime = 0;
                if (enemy.frame >= enemy.totalFrames)
                    this.enemies.splice(i, 1);
            }
                   
        }
    }
}

Formation.prototype.lateral = function(dt) {
    for (var i=0; i<this.enemies.length; i++) {
        var enemy = this.enemies[i];
        if (enemy.state != enemy.states.NORMAL) continue;
        
        enemy.x += enemy.speed * dt * this.direction;

        // change dir when rightmost enemy hits boundary
        if (enemy.x + enemy.w > WINDOW_WIDTH) {
            enemy.x = WINDOW_WIDTH - enemy.w;
            this.direction *= -1;
            this.state = this.states.ADVANCE;
        }
        // change dir when leftmost enemy hits boundary
        if (enemy.x < 0) {
            enemy.x = 0
            this.direction *= -1;
            this.state = this.states.ADVANCE;
        }
    }
}

Formation.prototype.advance = function(dt) {
    for (var i=0; i<this.enemies.length; i++) {
        var enemy = this.enemies[i];
        if (enemy.state != enemy.states.NORMAL) continue;
        enemy.y += enemy.h;        
    }
    this.state = this.states.LATERAL;
}

// TODO(shaw): figure this shit out
Formation.prototype.scramble = function(dt) {
    if (!this.scrambled) {
        for (var i=0; i<this.enemies.length; i++) {
            var enemy = this.enemies[i];
            enemy.moveTarget = {
                x: randInt(0, WINDOW_WIDTH),
                y: randInt(0, WINDOW_HEIGHT)
            };
            enemy.inFormation = false;
        }
        this.scrambled = true;

    } else {
        
        var inFormation = true;
        for (var i=0; i<this.enemies.length; i++) {
            var enemy = this.enemies[i];

            var dist = distance( { x: enemy.x, y: enemy.y }, 
                                 { x: enemy.moveTarget.x, y: enemy.moveTarget.y });
            
            if (!enemy.inFormation) {
                inFormation = false;

                if (dist < 10) {
                    enemy.numMoves++;
                    if (enemy.numMoves > this.movesPerScramble) {
                        enemy.moveTarget = enemy.formationTarget;
                    } else {
                        enemy.moveTarget = {
                            x: randInt(0, WINDOW_WIDTH),
                            y: randInt(0, WINDOW_HEIGHT)
                        };
                    }
                }

                dist = distance( { x: enemy.x, y: enemy.y }, 
                    { x: enemy.formationTarget.x, y: enemy.formationTarget.y });

                if (dist < 10) {
                    enemy.inFormation = true;
                }

                // lerp towards moveTarget
                var lerpAmount = enemy.scrambleSpeed * dt / dist;
                enemy.x = lerp(enemy.x, enemy.moveTarget.x, lerpAmount);
                enemy.y = lerp(enemy.y, enemy.moveTarget.y, lerpAmount);
            }
        }

        // if all back in formation, exit scramble state
        if (inFormation) {
            this.scrambled = false;
            this.state = this.states.LATERAL;
        }
        
    }
}

Formation.prototype.draw = function(ctx) {
    for (var i=0; i<this.enemies.length; i++) {
        this.enemies[i].draw(ctx);
    }
}

// Starfield
// ---------------------------------------------------------------------------
function Starfield() {
    this.moving = true;
    this.stars = [];    
    this.maxStars = 200;
    this.colors = [
        '#861111',
        '#88199A',
        '#196920',
        '#051b71',
        '#AFB746',
        '#46ABB7',
        '#B75C46',
    ];
    this.speed = 0.2;
}

Starfield.prototype.update = function(dt) {

    if (!this.moving) return;

    for (i=0; i<this.stars.length; i++) {
        var star = this.stars[i];
        star.y += this.speed * star.r * dt;
        if (star.y > WINDOW_HEIGHT) {
            star.y = randInt(-20, -10);
            star.x = randInt(0, WINDOW_WIDTH);
        }
    }
}

Starfield.prototype.draw = function(ctx) {
    for (i=0; i<this.stars.length; i++) {
        var star = this.stars[i];
        ctx.beginPath();
        ctx.arc(star.x, star.y, star.r, 0, 2*Math.PI);
        ctx.fillStyle = star.color;
        ctx.fill();
    }
}

Starfield.prototype.fill = function() {
    var numStars = 200;
    var i, x, r, color;
    for (i=0; i<numStars; i++) {
        x = randInt(0, WINDOW_WIDTH);
        y = randInt(0, WINDOW_HEIGHT);
        r = Math.random() * 3.6;
        color = this.colors[randInt(0, this.colors.length)];
        this.stars.push(new Star(x, y, r, color));
    }
}

function Star(x, y, r, color) {
    this.x = x;
    this.y = y;
    this.r = r;
    this.color = color;
    this.blinkTime;
    this.curTime;
}


////////
var invaders = new Game("<div>GAME OVER</div>");
invaders.run();


