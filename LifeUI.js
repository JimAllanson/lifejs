var Life = Life || {};

Life.UI = function(simulation, parameters){

    var _this = this,
        _updateBrainGraph = false,
        _enableLogging = false;
        _lastSelectedAgent = null,
        _lastSelectedNode = null,
        _brainGraph = null;

    this.data = null;
    this.params = null;

    $('#tabs a').click(function (e) {
        e.preventDefault();
        $(this).tab('show');
    })


    $( "#updateBrainGraph" ).button();
    $( "#updateBrainGraph" ).click(function(){
        _updateBrainGraph = !_updateBrainGraph;
    });



    $( "#pause" ).click(function(){
        simulation.sendCommand("pause");
    });

    $( "#clone" ).click(function(){
        simulation.sendCommand("clone");
    });

    $( "#kill" ).click(function(){
        simulation.sendCommand("kill");
    });

    $( "#showControls" ).click(function(){
        $("#controls").toggle();
    });

    $( "#enableLogging" ).click(function(){
        _enableLogging = !_enableLogging;
    });



    $( "#render_viewCones" ).click(function(){
        simulation.renderer.shouldRender.viewCones = !simulation.renderer.shouldRender.viewCones;
    });

    $( "#render_health" ).click(function(){
        simulation.renderer.shouldRender.health = !simulation.renderer.shouldRender.health;
    });

    $( "#render_stats" ).click(function(){
        simulation.renderer.shouldRender.stats = !simulation.renderer.shouldRender.stats;
    });

    $( "#render_indicators" ).click(function(){
        simulation.renderer.shouldRender.indicators = !simulation.renderer.shouldRender.indicators;
    });

    $( "#render_eyes" ).click(function(){
        simulation.renderer.shouldRender.eyes = !simulation.renderer.shouldRender.eyes;
    });

    $( "#render_grass" ).click(function(){
        simulation.renderer.shouldRender.food = !simulation.renderer.shouldRender.food;
    });





    $( "#saveParameters" ).click(function(){
        simulation.setParameters(_this.params);
    });

    function initBrainGraph(){
        _brainGraph = new $jit.Hypertree({
            injectInto:'brain',
            Node:{
                overridable:true,
                'transform':false
            },

            Edge:{
                overridable:true
            },
            Navigation: {
                enable: true,
                panning: 'avoid nodes',
                zooming: 20
            },
            Events: {
                enable: true,
                onClick: function(node, eventInfo, e) {
                    _lastSelectedNode = node;
                    ht.onClick(node.id);
                },
                onMouseEnter: function(node, eventInfo, e) {
                    ht.canvas.getElement().style.cursor = 'pointer';
                },
                onMouseLeave: function(node, eventInfo, e) {
                    ht.canvas.getElement().style.cursor = '';
                }
            }

        });
    }





    Highcharts.setOptions({
        global : {
            useUTC : true
        }
    });

    // Create the chart
    var fitnessChart = new Highcharts.StockChart({
        chart : {
            renderTo : 'fitness'
        },

        rangeSelector: {
            buttons: [{
                count: 1,
                type: 'minute',
                text: '1M'
            }, {
                count: 5,
                type: 'minute',
                text: '5M'
            }, {
                type: 'all',
                text: 'All'
            }],
            inputEnabled: false,
            selected: 0
        },

        title : {
            text : 'Fitness'
        },

        exporting: {
            enabled: false
        },

        series : [{
            name : 'Best',
            data : [[(new Date()).getTime(), 0]]
        },{
            name : 'Average',
            data : [[(new Date()).getTime(), 0]]
        }]
    });


    this.setData = function(data){
        _this.data = data;
    }

    simulation.onUpdate(_this.setData);

    this.updateGraphs = function(){
        if(_enableLogging){


            if(_this.data && _this.data.agent && _updateBrainGraph){
                var neurons = _this.data.agent.brain.boxes;
                var graph = [];
                for(var id in neurons){
                    var neuron = neurons[id];
                    var type = "triangle";
                    var color =  Life.Utils.rgbaToCss(0.3, neuron.output * 0.7 + 0.3, neuron.output * 0.7 + 0.3, 1);
                    if(id < simulation.parameters.brain.inputSize){
                        type = "circle";
                        color =  Life.Utils.rgbaToCss(0.3, neuron.output * 0.7 + 0.3, 0.3, 1);
                    }else if(id > neurons.length - simulation.parameters.brain.outputSize){
                        type = "square";
                        color =  Life.Utils.rgbaToCss(neuron.output * 0.7 + 0.3, 0.3, 0.3, 1);
                    }
                    var val = (neuron.out < 1) ? neuron.out : 1;

                    var node = {"id":id, "name":id, data: {"$type":type, "$dim":"4", "$color":color}, "adjacencies":[] };
                    for(var syn in neurons[id].id){
                        var synapse = neurons[id].id[syn];
                        var width = neurons[id].weight[syn] + 3;
                        var color = (neurons[id].type[syn] > 0.5) ? Life.Utils.rgbaToCss(0,0.5,1,0.7) : Life.Utils.rgbaToCss(1,1,1,0.2);
                        node.adjacencies.push({"nodeTo":synapse, "data":{"$color":color, "$lineWidth":width/2}});
                    }
                    graph.push(node);
                }

                if(_brainGraph === null){
                    initBrainGraph();
                }

                if(_lastSelectedNode){
                    _brainGraph.loadJSON(graph, _lastSelectedNode.id);
                }else{
                    _brainGraph.loadJSON(graph);
                }
                _brainGraph.refresh();
            }


            if(_this.data && _this.data.agent){
                var agent = _this.data.agent;
                $("#agentId").html(agent.id);
                $("#x").html(agent.pos.x);
                $("#y").html(agent.pos.y);
                $("#angle").html(agent.angle);
                $("#health").html(agent.health);
                $("#age").html(agent.age);
                $("#herbivore").html(agent.herbivore);
                _this.plotAgentEyes();
            }

            if(_this.data.world){
                $("#tick").val(_this.data.world.tick);

                if(_this.params == null){
                    _this.params = _this.data.world.parameters;
                    //_this.loadInitialValues();
                }

            }

            var maxFitness = 0;
            var totalFitness = 0;
            for(var a in _this.data.world.agents){
                var agent =  _this.data.world.agents[a];
                if(agent.age > maxFitness) maxFitness = agent.age;
                totalFitness += agent.age;
            }
            totalFitness = totalFitness / _this.data.world.agents.length;

            fitnessChart.series[0].addPoint([(new Date()).getTime(), maxFitness], true);
            fitnessChart.series[1].addPoint([(new Date()).getTime(), totalFitness], true);

        }
    };

    this.plotAgentEyes = function(){
        var ctx = $("#eyes")[0].getContext("2d");
        ctx.clearRect(0,0,500,500);
        for(var index in _this.data.agent.eyes){
            var eye = _this.data.agent.eyes[index];
            ctx.beginPath();
            ctx.moveTo(250, 250);
            ctx.arc(250,250,_this.data.world.parameters.agent.viewDistance, eye.direction - (eye.fov / 2) - (Math.PI / 2), eye.direction + ( eye.fov / 2) - (Math.PI / 2), false);
            ctx.strokeStyle = "rgba(0,0,0,0.7)";
            ctx.closePath();
            ctx.stroke();

            ctx.beginPath();
            ctx.moveTo(250, 250);
            ctx.lineTo(250 + (_this.data.world.parameters.agent.viewDistance + 10) * Math.cos(eye.direction  - (Math.PI / 2)), 250 + (_this.data.world.parameters.agent.viewDistance + 10) * Math.sin(eye.direction  - (Math.PI / 2)));
            ctx.stroke();

            ctx.beginPath();
            ctx.moveTo(250, 250);
            ctx.arc(250,250,_this.data.world.parameters.agent.viewDistance, eye.direction - (eye.fov / 2)- (Math.PI / 2), eye.direction + ( eye.fov / 2)- (Math.PI / 2), false);
            ctx.fillStyle = Life.Utils.rgbaToCss(eye.red, eye.green, eye.blue, eye.proximity * eye.proximity);
            ctx.closePath();
            ctx.fill();
        }
    }


window.setInterval(_this.updateGraphs, 1000);


}

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