var pg = require('pg');

pg.connect(process.env.DATABASE_URL, function(err, client) {
    var query = client.query('CREATE TABLE data (data text)');
    query.on('end', function() { client.end(); });
});