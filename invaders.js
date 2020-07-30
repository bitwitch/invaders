function createInvaders() {
    var WINDOW_HEIGHT = window.innerHeight - 50;
    var WINDOW_WIDTH = WINDOW_HEIGHT * 3 / 4;

    var startButton;
    var canvas;
    var music;

    var shake = 0;
    var elapsedTime = 0;
    var debug = false; // currently just draws enemy paths
    var reset = false;

    var flyInPath = [];
    var divePaths = []; // index == enemy type (wasp, etc.)

    var WEAPON = {
        'LAZER':         0,
        'TRISHOT':       1,
        'HOMING_MISSLE': 2
    };

    var SHIELD = {
        'MINOR':    0,
        'MAJOR':    1,
        'SHOCKING': 2
    };

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

    // AABB collision check, returns true on collision, false otherwise
    function checkCollision(a, b) {
      if (// top left
            (a.x >= b.x &&
            a.x <= b.x + b.w &&
            a.y >= b.y &&
            a.y <= b.y + b.h) ||
            // top right
            (a.x + a.w >= b.x &&
            a.x + a.w <= b.x + b.w &&
            a.y >= b.y &&
            a.y <= b.y + b.h) ||
            // bottom left
            (a.x >= b.x &&
            a.x <= b.x + b.w &&
            a.y + a.h >= b.y &&
            a.y + a.h <= b.y + b.h) ||
            // bottom right
            (a.x + a.w >= b.x &&
            a.x + a.w <= b.x + b.w &&
            a.y + a.h >= b.y &&
            a.y + a.h <= b.y + b.h)
        ) {
          return true;
        }
        return false;
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

    function Game() {
        this.running = true;
        this.assetsLoaded = false;
        this.input = {
            'left' : false,
            'right': false,
            'up'   : false,
            'down' : false,
            'fire' : false,
            // mouse
            // 'mouse': null,
        };
        this.spritePaths = {
            'spritesheet': 'spritesheet.png',
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

        this.upgrades = [];
    }

    // "external" API to run game
    Game.prototype.run = function() {
        console.log('run called');
        startButton = document.getElementById('start');
        music = document.getElementById('mightyDub');
        canvas = document.getElementById('stage');

        canvas.width = WINDOW_WIDTH;
        canvas.height = WINDOW_HEIGHT;
        var ctx = canvas.getContext('2d');

        this.createFlyInPath(flyInPath);
        this.createDivePaths(divePaths);

        document.addEventListener('keydown', this.handleKeyDown.bind(this));
        document.addEventListener('keyup', this.handleKeyUp.bind(this));

        this.prevFrame = Date.now();

        startButton.style.display = 'none';

        music.play();

        this.running = true;

        if (this.assetsLoaded) {
          this.player.x = WINDOW_WIDTH/2;
          this.player.y = WINDOW_HEIGHT - 100;
          this.loop(ctx);
        } else {
          this.loadAndRun(this.spritePaths, this.loop.bind(this, ctx));
        }
    }

    Game.prototype.handleKeyDown = function (e) {
        if (e.key === 'Escape' || e.key === 'q') {
            this.quit();
            return;
        }

        switch(e.key) {
        case "ArrowLeft":
        case "a":
            this.input.left = true;
            break;
        case "ArrowRight":
        case "d":
            this.input.right = true;
            break;
        case "ArrowUp":
        case "w":
            this.input.up = true;
            break;
        case "ArrowDown":
        case "s":
            this.input.down = true;
            break;
        case " ": // spacebar
            this.input.fire = true;
            break;
        case "r":
            this.input.reset = true;
            break;
        }
    }

    Game.prototype.handleKeyUp = function (e) {
        switch(e.key) {
        case "ArrowLeft":
        case "a":
            this.input.left = false;
            break;
        case "ArrowRight":
        case "d":
            this.input.right = false;
            break;
        case "ArrowUp":
        case "w":
            this.input.up = false;
            break;
        case "ArrowDown":
        case "s":
            this.input.down = false;
            break;
        case " ": // spacebar
            this.input.fire = false;
            break;
        case "r":
            this.input.reset = false;
            break;
        }
    }

    Game.prototype.update = function(dt, ctx) {

        if (this.input.shake) {
            shake = 5;
        }

        // handle screenshake
        if (shake > 0.3) {
            ctx.translate(
                (Math.random()*2 - 1) * shake,
                (Math.random()*2 - 1) * shake);
            shake *= 0.9;
        } else {
            // reset transform matrix to identity
            ctx.setTransform(1, 0, 0, 1, 0, 0);
        }

        // upgrade icons
        for (var i=0; i<this.upgrades.length; i++) {
            this.upgrades[i].fall(dt);
        }

        // Entity updates
        this.player.update(this.input, this.formation.enemies,this.upgrades, dt, ctx);
        this.formation.update(dt, ctx);
        this.starfield.updateAndDraw(dt, ctx);

        if (this.player.state == this.player.states.DEAD && this.input.reset) {
            this.reset();
        }
    }

    Game.prototype.draw = function(ctx) {
        this.player.draw(ctx);
        this.formation.draw(ctx);

        // upgrade icons
        for (var i=0; i<this.upgrades.length; i++) {
            this.upgrades[i].drawIcon(ctx);
        }
    }

    Game.prototype.loadAndRun = function(spritePaths, callback) {
        var totalLoaded = 0;

        this.starfield = new Starfield();
        this.starfield.fill();

        // create player
        this.player = new Player(WINDOW_WIDTH/2, WINDOW_HEIGHT - 100);
        this.player.particleSystems.push(new ParticleSystem(
            1,                                  // thruster type
            this.player.x + this.player.w/2,    // x-pos
            this.player.y + this.player.h));    // y-pos

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
                this.assetsLoaded = true;
                callback();
            }

        }.bind(this);
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

    Game.prototype.reset = function() {
        this.formation.enemies = [];
        this.formation.initEnemies(this.spritesheet);
        this.player.lives = this.player.maxLives;
        this.player.x = WINDOW_WIDTH;
        this.player.y = WINDOW_HEIGHT - 100;
        this.player.state = this.player.states.NORMAL;
        this.player.reset = false;
    }

    Game.prototype.createFlyInPath = function(path) {
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

        flyInBezier.sample(path);
    }

    Game.prototype.createDivePaths = function(paths) {
        var bezierPath, path;

    // Dive 0 - hook right
        bezierPath = new BezierPath();
        path = [];

        bezierPath.addCurve(new BezierCurve(
            { x: 0.5, y: -0.01 },
            { x: 0.5, y: -0.02 },
            { x: 0.5, y: 0.03  },
            { x: 0.5, y: 0.02  }),
            1);
        bezierPath.addCurve(new BezierCurve(
            { x: 0.5,   y: 0.02  },
            { x: 0.5,   y: 0.1   },
            { x: 0.086, y: 0.28 },
            { x: 0.086, y: 0.366 }),
            25);
        bezierPath.addCurve(new BezierCurve(
            { x: 0.086, y: 0.366 },
            { x: 0.086, y: 0.56 },
            { x: 0.374, y: 0.56 },
            { x: 0.374, y: 0.366 }),
            25);

        bezierPath.sample(path);
        paths.push(path);

    // Dive 1 - hook left
        bezierPath = new BezierPath();
        path = [];

        bezierPath.addCurve(new BezierCurve(
            { x: 0.5, y: -0.01 },
            { x: 0.5, y: -0.02 },
            { x: 0.5, y: 0.03  },
            { x: 0.5, y: 0.02  }),
            1);
        bezierPath.addCurve(new BezierCurve(
            { x: 0.5,   y: 0.02  },
            { x: 0.5,   y: 0.1   },
            { x: 0.914, y: 0.28 },
            { x: 0.914, y: 0.366 }),
            25);
        bezierPath.addCurve(new BezierCurve(
            { x: 0.914, y: 0.366 },
            { x: 0.914, y: 0.56 },
            { x: 0.626, y: 0.56 },
            { x: 0.626, y: 0.366 }),
            25);

        bezierPath.sample(path);
        paths.push(path);

    // Dive 2 - S
        bezierPath = new BezierPath();
        path = [];

        bezierPath.addCurve(new BezierCurve(
            { x: 0.5, y: 0.05 },
            { x: 0,   y: 0.15 },
            { x: 0,   y: 0.4  },
            { x: 0.5, y: 0.5  }),
            25);
        bezierPath.addCurve(new BezierCurve(
            { x: 0.5, y: 0.5 },
            { x: 1,   y: 0.6 },
            { x: 1,   y: 0.7 },
            { x: 0.5, y: 0.8 }),
            25);

        bezierPath.sample(path);
        paths.push(path);

    // Dive 3 - W
        bezierPath = new BezierPath();
        path = [];

        bezierPath.addCurve(new BezierCurve(
            { x: 0.01, y: 0.4  },
            { x: 0.01, y: 1.4  },
            { x: 0.9, y: 0.95 },
            { x: 0.5, y: 0.7  }),
            25);
        bezierPath.addCurve(new BezierCurve(
            { x: 0.5, y: 0.7  },
            { x: 0.1, y: 0.95 },
            { x: 0.95, y: 1.4  },
            { x: 0.95, y: 0.4  }),
            25);

        bezierPath.sample(path);
        paths.push(path);

    // Dive 4 - Vertical S
        bezierPath = new BezierPath();
        path = [];

        bezierPath.addCurve(new BezierCurve(
            { x: 0.05, y: 0.25 },
            { x: 0.05, y: 1.5  },
            { x: 0.65, y: -0.5 },
            { x: 0.75, y: 1.2  }),
            25);

        bezierPath.addCurve(new BezierCurve(
            { x: 0.75, y: 1.2 },
            { x: 0.75, y: 1.0  },
            { x: 1.5,  y: 0.9  },
            { x: 0.9,  y: 0.6  }),
            10);

        bezierPath.sample(path);
        paths.push(path);

    // Dive 5 - top right, circle, bottom left
        bezierPath = new BezierPath();
        path = [];

        bezierPath.addCurve(new BezierCurve(
            { x: 0.5, y: 0.2  },
            { x: 0.4, y: 0.3  },
            { x: 0.5, y: 0.4  },
            { x: 0.75, y: 0.2 }),
            20);
        bezierPath.addCurve(new BezierCurve(
            { x: 0.75, y: 0.2 },
            { x: 0.8,  y: 0  },
            { x: 1.1,  y: 0.1 },
            { x: 0.9,  y: 0.22 }),
            20);
        bezierPath.addCurve(new BezierCurve(
            { x: 0.9, y: 0.22 },
            { x: 0.9, y: 0.32 },
            { x: 0.15, y: 0.5  },
            { x: 0.15, y: 0.6  }),
            20);
        bezierPath.addCurve(new BezierCurve(
            { x: 0.15, y: 0.6 },
            { x: 0.55, y: 0.8 },
            { x: 0.34, y: 0.3  },
            { x: 0.14, y: 0.59 }),
            20);
        bezierPath.addCurve(new BezierCurve(
            { x: 0.14, y: 0.59 },
            { x: 0.14, y: 0.59 },
            { x: 0.14, y: 1.0  },
            { x: 0.14, y: 1.0 }),
            5);

        bezierPath.sample(path);
        paths.push(path);

    // Dive 6 - double loop
        bezierPath = new BezierPath();
        path = [];

        bezierPath.addCurve(new BezierCurve(
            { x: 0.5,  y: 0.2 },
            { x: 0.55, y: 0.4 },
            { x: 0.2,  y: 0.2 },
            { x: 0.2,  y: 0.3 }),
            20);
        bezierPath.addCurve(new BezierCurve(
            { x: 0.2,  y: 0.3  },
            { x: 0.2,  y: 0.35 },
            { x: 0.2,  y: 0.6  },
            { x: 0.55, y: 0.6 }),
            20);
        bezierPath.addCurve(new BezierCurve(
            { x: 0.55, y: 0.6  },
            { x: 0.75, y: 0.6  },
            { x: 0.7,  y: 0.35 },
            { x: 0.5,  y: 0.35 }),
            20);
        bezierPath.addCurve(new BezierCurve(
            { x: 0.5,  y: 0.35 },
            { x: 0.3,  y: 0.35 },
            { x: 0.35, y: 0.7 },
            { x: 0.55, y: 0.7 }),
            20);
        bezierPath.addCurve(new BezierCurve(
            { x: 0.55, y: 0.7  },
            { x: 0.6,  y: 0.71 },
            { x: 0.75, y: 0.8  },
            { x: 0.75, y: 0.85 }),
            20);
        bezierPath.addCurve(new BezierCurve(
            { x: 0.75, y: 0.85 },
            { x: 0.7,  y: 1.0  },
            { x: 0.1,  y: 1.0  },
            { x: 0.3,  y: 0.6  }),
            20);
        bezierPath.addCurve(new BezierCurve(
            { x: 0.3,  y: 0.6  },
            { x: 0.3,  y: 0.5  },
            { x: 0.7,  y: 0.3  },
            { x: 0.7,  y: 0.2  }),
            20);

        bezierPath.sample(path);
        paths.push(path);

    // Dive 7 - Bell
        bezierPath = new BezierPath();
        path = [];

        bezierPath.addCurve(new BezierCurve(
            { x: 0.5,  y: 0.15 },
            { x: 0.55, y: 0.15 },
            { x: 0.95, y: 0.25 },
            { x: 0.95, y: 0.3  }),
            20);
        bezierPath.addCurve(new BezierCurve(
            { x: 0.95, y: 0.3 },
            { x: 0.90, y: 1.0 },
            { x: 0.10, y: 1.0 },
            { x: 0.05, y: 0.3 }),
            20);
        bezierPath.addCurve(new BezierCurve(
            { x: 0.05, y: 0.3  },
            { x: 0.05, y: 0.25 },
            { x: 0.45, y: 0.15 },
            { x: 0.5,  y: 0.15 }),
            20);

        bezierPath.sample(path);
        paths.push(path);

    // Dive 8 - window bottom edge sine
        bezierPath = new BezierPath();
        path = [];

        bezierPath.addCurve(new BezierCurve(
            { x: 0.5,  y: 0.15 },
            { x: 0.5,  y: 0.2  },
            { x: 0.9 , y: 0.25 },
            { x: 0.95, y: 0.25 }),
            20);
        bezierPath.addCurve(new BezierCurve(
            { x: 0.95, y: 0.25 },
            { x: 1.1,  y: 0.25 },
            { x: 0.45, y: 0.6  },
            { x: 0.1,  y: 0.6  }),
            20);
        bezierPath.addCurve(new BezierCurve(
            { x: 0.1,   y: 0.6  },
            { x: 0.0,   y: 0.55 },
            { x: -0.07, y: 0.6  },
            { x: 0.13,  y: 0.75 }),
            20);
        bezierPath.addCurve(new BezierCurve(
            { x: 0.13, y: 0.75 },
            { x: 0.28, y: 1.0  },
            { x: 0.35, y: 1.0  },
            { x: 0.5,  y: 0.7  }),
            20);
        bezierPath.addCurve(new BezierCurve(
            { x: 0.5,  y: 0.7  },
            { x: 0.55, y: 0.6  },
            { x: 0.7,  y: 1.3  },
            { x: 0.95, y: 0.65 }),
            20);

        bezierPath.sample(path);
        paths.push(path);

    // Dive 9 - left and right dives
        bezierPath = new BezierPath();
        path = [];

        bezierPath.addCurve(new BezierCurve(
            { x: 0.5, y: 0.15 },
            { x: 0.5, y: 0.6  },
            { x: 0.5, y: 0.6  },
            { x: 0.05, y: 0.6  }),
            20);
        bezierPath.addCurve(new BezierCurve(
            { x: 0.05, y: 0.6  },
            { x: 0.0,  y: 0.55 },
            { x: 0.0,  y: 1.2  },
            { x: 0.15, y: 0.9  }),
            20);
        bezierPath.addCurve(new BezierCurve(
            { x: 0.15, y: 0.9 },
            { x: 0.16, y: 0.7 },
            { x: 0.15, y: 0.6 },
            { x: 0.25, y: 0.6 }),
            20);
        bezierPath.addCurve(new BezierCurve(
            { x: 0.25, y: 0.6 },
            { x: 0.25, y: 0.6 },
            { x: 0.95, y: 0.6 },
            { x: 0.95, y: 0.62 }),
            4);
        bezierPath.addCurve(new BezierCurve(
            { x: 0.95, y: 0.62 },
            { x: 1.0, y: 0.65 },
            { x: 0.95, y: 1.2 },
            { x: 0.8, y: 0.9 }),
            20);
        bezierPath.addCurve(new BezierCurve(
            { x: 0.8,  y: 0.9 },
            { x: 0.75, y: 0.65 },
            { x: 0.8,  y: 0.6 },
            { x: 0.5,  y: 0.6 }),
            20);

        bezierPath.sample(path);
        paths.push(path);
    }

    Game.prototype.quit = function() {
        this.reset();
        this.running = false;

        startButton.style.display = 'block';
        music.pause();
    }

    // Player
    // ---------------------------------------------------------------------------
    function Player(x, y) {
        this.x = x;
        this.y = y;
        this.w = 50;
        this.h = 50;
        this.spritesheet = null;

        this.lives = 3;
        this.maxLives = 10;

        this.shipX = 184;
        this.shipY = 55;
        this.shipW = 16;
        this.shipH = 16;

        this.invincibleX = 184;
        this.invincibleY = 79;
        this.invincibleW = 16;
        this.invincibleH = 16;

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
            "EXPLODE": 1,
            "DEAD":    2
        };
        this.state = 0;

        //this.enemies = null;
        this.speed = 0.3;
        this.canFire = true;
        this.reloadTime = 250;
        this.bullets = [];
        this.maxBullets = 2;
        this.bulletSpeed = 0.5;
        this.bulletX = 366;
        this.bulletY = 195;
        this.bulletW = 3;
        this.bulletH = 8;

        this.deadTime = 0;
        this.respawnTime = 2000;

        this.invincibleTime = 0;

        this.particleSystem = null;
        this.particleSystems = [];

        this.upgrades = {
            "weapon": null,
            "shield": null,
        }
    }

    Player.prototype.draw = function(ctx) {

        if (this.state == this.states.NORMAL) {
            if (this.invincibleTime > 0) {
                // invincible sprite
                ctx.drawImage(this.spritesheet,
                    this.invincibleX, this.invincibleY, this.invincibleW, this.invincibleH,
                    this.x, this.y, this.w, this.h
                );
            } else {
                // normal ship sprite
                ctx.drawImage(this.spritesheet,
                    this.shipX, this.shipY, this.shipW, this.shipH,
                    this.x, this.y, this.w, this.h
                );
            }

            //ctx.beginPath();
            //ctx.rect(this.x, this.y, 2, 2);
            //ctx.stroke();

        } else if (this.state == this.states.DEAD) {
        // draw "GAME OVER, press r to restart"
            ctx.fillStyle = "#3E3E3E";
            ctx.font = "40px Arial";
            ctx.fillText("GAME OVER", WINDOW_WIDTH*0.35, WINDOW_HEIGHT*0.4);
            ctx.font = "24px Arial";
            ctx.fillText("press 'r' to restart", WINDOW_WIDTH*0.39, WINDOW_HEIGHT*0.4 + 100);
            ctx.fillText("press 'q' to quit", WINDOW_WIDTH*0.4, WINDOW_HEIGHT*0.4 + 150);
        }

        // default weapon bullets
        for (var i=0; i<this.bullets.length; i++) {
            ctx.drawImage(this.spritesheet,
                this.bulletX, this.bulletY, this.bulletW, this.bulletH,
                this.bullets[i].x, this.bullets[i].y, 8, 24);
            //ctx.beginPath();
            //ctx.rect(this.bullets[i].x, this.bullets[i].y, 2, 2);
            //ctx.stroke();
        }

        // upgrades
        if (this.upgrades.weapon)
            this.upgrades.weapon.draw(ctx);
        if (this.upgrades.shield)
            this.upgrades.weapon.shield(ctx);
        if (this.upgrades.deployable)
            this.upgrades.weapon.deployable(ctx);
    }

    Player.prototype.update = function(input, enemies, upgrades, dt, ctx) {
        switch(this.state) {
        case this.states.NORMAL:
            this.updateNormal(input, enemies, upgrades, dt, ctx);
            break;
        case this.states.EXPLODE:
            this.explode(dt, ctx);
            break;
        }
    }

    Player.prototype.updateNormal = function(input, enemies, upgrades, dt, ctx) {

        // handle diagonal move speed error
        var speed = this.speed;
        if ( (input.left || input.right) && (input.up || input.down) ) {
            speed *= 0.7071; // 1/sqrt(2)
        }

        // Move Left
        if (input.left && !input.right) {
            this.x -= speed * dt;
            if (this.x <= 0) { this.x = 0; }
        }

        // Move right
        if (input.right && !input.left) {
            this.x += speed * dt;
            if (this.x + this.w >= WINDOW_WIDTH) {
                this.x = WINDOW_WIDTH - this.w;
            }
        }

        // Move up
        if (input.up && !input.down) {
            this.y -= speed * dt;
            if (this.y < 0) { this.y = 0; }
        }

        // Move down
        if (input.down && !input.up) {
            this.y += speed * dt;
            if (this.y + this.h > WINDOW_HEIGHT) {
                this.y = WINDOW_HEIGHT - this.h;
            }
        }

        // if invincible, can move but cannot fire, kill, or be killed by enemies
        if (this.invincibleTime > 0) {
            this.invincibleTime -= dt;
            return;
        }

        // Fire
        if (input.fire) {

            // upgraded weapon
            if (this.upgrades.weapon != null) {
                this.upgrades.weapon.fire();

                // drop weapon if empty
                if (this.upgrades.weapon.ammo <= 0) {
                    this.upgrades.weapon = null;
                }

            // default weapon
            } else {
                if (this.canFire && this.bullets.length < this.maxBullets) {
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

            }

        }

        var i, j, bullet, enemy;

        // Animate thrusters
        for (i=0; i<this.particleSystems.length; i++) {
            var ps = this.particleSystems[i];

            if (ps.type != ps.types.THRUSTER) continue;

            ps.origin.x = this.x + this.w/2;
            ps.origin.y = this.y + this.h;

            ps.run(dt, ctx);
        }

        // Bullet update
        if (this.upgrades.weapon != null) {
            // NOTE: weapon update also handles enemy collisions
            //console.log('weapon: ', this.upgrades.weapon);
            this.upgrades.weapon.update(dt, enemies);

        } else {
            for (i=0; i<this.bullets.length; i++) {
                bullet = this.bullets[i];

                bullet.y -= this.bulletSpeed * dt;
                if (bullet.y < 0) {
                    this.bullets.splice(i, 1);
                }
            }
        }

    // Collisions
        //for (i=0; i<upgrades.length; i++) {
            //var upgrade = upgrades[i];
            //if ( checkCollision(this, upgrade) ) {

                //upgrade.player = this;

                //if (upgrade.type == upgrade.types.WEAPON) {
                    //this.upgrades.weapon = upgrade;
                //} else if (upgrade.type == upgrade.types.SHIELD) {
                    //this.upgrades.shield = upgrade;
                //} else if (upgrade.type == upgrade.types.DEPLOYABLE) {
                    //this.upgrades.deployable = upgrade;
                //}

                //upgrades.splice(i, 1);
            //}
        //}

        // Collisions involving enemies
        for (j=0; j<enemies.length; j++) {
            enemy = enemies[j];
            if (enemy.state == enemy.states.EXPLODE) continue;

        // player/enemy collisions
            if ( checkCollision(this, enemy) ) {
                this.particleSystems.push(new ParticleSystem(
                    0,                   // explosion type
                    this.x+this.w/2,     // x pos
                    this.y+this.h/2));   // y pos
                this.state = this.states.EXPLODE;
                this.bullets = [];
                shake = 5;
            }

        // enemy-bullet/player collisions
            for (i=0; i<enemy.bullets.length; i++) {
                bullet = enemy.bullets[i];
                if ( checkCollision(bullet, this) ) {
                    enemy.bullets.splice(i, 1);
                    this.particleSystems.push(new ParticleSystem(
                        0,                  // explosion type
                        this.x+this.w/2,    // x pos
                        this.y+this.h/2));  // y pos
                    this.state = this.states.EXPLODE;
                    this.bullets = [];
                    shake = 5;
                }
            }

        // player-bullet/enemy collisions
            if (this.upgrades.weapon != null) {
                // weapon update() handles enemy collisions
            } else {
                for (i=0; i<this.bullets.length; i++) {
                    bullet = this.bullets[i];
                    if ( checkCollision(bullet, enemy) ) {
                        this.bullets.splice(i, 1);

                        enemy.particleSystem = new ParticleSystem(
                            0,                   // explosion type
                            enemy.x+enemy.w/2,   // x pos
                            enemy.y+enemy.h/2);  // y pos
                        enemy.state = enemy.states.EXPLODE;

                        shake = 5;

                        //upgrades.push(new Lazer(enemy.x, enemy.y, this.spritesheet));
                    }
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
        for (var i=0; i<this.particleSystems.length; i++) {
            var ps = this.particleSystems[i];

            if (ps.type != ps.types.EXPLOSION) continue;

            ps.run(dt, ctx);

            if (ps.particles.length == 0) {
                this.particleSystems.splice(i, 1);
            }
        }

        // respawn
        if (this.lives > 0 && this.deadTime > this.respawnTime) {
            this.deadTime = 0;
            this.firstCall = true;
            this.invincibleTime = 2000;
            this.state = this.states.NORMAL;
        } else if (this.lives <= 0) {
            this.state = this.states.DEAD;
            shake = 0;
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

        this.bulletX = 366;
        this.bulletY = 195;
        this.bulletW = 3;
        this.bulletH = 8;

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

            //ctx.beginPath();
            //ctx.rect(this.x, this.y, 2, 2);
            //ctx.stroke();
        }

        // draw bullets
        for (var i=0; i<this.bullets.length; i++) {

            ctx.drawImage(this.spritesheet,
                this.bulletX, this.bulletY, this.bulletW, this.bulletH,
                this.bullets[i].x, this.bullets[i].y, 8, 24);

            ctx.beginPath();
            ctx.rect(this.bullets[i].x, this.bullets[i].y, 2, 2);
            ctx.stroke();
        }

        if(debug) {
        // draw fly-in or dive path
            var path = this.state == this.states.FLY_IN
                ? flyInPath
                : divePaths[this.spriteIndex];

            if ((this.state == this.states.DIVE || this.state == this.states.FLY_IN)
                && path)
            {
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

    Enemy.prototype.update = function(dt, ctx) {
        switch(this.state) {
        case this.states.FLY_IN:
            this.flyIn(dt);
            break;
        case this.states.JOIN_FORMATION:
            this.joinFormation(dt);
            break;
        case this.states.LATERAL:
            this.lateral(dt);
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
        if (Math.random() < 0.004) {
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
            this.currentWaypoint = 0;
        }
    }

    // moves enemy according to formation target and the formation origin
    Enemy.prototype.lateral = function() {
        this.x = this.formationTarget.x + this.formation.origin.x;
        this.y = this.formationTarget.y + this.formation.origin.y;

        if (this.x + this.w > WINDOW_WIDTH) {
            this.x = WINDOW_WIDTH - this.w;
        } else if (this.x < 0) {
            this.x = 0;
        }

        // random chance at diving
        if (Math.random() < 0.0008) {
            this.state = this.states.DIVE;
            this.inFormation = false;
        }
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
        var path = divePaths[this.spriteIndex];

        if (this.currentWaypoint < path.length) {
            // head towards current waypoint
            var dist = subVector(path[this.currentWaypoint], {x: this.x, y: this.y});
            var move = multVector(normVector(dist), this.diveSpeed*dt);

            this.x += move.x; this.y += move.y;

            if (magVector(dist) < 8.0) {
                this.currentWaypoint++;
            }

        } else {
            this.state = this.states.JOIN_FORMATION;
        }

    }

    Enemy.prototype.joinFormation = function(dt) {
        if (!this.inFormation) {
            var target = {
                x: this.formationTarget.x + this.formation.origin.x,
                y: this.formationTarget.y + this.formation.origin.y
            };

            var dist = subVector(target, {x: this.x, y: this.y});
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


    // Upgrade
    // ---------------------------------------------------------------------------
    var Upgrade = {
        'velFall': 0.01,
        'player': null,
        'types': {
            "WEAPON":     0,
            "SHIELD":     1,
            "DEPLOYABLE": 2
        },
        'fall': function(dt) {
            this.y += this.velFall * dt;
        },
        'drawIcon': function(ctx) {
             //ctx.drawImage(this.spritesheet,
                //this.spriteX, this.spriteY, this.spriteW, this.spriteH,
                //this.x, this.y, this.w, this.h);
            ctx.rect(this.x, this.y, this.w, this.h);
            ctx.stroke();
        }
    }

    function Shield(type, x, y) {
        this.type = type;
        this.x = x;
        this.y = y;
    }
    Shield.prototype = Object.create(Upgrade);

    function Lazer(x, y, spritesheet) {
        this.x = x;    // icon x
        this.y = y;    // icon y
        this.w = 50;   // icon width
        this.h = 50;   // icon height

        this.type = this.types.WEAPON;

        // spritesheet locations
        this.spritesheet = spritesheet;
        this.spriteX = 264;
        this.spriteY = 285;
        this.spriteW = 16;
        this.spriteH = 16;

        this.canFire = true;
        this.reloadTime = 850;
        this.ammo = 3;
        this.active = false;

        this.beam = { x: 0, y: 0, w: WINDOW_WIDTH/8, h: 0 };
        this.beamSpeed = 1.269;
        this.beamTime = 0;
        this.maxBeam = 2000;
    }

    Lazer.prototype = Object.create(Upgrade);

    Lazer.prototype.fire = function() {
        if (this.canFire) {
            this.canFire = false;
            this.active = true;
            this.ammo--;

            if (this.ammo > 0) {
                setTimeout(function() {
                    this.canFire = true;
                }.bind(this), this.reloadTime);
            }
        }
    }

    Lazer.prototype.update = function(dt, enemies) {

        if (!this.active) { return; }

        this.beamTime += dt;
        if (this.beamTime > this.maxBeam) {
            this.active = false;
            this.beamTime = 0;
            this.beam.h = 0;
        }

        if (this.beam.h <= WINDOW_HEIGHT)
            this.beam.h += this.beamSpeed * dt;

        this.beam.x = this.player.x + this.player.w/2 - this.beam.w/2;
        this.beam.y = this.player.y - this.beam.h;

        // shake a shit ton, cuz lazers
        //shake = 5;

        for (var i=0; i<enemies.length; i++) {
            var enemy = enemies[i];
            if ( checkCollision(this.beam, enemy) ) {
                enemy.particleSystem = new ParticleSystem(
                    0,                     // explosion type
                    enemy.x+enemy.w/2,     // x pos
                    enemy.y+enemy.h/2);    // y pos
                enemy.state = enemy.states.EXPLODE;
            }
        }
    }

    Lazer.prototype.draw = function(ctx) {
        if (this.active)
            ctx.fillRect(this.beam.x, this.beam.y, this.beam.w, this.beam.h);
    }


    // Formation
    // ---------------------------------------------------------------------------
    function Formation() {
        this.enemies = [];

        this.direction = 1;
        this.origin = {x: 0, y: 0};
        this.speed = 0.16;
        this.w = 525; // 5 enemy spaces + 25 offset
        this.h = 525;

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
            this.spawnEnemies(5);
            this.timeSinceRespawn = 0;
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
        }
    }

    Formation.prototype.lateral = function(dt) {
        this.origin.x += this.speed * dt * this.direction;

        if (this.origin.x + this.w > WINDOW_WIDTH) {
            this.origin.x = WINDOW_WIDTH - this.w;
            this.direction *= -1;
        } else if (this.origin.x < 0) {
            this.origin.x = 0;
            this.direction *= -1;
        }

        if (Math.random() < 0.002) {
            //this.state = this.states.SCRAMBLE;
            //this.origin.x = 0; this.origin.y = 0;
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
        //this.enemies.push(new Enemy(
            //spritesheet, randInt(0, 10), 40, -50, Math.random()*0.2 + 0.2));
        //this.enemies.push(new Enemy(
            //spritesheet, randInt(0, 10), 100, -50, Math.random()*0.2 + 0.2));
        //this.enemies.push(new Enemy(
            //spritesheet, randInt(0, 10), 160, -50, Math.random()*0.2 + 0.2));
        //this.enemies.push(new Enemy(
            //spritesheet, randInt(0, 10), 220, -50, Math.random()*0.2 + 0.2));
        //this.enemies.push(new Enemy(
            //spritesheet, randInt(0, 10), 280, -50, Math.random()*0.2 + 0.2));
        //this.enemies.push(new Enemy(
            //spritesheet, randInt(0, 10), 340, -50, Math.random()*0.2 + 0.2));
        //this.enemies.push(new Enemy(
            //spritesheet, randInt(0, 10), 400, -50, Math.random()*0.2 + 0.2));

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
        this.maxStars = 142;
        this.colors = [
            '#861111',
            '#582361',
            '#29562D',
            '#232C4E',
            '#595A3F',
            '#334446',
            '#58423D',
        ];
        this.speed = 0.1246;
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
        var i, x, r, color;
        for (i=0; i<this.maxStars; i++) {
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
        //this.blinkTime;
        //this.curTime;
    }

    // Particle System
    // ---------------------------------------------------------------------------
    function ParticleSystem(type, x, y) {
        this.origin = { x: x, y: y };
        this.particles = [];
        this.maxParticles = 500;
        this.maxLife = 1000;
        this.lifetime = 0;
        this.types = {
            'EXPLOSION': 0,
            'THRUSTER': 1
        }
        this.type = type;
    }

    ParticleSystem.prototype.run = function(dt, ctx) {

        if (this.type == this.types.EXPLOSION) {

            if (this.particles.length < this.maxParticles && this.lifetime < this.maxLife) {
                this.particles.push(new Particle(this.types.EXPLOSION,
                    this.origin.x, this.origin.y));
                this.particles.push(new Particle(this.types.EXPLOSION,
                    this.origin.x, this.origin.y));
                this.particles.push(new Particle(this.types.EXPLOSION,
                    this.origin.x, this.origin.y));
                this.particles.push(new Particle(this.types.EXPLOSION,
                    this.origin.x, this.origin.y));
                this.particles.push(new Particle(this.types.EXPLOSION,
                    this.origin.x, this.origin.y));
                this.particles.push(new Particle(this.types.EXPLOSION,
                    this.origin.x, this.origin.y));
                this.particles.push(new Particle(this.types.EXPLOSION,
                    this.origin.x, this.origin.y));
                this.particles.push(new Particle(this.types.EXPLOSION,
                    this.origin.x, this.origin.y));
                this.particles.push(new Particle(this.types.EXPLOSION,
                    this.origin.x, this.origin.y));
                this.particles.push(new Particle(this.types.EXPLOSION,
                    this.origin.x, this.origin.y));
            }

        } else if (this.type == this.types.THRUSTER) {

            if (this.particles.length < this.maxParticles) {
                 this.particles.push(new Particle(this.types.THRUSTER,
                    this.origin.x, this.origin.y));
                 this.particles.push(new Particle(this.types.THRUSTER,
                    this.origin.x, this.origin.y));
            }
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

    function Particle(type, x, y) {
        this.acc = { x: 0, y: 0 };
        this.pos = { x: x, y: y };
        this.lifespan = 255;
        var size = Math.random()*3;
        this.w = size;
        this.h = size;

        this.types = {
            'EXPLOSION': 0,
            'THRUSTER': 1
        }

        this.type = type;

        if (this.type == this.types.THRUSTER) {
            this.vel = { x: Math.random() - 0.5, y: Math.random()*1.2 };
            this.color = { r: Math.floor(Math.random() * 100),
                           g: Math.floor(Math.random() * 238),
                           b: 255 };
        } else {
            this.vel = { x: Math.random()*2 - 1, y: Math.random()*2 - 1 };
            this.color = { r: 255, g: Math.floor(Math.random() * 238), b: 0 };
        }
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
            for (var t=0; t <= 1; t += (1.0 / this.samples[i])) {
                sampledPath.push(this.curves[i].calculateCurvePoint(t));
            }
        }
    }

    return new Game();
}
