// app.js
var express = require('express');
var logfmt = require('logfmt');
var app = express();

app.use(logfmt.requestLogger());

var cheerio = require('cheerio');

$ = cheerio.load('<h2 class="title">Landes Indexing Queues:</h2>');
app.get('/', function(req, res) {
    res.send($.html());
});

var port = Number(process.env.PORT || 5555);
app.listen(port, function() {
    console.log("Listening on " + port);
});




