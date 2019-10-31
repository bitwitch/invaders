// usage: 
// var invaders = new Game(oldHtml);
// invaders.run();

var WINDOW_HEIGHT = 800;
var WINDOW_WIDTH = WINDOW_HEIGHT * 3 / 4;

var elapsedTime = 0;
var debug = false;

var flyInPath = [];

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

function subVector(a, b) {
    return {
        x: a.x - b.x,
        y: a.y - b.y
    }
}

function multVector(a, scalar) {
    return {
        x: a.x * scalar,
        y: a.y * scalar
    }
}

function normVector(a) {
    var mag = magVector(a);
    return {
        x: a.x / mag,
        y: a.y / mag
    }
}

function magVector(a) {
    return Math.sqrt(a.x*a.x + a.y*a.y);
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
        'spritesheet': 'index.php?img=images/spritesheet.png',
    };
    //this.sprites = {
        //'spritesheet': null,
    //};
    this.spritesheet = null;
    this.player = null;
    
    this.formation = null;
    this.enemies = [];

    this.starfield = null;
    this.prevFrame = 0;
}

// external API to run game
Game.prototype.run = function(prevHtml) {
    WINDOW_HEIGHT = $(window).height() - 200; 
    WINDOW_WIDTH = WINDOW_HEIGHT * 3 / 4;

    var canvas = document.getElementById('canvas');
    canvas.width = WINDOW_WIDTH;
    canvas.height = WINDOW_HEIGHT; 
    var ctx = canvas.getContext('2d');

    var midX = WINDOW_WIDTH/2;

    // generate sampled path for fly in 
    var flyInBezier = new BezierPath();

    flyInBezier.addCurve(new BezierCurve(
        { x: 0.5, y: -0.01 },
        { x: 0.5, y: -0.02 },
        { x: 0.5, y: 0.03  },
        { x: 0.5, y: 0.02  }),
        1);
    flyInBezier.addCurve(new BezierCurve(
        { x: 0.5,   y: 0.02  },
        { x: 0.5,   y: 0.1   },
        { x: 0.086, y: 0.28 },
        { x: 0.086, y: 0.366 }),
        25);
    flyInBezier.addCurve(new BezierCurve(
        { x: 0.086, y: 0.366 },
        { x: 0.086, y: 0.56 },
        { x: 0.374, y: 0.56 },
        { x: 0.374, y: 0.366 }),
        25);

    flyInBezier.sample(flyInPath);

    document.addEventListener('keydown', this.handleKeyDown.bind(this));
    document.addEventListener('keyup', this.handleKeyUp.bind(this));

    this.prevFrame = Date.now();    
    
    this.loadAndRun(this.spritePaths, this.loop.bind(this, ctx));
}

Game.prototype.handleKeyDown = function (e) {
    if (e.key === 'Escape') {
        this.quit();
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

Game.prototype.update = function(dt, ctx) {
    this.player.update(this.input, this.formation.enemies, dt, ctx);
    this.formation.update(dt, ctx);
    this.starfield.updateAndDraw(dt, ctx);
}

Game.prototype.draw = function(ctx) {
    this.player.draw(ctx);
    this.formation.draw(ctx);
}

Game.prototype.loadAndRun = function(spritePaths, callback) {
    var totalLoaded = 0;

    this.starfield = new Starfield();
    this.starfield.fill();

    // create player 
    this.player = new Player(canvas.width/2, canvas.height - 100); 
    this.player.gameOver = this.gameOver;

    // create formation
    this.formation = new Formation();
    this.formation.player = this.player;

    var spritesheet = new Image();
    spritesheet.src = spritePaths.spritesheet; 

    spritesheet.onload = function () {
        this.spritesheet = spritesheet;
        this.player.spritesheet = spritesheet;
        this.formation.spritesheet = spritesheet;

        // create enemies
        this.formation.initEnemies(spritesheet);

        if (++totalLoaded >= Object.keys(spritePaths).length) {
            callback();
        }

    }.bind(this);

}

Game.prototype.gameOver = function () {
    console.log("GAME OVER!");
}

Game.prototype.quit = function() {
    this.running = false;
    // return page to its state before starting game
    $('main').html(this.prevHtml);
    $('main').css('text-align', '');
}

Game.prototype.loop = function(ctx) {
    if (this.running) {
        window.requestAnimationFrame(this.loop.bind(this, ctx));
    }

    var thisFrame = Date.now();
    var dt = thisFrame - this.prevFrame;
    this.prevFrame = thisFrame;

    elapsedTime += dt;

    // clear screen must happen here so that particle systems 
    // can update AND draw from calls to player.update and formation.update
    ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height);

    this.update(dt, ctx);
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

    this.lives = 100;

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

    this.firstCall = true;

    this.states = {
        "NORMAL":  0,
        "EXPLODE":  1,
    };
    this.state = 0;

    //this.enemies = null;
    this.speed = 0.3;
    this.canFire = true;
    this.reloadTime = 250;
    this.bullets = [];
    this.bulletSpeed = 0.5;
    this.bulletX = 366; 
    this.bulletY = 195; 
    this.bulletW = 3; 
    this.bulletH = 8; 

    this.deadTime = 0;
    this.respawnTime = 2000;

    this.particleSystem = null;
    this.gameOver = null; // game over function to be assigned
}

Player.prototype.draw = function(ctx) {
    if (this.state == this.states.NORMAL) {
        ctx.drawImage(this.spritesheet,
            this.shipX, this.shipY, this.shipW, this.shipH,
            this.x, this.y, this.w, this.h
        );
    }

    for (var i=0; i<this.bullets.length; i++) {
        ctx.drawimage(this.spritesheet,
            this.bulletx, this.bullety, this.bulletw, this.bulleth,
            this.bullets[i].x, this.bullets[i].y, 8, 24);
    }
}

Player.prototype.update = function(input, enemies, dt, ctx) {
    switch(this.state) {
    case this.states.NORMAL: 
        this.updateNormal(input, enemies, dt);
        break;
    case this.states.EXPLODE: 
        this.explode(dt, ctx);
        break;
    }
}

Player.prototype.updateNormal = function(input, enemies, dt, ctx) {
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
            y: this.y,
            r: 5 
        });
    }

    var i, j, bullet, enemy;

    // Bullet update
    for (i=0; i<this.bullets.length; i++) {
        bullet = this.bullets[i];

        bullet.y -= this.bulletSpeed * dt;
        if (bullet.y < 0) {
            this.bullets.splice(i, 1);
        }
    }

    for (j=0; j<enemies.length; j++) {
        enemy = enemies[j];
        if (enemy.state == enemy.states.EXPLODE) continue;

    // player/enemy collisions
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
            this.particleSystem = new ParticleSystem(this.x+this.w/2, this.y+this.h/2);
            this.state = this.states.EXPLODE;
        }

    // enemy-bullet/player collisions
        for (i=0; i<enemy.bullets.length; i++) {
            bullet = enemy.bullets[i];
            if (// top left
                (bullet.x >= this.x && 
                bullet.x <= this.x + this.w && 
                bullet.y >= this.y && 
                bullet.y <= this.y + this.h) ||
                // top right
                (bullet.x + bullet.w >= this.x && 
                bullet.x + bullet.w <= this.x + this.w &&
                bullet.y >= this.y && 
                bullet.y <= this.y + this.h) ||
                // bottom left
                (bullet.x >= this.x && 
                bullet.x <= this.x + this.w &&
                bullet.y + bullet.h >= this.y && 
                bullet.y + bullet.h <= this.y + this.h) ||
                // bottom right
                (bullet.x + bullet.w >= this.x && 
                bullet.x + bullet.w <= this.x + this.w &&
                bullet.y + bullet.h >= this.y && 
                bullet.y + bullet.h <= this.y + this.h)
            ) {
                enemy.bullets.splice(i, 1);
                this.particleSystem = new ParticleSystem(this.x+this.w/2, 
                                                         this.y+this.h/2);
                this.state = this.states.EXPLODE;
            }

        }

    // player-bullet/enemy collisions
        for (i=0; i<this.bullets.length; i++) {
            bullet = this.bullets[i];
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

                enemy.particleSystem = new ParticleSystem(enemy.x+enemy.w/2, 
                                                          enemy.y+enemy.h/2);

                enemy.state = enemy.states.EXPLODE;
            }
        }
    }


}

Player.prototype.explode = function(dt, ctx) {

    if (this.firstCall) {
        this.lives--;
        this.firstCall = false;
    }
        
    this.deadTime += dt;

    // Animate particle system
    if (this.particleSystem) {
        this.particleSystem.run(dt, ctx);

        if (this.particleSystem.particles.length == 0) {
            this.particleSystem = null;
        }
    }

    if (this.lives > 0 && this.deadTime > this.respawnTime) {
        this.deadTime = 0;
        this.firstCall = true;
        this.state = this.states.NORMAL;
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

    this.spriteIndex = spriteIndex % 10; // which enemy sprite to use
    this.spriteOffY = 24; // these sprites need a 24px vertical offset between 
    this.spriteX = 160;
    this.spriteY = 103; // 103, 127, 151, 175, ...
    this.spriteW = 16;
    this.spriteH = 16;

    this.particleSystem = null;

    this.frame = 0;
    this.totalFrames = 4;
    this.curFrameTime = 0;
    this.timePerFrame = 200; // milliseconds

    this.speed = 0.16;
    this.diveSpeed = 0.419;
    this.scrambleSpeed = scrambleSpeed;
    this.movesPerScramble = 3;

    this.canFire = true;
    this.reloadTime = 4000;
    this.bullets = [];
    this.bulletSpeed = 0.5;
 
    this.states = {
        "FLY_IN":         0,
        "LATERAL":        1,
        "SCRAMBLE":       2,
        "DIVE":           3,
        "JOIN_FORMATION": 4,
        "EXPLODE":        5,
    };
    this.state = 0; 

    this.formation = null;
    this.numMoves = 0;
    this.moveTarget = { x: 0, y: 0 };
    this.formationTarget = { x: 0, y: 0 };
    this.inFormation = false;

    this.curWait = 0;
    this.diveTime = 0;
    this.maxDive = 4000;

    this.paths = [];
    this.currentPath = 0;
    this.currentWaypoint = 0;
}

Enemy.prototype.draw = function(ctx) {
   // draw enemy
   if (this.state != this.states.EXPLODE) {

        ctx.drawImage(this.spritesheet,
            this.spriteX, this.spriteY + (this.spriteIndex * this.spriteOffY), 
            this.spriteW, this.spriteH,
            this.x, this.y, this.w, this.h);
    }

    // draw bullets
    for (var i=0; i<this.bullets.length; i++) {
        ctx.beginPath();
        ctx.arc(this.bullets[i].x, this.bullets[i].y, this.bullets[i].r, 0, 2*Math.PI);
        ctx.fillStyle = '#55FF5C';
        ctx.fill();
    }

    if(debug) {
    // draw current path
        var path = this.state == this.states.FLY_IN 
            ? flyInPath 
            : this.paths[this.currentPath]; 

        if (path) {
            ctx.moveTo(this.x, this.y);
            ctx.beginPath();
            for (var i=0; i < path.length-1; i++) {
                ctx.lineTo(path[i].x, path[i].y); 
            }
            ctx.stroke();
        }
    }
}

Enemy.prototype.fire = function() {
    if (this.canFire && this.bullets.length < 2) {
        setTimeout(function() {
            this.canFire = true;
        }.bind(this), this.reloadTime);

        this.bullets.push({ 
            x: -8 + this.x + this.w/2,
            y: this.y + this.h,
            r: 5 
        });
    }
}

Enemy.prototype.createDivePath = function() {
    var bezierPath = new BezierPath();

    bezierPath.addCurve(new BezierCurve(
        { x: 0,   y: 0   },
        { x: 0,   y: -45 },
        { x: -60, y: -45 },
        { x: -60, y: 0   }),
        15);

    bezierPath.addCurve(new BezierCurve(
        { x: -60, y: 0   },
        { x: -60, y: 80  },
        { x: 0,   y: 150 },
        { x: 100, y: 150 }),
        15);

    bezierPath.addCurve(new BezierCurve(
        { x: 100, y: 150 },
        { x: 250, y: 150 },
        { x: 350, y: 200 },
        { x: 350, y: 350 }),
        15);
 
    bezierPath.addCurve(new BezierCurve(
        { x: 350, y: 350 },
        { x: 350, y: 575 },
        { x: 100, y: 575 },
        { x: 100, y: 350 }),
        15);

    var path = [];
    bezierPath.sample(path);
    this.paths.push(path);
}

Enemy.prototype.update = function(dt, ctx) {
    switch(this.state) {
    case this.states.FLY_IN:
        this.flyIn(dt);
        break;
    case this.states.JOIN_FORMATION:
        this.joinFormation(dt);
        break;
    case this.states.LATERAL:
        // lateral handled by formation
        break;
    case this.states.SCRAMBLE:
        this.scramble(dt);
        break;
    case this.states.DIVE:
        this.dive(dt);
        break;
    case this.states.EXPLODE:
        this.explode(dt, ctx);
        break;
    }

    // random chance at firing bullet
    if (Math.random() < 0.008) {
        this.fire();
    }

    // bullets update
    var i;
    for (i=0; i<this.bullets.length; i++) {
        var bullet = this.bullets[i];

        bullet.y += this.bulletSpeed * dt;
        if (bullet.y > WINDOW_HEIGHT) {
            this.bullets.splice(i, 1);
        }
    }
}

Enemy.prototype.flyIn = function(dt) {
    if (this.currentWaypoint < flyInPath.length) {
        // head towards current waypoint
        var dist = subVector(flyInPath[this.currentWaypoint], {x: this.x, y: this.y});
        var move = multVector(normVector(dist), this.diveSpeed*dt);

        this.x += move.x; this.y += move.y;

        if (magVector(dist) < 8.0) {
            this.currentWaypoint++;
        }

    } else {
        this.state = this.states.JOIN_FORMATION;
    }
}

// moves enemy in formation direction
// returns true on window collision, false otherwise
Enemy.prototype.lateral = function(dt, dir) {
    this.x += this.speed * dt * dir; 

    if (this.x + this.w > WINDOW_WIDTH || this.x < 0) {
        this.x -= this.speed * dt * dir; 
        return true;
    }

    return false;
}

Enemy.prototype.scramble = function(dt) {
    var dist = distance( { x: this.x, y: this.y }, 
                         { x: this.moveTarget.x, y: this.moveTarget.y });

    if (dist < 1) {
        this.numMoves++;
        if (this.numMoves > this.movesPerScramble) {
            this.state = this.states.JOIN_FORMATION;
            this.numMoves = 0;
        } else {
            // wait here for a hot sec
            this.curWait = 2500;

            this.moveTarget = {
                x: randInt(0, WINDOW_WIDTH),
                y: randInt(0, WINDOW_HEIGHT)
            };
        }
    } else {

        if (this.curWait <= 0) {
            // lerp towards moveTarget
            var lerpAmount = this.scrambleSpeed * dt / dist;
            this.x = lerp(this.x, this.moveTarget.x, lerpAmount);
            this.y = lerp(this.y, this.moveTarget.y, lerpAmount);

        } else { // wait
            this.curWait -= dt;
            this.y = this.y + 2*Math.sin(elapsedTime*0.01); // jiggle
        }
    }
}

Enemy.prototype.dive = function(dt) {
    console.log('dive');
}

Enemy.prototype.joinFormation = function(dt) {
    if (!this.inFormation) {
        var dist = subVector(this.formationTarget, {x: this.x, y: this.y});
        var move = multVector(normVector(dist), this.diveSpeed*dt);

        this.x += move.x; this.y += move.y;

        if (magVector(dist) < 8.0) {
            this.inFormation = true;
        }

    } else {
        switch(this.formation.state) {
        case this.formation.states.LATERAL: 
            this.state = this.states.LATERAL;
            break;
        }
    }
}

Enemy.prototype.explode = function(dt, ctx) {
    // Animate particle system
    if (this.particleSystem) {
        this.particleSystem.run(dt, ctx);

        if (this.particleSystem.particles.length == 0) {
            this.particleSystem = null;
            var index = this.formation.enemies.indexOf(this);
            this.formation.enemies.splice(index, 1);
        }
    }
}

// Formation
// ---------------------------------------------------------------------------
function Formation() {
    this.enemies = [];
    this.direction = 1;
    this.windowCollision = false;
    this.timeSinceRespawn = 0;
    this.respawnTime = 10000;
    this.maxEnemies = 30;

    this.states = {
        "IDLE":     0,
        "LATERAL":  1,
        "ADVANCE":  2,
        "SCRAMBLE": 3,
        "DIVE":     4
    };
    this.state = 0;
}

Formation.prototype.draw = function(ctx) {
    for (var i=0; i < this.enemies.length; i++) {
        this.enemies[i].draw(ctx);
    }
}

Formation.prototype.update = function(dt, ctx) {
    switch(this.state) {
    case this.states.IDLE:
        this.idle(dt);
        break;
    case this.states.LATERAL:
        this.lateral(dt);
        break;
    case this.states.SCRAMBLE:
        this.scramble(dt);
        break;
    }

    // spawn more enemies
    this.timeSinceRespawn += dt;
    if (this.enemies.length < 3 || 
        (this.timeSinceRespawn > this.respawnTime && 
        this.enemies.length < this.maxEnemies))
    {
        this.timeSinceRespawn = 0;
        this.spawnEnemies(5);
    } 

    // update each enemy
    for (var i=0; i < this.enemies.length; i++) {
        this.enemies[i].update(dt, ctx);
    }
}

Formation.prototype.idle = function(dt) {
    var inFormation = true;
    for (var i=0; i<this.enemies.length; i++) {
        if (!this.enemies[i].inFormation) {
            inFormation = false;
            break;
        }
    }
    
    // if all in formation, go to next state
    if (inFormation) {
        this.state = this.states.LATERAL;
        for (var i=0; i<this.enemies.length; i++) 
            this.enemies[i].state = this.enemies[i].states.LATERAL;
    }
}

Formation.prototype.lateral = function(dt) {
    //var inFormation = true;
    //for (var i=0; i<this.enemies.length; i++) {
        //if (!this.enemies[i].inFormation) {
            //inFormation = false;
            //break;
        //}
    //}

    //if (!inFormation)
        //this.state = this.states.IDLE;

    for (var i=0; i<this.enemies.length; i++) {
        var collision = this.enemies[i].lateral(dt, this.direction);        
        if (collision) {
            this.direction *= -1;
            break;
        }
    }

    if (Math.random() < 0.002) {
        this.state = this.states.SCRAMBLE;
    }
}

Formation.prototype.scramble = function(dt) {
    for (var i=0; i<this.enemies.length; i++) {
        this.enemies[i].state = this.enemies[i].states.SCRAMBLE;
        this.enemies[i].inFormation = false;
    }
    this.state = this.states.IDLE;
}

Formation.prototype.initEnemies = function (spritesheet) {
    this.enemies.push(new Enemy(
        spritesheet, randInt(0, 10), -140, -50, Math.random()*0.2 + 0.2));
    this.enemies.push(new Enemy(
        spritesheet, randInt(0, 10), -80, -50, Math.random()*0.2 + 0.2));
    this.enemies.push(new Enemy(
        spritesheet, randInt(0, 10), -20, -50, Math.random()*0.2 + 0.2));
    this.enemies.push(new Enemy(
        spritesheet, randInt(0, 10), 40, -50, Math.random()*0.2 + 0.2));
    this.enemies.push(new Enemy(
        spritesheet, randInt(0, 10), 100, -50, Math.random()*0.2 + 0.2));
    this.enemies.push(new Enemy(
        spritesheet, randInt(0, 10), 160, -50, Math.random()*0.2 + 0.2));
    this.enemies.push(new Enemy(
        spritesheet, randInt(0, 10), 220, -50, Math.random()*0.2 + 0.2));
    this.enemies.push(new Enemy(
        spritesheet, randInt(0, 10), 280, -50, Math.random()*0.2 + 0.2));
    this.enemies.push(new Enemy(
        spritesheet, randInt(0, 10), 340, -50, Math.random()*0.2 + 0.2));
    this.enemies.push(new Enemy(
        spritesheet, randInt(0, 10), 400, -50, Math.random()*0.2 + 0.2));

    var i, col, row;
    for (i=0; i<this.enemies.length; i++) {
        col = i % 5;
        row = Math.floor(i / 5);
        this.enemies[i].formation = this;
        this.enemies[i].formationTarget.x = 100 * col + 25; 
        this.enemies[i].formationTarget.y = 100 * row + 25; 
        this.enemies[i].moveTarget.x = randInt(0, WINDOW_WIDTH);
        this.enemies[i].moveTarget.y = randInt(0, WINDOW_HEIGHT);
    }
}


Formation.prototype.spawnEnemies = function(num) {
    var end = this.enemies.length;
    var i, col, row;
    for (i=0; i<num; i++) {
        var enemy = new Enemy(this.spritesheet, randInt(0, 10), 
            -60*i, -50, Math.random()*0.2 + 0.2);

        col = (end + i) % 5;
        row = Math.floor((end + i) / 5);
        enemy.formation = this;
        enemy.formationTarget.x = 100 * col + 25;
        enemy.formationTarget.y = 100 * row + 25;
        enemy.moveTarget.x = randInt(0, WINDOW_WIDTH);
        enemy.moveTarget.y = randInt(0, WINDOW_HEIGHT);

        this.enemies.push(enemy);
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

Starfield.prototype.updateAndDraw = function(dt, ctx) {

    if (!this.moving) return;

    for (i=0; i<this.stars.length; i++) {
        var star = this.stars[i];

        // update position
        star.y += this.speed * star.r * dt;
        if (star.y > WINDOW_HEIGHT) {
            star.y = randInt(-20, -10);
            star.x = randInt(0, WINDOW_WIDTH);
        }

        // draw
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

// Particle System, Explosion
// ---------------------------------------------------------------------------
function ParticleSystem(x, y) {
    this.origin = { x: x, y: y };
    this.particles = [];
    this.maxParticles = 500;
    this.maxLife = 1000;
    this.lifetime = 0;
}

ParticleSystem.prototype.run = function(dt, ctx) {

    if (this.particles.length < this.maxParticles && this.lifetime < this.maxLife) {
        this.particles.push(new Particle(this.origin.x, this.origin.y));
        this.particles.push(new Particle(this.origin.x, this.origin.y));
        this.particles.push(new Particle(this.origin.x, this.origin.y));
        this.particles.push(new Particle(this.origin.x, this.origin.y));
        this.particles.push(new Particle(this.origin.x, this.origin.y));
        this.particles.push(new Particle(this.origin.x, this.origin.y));
        this.particles.push(new Particle(this.origin.x, this.origin.y));
        this.particles.push(new Particle(this.origin.x, this.origin.y));
        this.particles.push(new Particle(this.origin.x, this.origin.y));
        this.particles.push(new Particle(this.origin.x, this.origin.y));
    }

    var i;
    for (i = this.particles.length-1; i >= 0; i--) {
        var p = this.particles[i];
        // update vel
        p.vel.x += p.acc.x;
        p.vel.y += p.acc.y;
        // update pos
        p.pos.x += p.vel.x;
        p.pos.y += p.vel.y;
        // update lifespan
        p.lifespan -= 3;

        if (p.lifespan < 0) {
            this.particles.splice(i, 1);
        } else {
            ctx.fillStyle = 'rgba('+p.color.r+','+p.color.g+
                ','+p.color.b+','+p.lifespan/255+')';
            ctx.fillRect(p.pos.x, p.pos.y, p.w, p.h);
        }
    }

    this.lifetime += dt;
}

function Particle(x, y) {
    this.acc = { x: 0, y: 0 }; 
    this.vel = { x: Math.random()*2 - 1, y: Math.random()*2 - 1 };
    this.pos = { x: x, y: y };
    this.lifespan = 255;
    this.color = { r: 255, g: Math.floor(Math.random() * 238), b: 0 };
    var size = Math.random()*3;
    this.w = size; 
    this.h = size; 
}

// Bezier Curve 
// ---------------------------------------------------------------------------
function BezierCurve(p0, p1, p2, p3) {
    this.p0 = p0;
    this.p1 = p1;
    this.p2 = p2;
    this.p3 = p3;
}

// calculates a point along a bezier curve
//
// converts from normalized window coords (0 - 1) 
// to window coords (0 - width) (0 - height)
BezierCurve.prototype.calculateCurvePoint = function(t) {
    var tt  = t * t;
    var ttt = tt * t;
    var u   = 1.0 - t;
    var uu  = u * u;
    var uuu = uu * u;

    var point = { x: 0, y: 0 };
    point.x = Math.round( (uuu * this.p0.x * WINDOW_WIDTH) + 
        (3 * uu * t * this.p1.x * WINDOW_WIDTH) + 
        (3 * u * tt * this.p2.x * WINDOW_WIDTH) + 
        (ttt * this.p3.x * WINDOW_WIDTH));
    point.y = Math.round( (uuu * this.p0.y * WINDOW_HEIGHT) + 
        (3 * uu * t * this.p1.y * WINDOW_HEIGHT) + 
        (3 * u * tt * this.p2.y * WINDOW_HEIGHT) + 
        (ttt * this.p3.y * WINDOW_HEIGHT));
    return point;
}

function BezierPath() {
    this.curves = [];
    this.samples = [];
}
    
BezierPath.prototype.addCurve = function(curve, samples) {
    this.curves.push(curve);
    this.samples.push(samples);
}

BezierPath.prototype.sample = function(sampledPath) {
	for (var i=0; i<this.curves.length; i++) {
		for (var t=0; t <= 0.99; t += (1.0 / this.samples[i])) {
			sampledPath.push(this.curves[i].calculateCurvePoint(t)); 
		}
	}
}



