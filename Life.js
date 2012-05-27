var Life = Life || {};
Life.Renderer = function(parameters){
    parameters = parameters || {};
    parameters.agent = parameters.agent || {};
    parameters.agent.reproductionRate = parameters.agent.reproductionRate || {};
    parameters.agent.mutationRate = parameters.agent.mutationRate || [];
    parameters.brain = parameters.brain || {};

    parameters.width = parameters.width || window.innerWidth;
    parameters.height = parameters.height || window.innerHeight;
    parameters.cellSize = parameters.cellSize || 50;

    var _params = {
        tickDuration: parameters.tickDuration || 20,

        //World
        cellSize: parameters.cellSize,
        width: Math.floor(parameters.width / parameters.cellSize) * parameters.cellSize,
        height: Math.floor(parameters.height / parameters.cellSize) * parameters.cellSize,

        //Vegetation distribution
        maxFood: parameters.maxFood || 0.5,
        foodAddFrequency: parameters.foodAddFrequency || 15,

        minAgents: parameters.minAgents || 25,
        maxAgents: parameters.maxAgents || 50,


        agent:{
            size: parameters.agent.size || 10,
            speed: parameters.agent.speed || 0.3,
            sprintMultiplier: parameters.agent.sprintMultiplier || 2,

            //Vision
            numberEyes: parameters.agent.numberEyes || 4,
            viewDistance: parameters.agent.viewDistance || 150,

            //Weapon
            spikeStrength: parameters.agent.spikeStrength || 1,
            spikeSpeed: parameters.agent.spikeSpeed || 0.005,

            //Eating + sharing food
            foodIntake: parameters.agent.foodIntake || 0.002,
            foodWasted: parameters.agent.foodWasted || 0.001,
            foodTraded: parameters.agent.foodTraded || 0.001,
            foodTradeDistance: parameters.agent.foodTradeDistance || 50,

            //Reproduction
            babies: parameters.agent.babies || 2,
            reproductionRate:{
                carnivore: parameters.agent.reproductionRate.carnivore || 7,
                herbivore: parameters.agent.reproductionRate.herbivore || 7
            },
            mutationRate:[
                parameters.agent.mutationRate[0] || 0.002,
                parameters.agent.mutationRate[1] || 0.05
            ],

            //Pain
            temperatureDiscomfortDamage: parameters.agent.temperatureDiscomfortDamage || 0,

            //Death
            bodyDecayRadius: parameters.agent.bodyDecayRadius || 100,
            bodyFertilityBonus: parameters.agent.bodyFertilityBonus || 5
        },

        brain:{
            inputSize: parameters.brain.inputSize || 25,
            outputSize: parameters.brain.outputSize ||9,
            connections: parameters.brain.connections || 4,
            size: parameters.brain.size || 200
        }
    };

   var _this = this,
       _canvas = document.createElement( 'canvas' ),
       _brainDiv = document.createElement( 'div'),
       _canvasWidth = _params.width,
       _canvasHeight = _params.height,
       _context = _canvas.getContext('2d'),
       _world = null,
       _selectedAgent = null;

    _canvas.width = _canvasWidth;
    _canvas.height = _canvasHeight;

    this.canvas = _canvas;
    this.world = _world;
    this.agent = _selectedAgent;
    this.parameters = _params;



   this.animate = function(){
       requestAnimationFrame(_this.animate);
       _this.render();
   },

   this.render = function(){

       if(_world){

          _context.clearRect(0,0,_canvasWidth,_canvasHeight);
           var drawFood = true;

           if(drawFood){
               for(var x = 0; x < Math.floor(_this.parameters.width / _this.parameters.cellSize); x++){
                   for(var y = 0; y < Math.floor(_this.parameters.height / _this.parameters.cellSize); y++){
                       var f = 0.5 * _world.food[x][y]/_this.parameters.maxFood;
                       _this.drawFood(x,y,f);
                   }
               }
           }

           for(var id in _world.agents){
               _this.renderAgent(_world.agents[id]);
           }
       }
   },

   this.renderAgent = function(agent){
       //Indicator
       _context.beginPath();
       _context.fillStyle = Life.Utils.rgbaToCss(agent.indicator.red, agent.indicator.green, agent.indicator.blue, 0.5);
       _context.arc(agent.pos.elements[0], agent.pos.elements[1], _this.parameters.agent.size + Math.floor(agent.indicator.size), 0, 2 * Math.PI, false);
       _context.fill();


       //Selected
       if(agent.selectFlag){
           _context.beginPath();
           _context.fillStyle = Life.Utils.rgbaToCss(255,0,0, 0.3);
           _context.arc(agent.pos.elements[0], agent.pos.elements[1], _this.parameters.agent.size + 10, 0, 2 * Math.PI, false);
           _context.fill();
       }

       //Eyes
       _context.strokeStyle = "rgba(60,60,60,1)";
       for(var i = 0; i < _this.parameters.agent.numberEyes; i++){
           _context.beginPath();
           _context.moveTo(agent.pos.elements[0], agent.pos.elements[1]);
           var angle = agent.angle + agent.eyeDir[i];
           _context.lineTo(agent.pos.elements[0] + (_this.parameters.agent.size * 2) * Math.cos(angle), agent.pos.elements[1] + (_this.parameters.agent.size * 2) * Math.sin(angle));
           _context.stroke();
       }

       //Body
       _context.beginPath();
       _context.fillStyle = Life.Utils.rgbaToCss(agent.red, agent.green, agent.blue, 1);
       _context.arc(agent.pos.elements[0], agent.pos.elements[1], _this.parameters.agent.size, 0, 2 * Math.PI, false);
       _context.fill();

       //Sprinting
       if(agent.sprinting){
           _context.strokeStyle = "rgba(0,200,0,1)";
       }else{
           _context.strokeStyle = "rgba(0,0,0,0)";
       }
       _context.stroke();


       //Spike
       _context.strokeStyle = "rgba(125,0,0,1)";
       _context.beginPath();
       _context.moveTo(agent.pos.elements[0], agent.pos.elements[1]);
       _context.lineTo(agent.pos.elements[0] + (_this.parameters.agent.size * 3 * agent.spikeLength) * Math.cos(agent.angle), agent.pos.elements[1] + (_this.parameters.agent.size * 3 * agent.spikeLength) * Math.sin(agent.angle));
       _context.stroke();


       //Stats offsets
       var xo = 18;
       var yo = -15;

       //Health
       _context.fillStyle = "black";
       _context.fillRect(agent.pos.elements[0] + xo, agent.pos.elements[1] + yo, 5, 40);
       _context.fillStyle = "rgba(0,200,0,1)";
       _context.fillRect(agent.pos.elements[0] + xo, agent.pos.elements[1] + yo + 20*(2-agent.health), 5,  40 - (20*(2-agent.health)));

       //Hybrid
       if(agent.hybrid){
           _context.fillStyle = Life.Utils.rgbaToCss(0, 0.8, 0, 1);
           _context.fillRect(agent.pos.elements[0] + xo + 6, agent.pos.elements[1] + yo, 5, 10);
       }

       //Herbivore-ness
       _context.fillStyle = Life.Utils.rgbaToCss(1 - agent.herbivore, agent.herbivore, 0, 1);
       _context.fillRect(agent.pos.elements[0] + xo + 6, agent.pos.elements[1] + yo + 12, 5, 10);

       //Sound
       _context.fillStyle = Life.Utils.rgbaToCss(agent.soundMultiplier, agent.soundMultiplier, agent.soundMultiplier, 1);
       _context.fillRect(agent.pos.elements[0] + xo + 6, agent.pos.elements[1] + yo + 24, 5, 10);


       //Text
       _context.fillStyle = "black";
       _context.fillText(agent.generationCount, agent.pos.elements[0] - _this.parameters.agent.size, agent.pos.elements[1] + _this.parameters.agent.size * 2);
       _context.fillText(agent.age, agent.pos.elements[0] - _this.parameters.agent.size, agent.pos.elements[1] + _this.parameters.agent.size * 2 + 10);
       _context.fillText(agent.health.toFixed(2), agent.pos.elements[0] - _this.parameters.agent.size, agent.pos.elements[1] + _this.parameters.agent.size * 2 + 20);
       _context.fillText(agent.repCounter.toFixed(2), agent.pos.elements[0] - _this.parameters.agent.size, agent.pos.elements[1] + _this.parameters.agent.size * 2 + 30);
   },

   this.drawFood = function(x, y, quantity){
       _context.fillStyle = Life.Utils.rgbaToCss(0.8, 1, 0.8, quantity);
       _context.fillRect(x*_this.parameters.cellSize, y*_this.parameters.cellSize, _this.parameters.cellSize, _this.parameters.cellSize);
   },



   this.getBrain = function(){
       var neurons = _selectedAgent.brain.boxes;
       var graph = [];
       for(var id in neurons){
           var neuron = neurons[id];
           var type = "circle";
           if(id < _this.parameters.brain.inputSize){
               type = "triangle";
           }else if(id > neurons.length - _this.parameters.brain.outputSize){
               type = "square";
           }
           var val = (neuron.out < 1) ? neuron.out : 1;

           var node = {"id":id, "name":id, data: {"$type":type, "$dim":"5", "$color":Life.Utils.rgbaToCss(1, neuron.output, neuron.output, 1)}, "adjacencies":[] };
           for(var syn in neurons[id].id){
               var synapse = neurons[id].id[syn];
               var width = neurons[id].weight[syn] + 3;
               var color = (neurons[id].type[syn] > 0.5) ? Life.Utils.rgbaToCss(1,1,0,0.3) : Life.Utils.rgbaToCss(0,0,0,0.05);
               node.adjacencies.push({"nodeTo":synapse, "data":{"$color":color, "weight":width/2}});
           }
           graph.push(node);
       }
       return graph;
   },

   this.init = function(){
       var worker = new Worker('Worker.js');
       worker.onmessage = function(event) {

           data = JSON.parse(event.data);

           _world = data.world;
           _selectedAgent = data.agent;
       };
       worker.postMessage({action: "init", parameters: _this.parameters});

       _canvas.onclick = function(event){
           worker.postMessage({action: "select", x: event.x, y: event.y});
       }

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

       this.animate();
   }

};
Life.Utils = {};
Life.Utils.rgbaToCss = function(r, g, b, a){
    return "rgba("+ Math.floor(r * 255) +","+ Math.floor(g * 255) +","+ Math.floor(b * 255) +", "+a+")";
}