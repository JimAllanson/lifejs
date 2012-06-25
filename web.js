var pg = require('pg');

var _selectedAgent = null;
var _world;
var _pause = false;
var _timer;
var _sockets = [];



function update(){
    for(var s in _sockets){
        _sockets[s].emit('update', JSON.parse(report()));
    }
}

function report(){
    pg.connect(process.env.DATABASE_URL, function(err, client) {
        var query = client.query('SELECT data FROM data');

        query.on('row', function(row) {
            console.log(row);
            return row;
        });
    });
}

/**
 * Selects the nearest agent to a given x and y coordinate
 * @param x X coordinate
 * @param y Y coordinate
 */
function selectAgent(x, y) {
    var minD = 1e10;
    var minI = 1;
    var d;

    for (var i = 0; i < _world.agents.length; i++) {
        d = Math.pow(x - _world.agents[i].pos.x, 2) + Math.pow(y - _world.agents[i].pos.y, 2);
        if (d < minD) {
            minD = d;
            minI = i;
        }
    }

    for (var i = 0; i < _world.agents.length; i++) {
        _world.agents[i].selectFlag = false;
    }
    _world.agents[minI].selectFlag = true;
    _selectedAgent = _world.agents[minI];
}

/**
 * Processes incoming messages from the renderer
 * @param event Object containing message data
 */
var express = require('express');
var app = express.createServer()
    , io = require('socket.io').listen(app);
var port = process.env.PORT || 3000;
app.listen(port);
io.set('log level', 1);
io.configure(function () {
    io.set("transports", ["xhr-polling"]);
    io.set("polling duration", 10);
});


app.configure(function() {
    app.use(express.static(__dirname + '/client'));
    app.use(express.errorHandler({ dumpExceptions: true, showStack: true }));
});





io.sockets.on('connection', function (socket) {

    _sockets.push(socket);
    console.log(socket.handshake.address);


    socket.on('listen', function (data) {
        socket.emit('connected', report());
    });


    socket.on('save', function (data) {
        socket.emit('save', {world: _world});
    });

    socket.on('init', function (data) {
        init(data);
    });

    socket.on('select', function (data) {
        selectAgent(data.x, data.y);
        console.log(data);
    });

    socket.on('pause', function (data) {
        _pause = !_pause;
    });

    socket.on('setParameters', function (data) {
        _world.setParameters(data);
    });

    socket.on('load', function (data) {
        load(data);
    });

});



setInterval(update, 100);