var Life = Life || {};

Life.Simulation = function(parameters){

    //Default parameters
    var _params = {
        tickDuration:20,

        //World
        width: window.innerWidth,
        height: window.innerHeight,
        cellSize:64,

        //Vegetation distribution
        maxFood:0.5,
        foodAddFrequency:30,

        minAgents:25,
        maxAgents:50,


        agent:{
            radius:10,
            speed:0.3,
            sprintMultiplier:2,

            //Vision
            numberEyes:4,
            viewDistance:150,

            //Weapon
            spikeStrength:1,
            spikeSpeed: 0.005,

            //Eating + sharing food
            foodIntake:0.002,
            foodWasted:0.001,
            foodTraded:0.001,
            foodTradeDistance:50,

            //Reproduction
            babies:2,
            reproductionRate:{
                carnivore:7,
                herbivore:7
            },
            mutationRate:[
                0.002,
                0.05
            ],

            //Pain
            temperatureDiscomfortDamage:0,

            //Death
            bodyDecayRadius:64,
            bodyFertilityBonus:5
        },

        brain:{
            inputSize:25,
            outputSize:9,
            connections:4,
            size:200
        }
    };

    //Recursively copies any options supplied as parameters onto a default parameters object
    function copyOptions(from, to){
        for(var i in from){
            if(typeof from[i] == "object"){
                copyOptions(from[i], to[i]);
            }else if(typeof from[i] != "undefined"){
                console.log(to);
                to[i] = from[i];
            }
        }
    }

    copyOptions(parameters, _params);

    //Ensure that the width and height are a multiple of the cell size
    _params.width = Math.floor(_params.width / _params.cellSize) * _params.cellSize;
    _params.height = Math.floor(_params.height / _params.cellSize) * _params.cellSize;

    var _this = this,
        _world = null,
        _selectedAgent = null,
        _callback = function(x){},
        _renderer = null,
        _worker = null,
        _socket = null;

    this.parameters = _params;



    this.sendCommand = function(command, options){
        if(_socket !== null){
            _socket.emit(command, options);
        }else{
            _worker.postMessage({action:command, parameters:options});
        }
    };


    /**
     * Allows a callback to be attached to handle advanced rendering of data, e.g. for graphing
     * @param callback Function to call when new simulation data is available
     */
    this.onUpdate = function (callback) {
        _callback = callback;
    };

    /**
     * Attaches a renderer to the simulation
     */
    this.setRenderer = function(renderer){
        _renderer = renderer;
        this.renderer = _renderer;
    };

    /**
     *
     */
    this.init = function(options){
        //Whether to run the simulation locally, or as a node.js process
        if(options && options.type == "node"){
            var server = options.server || "http://localhost";

            _socket = io.connect(server);
            _socket.on('update', function (data) {
                _world = data.world;
                _selectedAgent = data.agent;
                _callback(data);
                _renderer.update(_world, _selectedAgent);
            });
            _socket.on('save', function (data) {
                _this.saved = data.world;
            });

            _socket.on('connected', function (data) {
                _params = data.world.parameters;
                _world = data.world;
                _selectedAgent = data.agent;
                _renderer.init(_params);
            });

        }else{
            //Running the simulation locally, in JS. Use a Web Worker
            _worker = new Worker('Worker.js');
            _worker.onmessage = function (event) {
                data = JSON.parse(event.data);
                if(data.action == "update"){
                    _world = data.world;
                    _selectedAgent = data.agent;
                    _callback(data);
                    _renderer.update(_world, _selectedAgent);
                }else if(data.action == "save"){
                    _this.saved = data.world;
                }
            };

            _renderer.init(_params);
        }
        if(options && options.slave){
            _this.sendCommand("listen");
        }else{
            _this.sendCommand("init", _this.parameters);
        }

    }

};


/**
 * Renders data from a simulation to a canvas element
 * @param parameters A list of parameters, see <a href="https://github.com/JimAllanson/lifejs/wiki/Default-Parameters">a list of defaults here.</a>
 * @constructor
 */
Life.Renderer = function (simulation) {

    var _this = this,
        _canvas = document.createElement('canvas'),
        _context = _canvas.getContext('2d'),
        _world = null,
        _selectedAgent = null,
        _simulation = simulation;

    _simulation.setRenderer(_this);


    this.canvas = _canvas;
    this.parameters = simulation.parameters;
    this.shouldRender = {
        viewCones: false,
        eyes:true,
        indicators:true,
        stats:false,
        health:true,
        food: true
    }

    /**
     * Animates the simulation, using requestAnimationFrame to allow browser to control framerate
     */
    this.animate = function () {
        requestAnimationFrame(_this.animate);
        _this.render();
    };

    /**
     * Renders the current world
     */
    this.render = function () {
        if (_world) {
            _context.clearRect(0, 0, _this.parameters.width, _this.parameters.height);

            //Draw food levels in cells
            if(_this.shouldRender.food){
                for (var x = 0; x < Math.floor(_this.parameters.width / _this.parameters.cellSize); x++) {
                    for (var y = 0; y < Math.floor(_this.parameters.height / _this.parameters.cellSize); y++) {
                        var f = 0.5 * _world.food[x][y] / _this.parameters.maxFood;
                        _this.drawFood(x, y, f);
                    }
                }
            }

            //Render each agent
            for (var id in _world.agents) {
                _this.renderAgent(_world.agents[id]);
            }
        }
    };

    /**
     * Renders an agent
     * @param agent Agent to render
     */
    this.renderAgent = function (agent) {
        //Indicator
        if(_this.shouldRender.indicators){
            _context.beginPath();
            _context.fillStyle = Life.Utils.rgbaToCss(agent.indicator.red, agent.indicator.green, agent.indicator.blue, 0.5);
            _context.arc(agent.pos.x, agent.pos.y, _this.parameters.agent.radius + Math.floor(agent.indicator.size), 0, 2 * Math.PI, false);
            _context.fill();
        }


        //Selected
        if (agent.selectFlag) {
            _context.beginPath();
            _context.fillStyle = Life.Utils.rgbaToCss(255, 0, 255, 0.3);
            _context.arc(agent.pos.x, agent.pos.y, _this.parameters.agent.radius + 20, 0, 2 * Math.PI, false);
            _context.fill();
        }

        //Eyes
        _context.strokeStyle = "rgba(60,60,60,1)";
        for (var i in agent.eyes) {
            var eye = agent.eyes[i];
            var angle = agent.angle + eye.direction;

            if(_this.shouldRender.eyes){
                _context.beginPath();
                _context.moveTo(agent.pos.x, agent.pos.y);
                _context.lineTo(agent.pos.x + (_this.parameters.agent.radius * 2) * Math.cos(angle), agent.pos.y + (_this.parameters.agent.radius * 2) * Math.sin(angle));
                _context.strokeStyle = "rgba(0,0,0,0.3)"
                _context.stroke();
            }

            if(_this.shouldRender.viewCones){
                _context.beginPath();
                _context.moveTo(agent.pos.x, agent.pos.y);
                _context.arc(agent.pos.x, agent.pos.y,_this.parameters.agent.viewDistance * eye.proximity + _this.parameters.agent.radius, angle - (eye.fov / 2), angle + ( eye.fov / 2), false);
                _context.fillStyle = Life.Utils.rgbaToCss(eye.red, eye.green, eye.blue, 0.5);
                _context.closePath();
                _context.fill();
            }
        }

        //Body
        _context.beginPath();
        _context.fillStyle = Life.Utils.rgbaToCss(agent.red, agent.green, agent.blue, 1);
        _context.arc(agent.pos.x, agent.pos.y, _this.parameters.agent.radius, 0, 2 * Math.PI, false);
        _context.fill();

        //Sprinting
        if (agent.sprinting) {
            _context.strokeStyle = "rgba(0,200,0,1)";
        } else {
            _context.strokeStyle = "rgba(0,0,0,0)";
        }
        _context.stroke();


        //Spike
        _context.strokeStyle = "rgba(125,0,0,1)";
        _context.beginPath();
        _context.moveTo(agent.pos.x, agent.pos.y);
        _context.lineTo(agent.pos.x + (_this.parameters.agent.radius * 3 * agent.spikeLength) * Math.cos(agent.angle), agent.pos.y + (_this.parameters.agent.radius * 3 * agent.spikeLength) * Math.sin(agent.angle));
        _context.stroke();


        //Stats offsets
        var xo = 18;
        var yo = -15;

        //Health
        if(_this.shouldRender.health){
            _context.fillStyle = "black";
            _context.fillRect(agent.pos.x + xo, agent.pos.y + yo, 5, 40);
            _context.fillStyle = "rgba(0,200,0,1)";
            _context.fillRect(agent.pos.x + xo, agent.pos.y + yo + 20 * (2 - agent.health), 5, 40 - (20 * (2 - agent.health)));
        }

        if(_this.shouldRender.stats){
            //Hybrid
            if (agent.hybrid) {
                _context.fillStyle = Life.Utils.rgbaToCss(0, 0.8, 0, 1);
                _context.fillRect(agent.pos.x + xo + 6, agent.pos.y + yo, 5, 10);
            }

            //Herbivore-ness
            _context.fillStyle = Life.Utils.rgbaToCss(1 - agent.herbivore, agent.herbivore, 0, 1);
            _context.fillRect(agent.pos.x + xo + 6, agent.pos.y + yo + 12, 5, 10);

            //Sound
            _context.fillStyle = Life.Utils.rgbaToCss(agent.soundMultiplier, agent.soundMultiplier, agent.soundMultiplier, 1);
            _context.fillRect(agent.pos.x + xo + 6, agent.pos.y + yo + 24, 5, 10);


            //Text
            _context.fillStyle = "black";
            _context.fillText(agent.generationCount, agent.pos.x - _this.parameters.agent.radius, agent.pos.y + _this.parameters.agent.radius * 2);
            _context.fillText(agent.age, agent.pos.x - _this.parameters.agent.radius, agent.pos.y + _this.parameters.agent.radius * 2 + 10);
            _context.fillText(agent.health.toFixed(2), agent.pos.x - _this.parameters.agent.radius, agent.pos.y + _this.parameters.agent.radius * 2 + 20);
            _context.fillText(agent.repCounter.toFixed(2), agent.pos.x - _this.parameters.agent.radius, agent.pos.y + _this.parameters.agent.radius * 2 + 30);
        }
    };

    /**
     * Renders a cell of food
     * @param x X coordinate of cell
     * @param y Y coordinate of cell
     * @param quantity Quantity of food in cell
     */
    this.drawFood = function (x, y, quantity) {
        _context.fillStyle = Life.Utils.rgbaToCss(0.8, 1, 0.8, quantity);
        _context.fillRect(x * _this.parameters.cellSize, y * _this.parameters.cellSize, _this.parameters.cellSize, _this.parameters.cellSize);
    };



    /**
     * Initialises a simulation and begins rendering
     */
    this.init = function () {
        _canvas.width = _simulation.parameters.width;
        _canvas.height = _simulation.parameters.height;

        //Pass click events to simulation to select agent
        _canvas.addEventListener("mousedown", function (event) {
            _simulation.sendCommand("select", {x:event.clientX, y:event.clientY});
        }, false);

        //requestAnimationFrame shim, lets unsupported browsers render, with poorer performance
        var lastTime = 0;
        var vendors = [ 'ms', 'moz', 'webkit', 'o' ];
        for (var x = 0; x < vendors.length && !window.requestAnimationFrame; ++x) {
            window.requestAnimationFrame = window[ vendors[ x ] + 'RequestAnimationFrame' ];
            window.cancelAnimationFrame = window[ vendors[ x ] + 'CancelAnimationFrame' ] || window[ vendors[ x ] + 'CancelRequestAnimationFrame' ];
        }
        if (!window.requestAnimationFrame) {
            window.requestAnimationFrame = function (callback, element) {
                var currTime = Date.now(), timeToCall = Math.max(0, 16 - ( currTime - lastTime ));
                var id = window.setTimeout(function () {
                    callback(currTime + timeToCall);
                }, timeToCall);
                lastTime = currTime + timeToCall;
                return id;
            };
        }
        if (!window.cancelAnimationFrame) {
            window.cancelAnimationFrame = function (id) {
                clearTimeout(id);
            };
        }

        //Begin animation
        this.animate();
    };

    this.update = function(world, selectedAgent){
        _world = world;
        _selectedAgent = selectedAgent;
    }


    this.setParameters = function(parameters){
        _simulation.sendCommand("setParameters", {parameters:parameters});
    };

    this.save = function(){
        _simulation.sendCommand("save", {});
    };

    this.load = function(){
        _simulation.sendCommand("load", {world:_this.saved});
    };





};

Life.Utils = {};
/**
 * Produces an RGBA CSS string from four values between 0 and 1.
 * @param r Red component
 * @param g Green component
 * @param b Blue component
 * @param a Alpha component
 * @return {String} RGBA colour as a CSS string
 */
Life.Utils.rgbaToCss = function (r, g, b, a) {
    return "rgba(" + Math.floor(r * 255) + "," + Math.floor(g * 255) + "," + Math.floor(b * 255) + ", " + a + ")";
}