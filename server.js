// server.js
// Listen for requests and spit out json.
var dev     = process.env.NODE_ENV,
    util    = require('util'),
    http    = require ('http'),
    express = require('express'),
    mongo   = require('mongodb');

// Tell mongo to use dev db if none of heroku's environment variables are set
var mongoUri = process.env.MONGOLAB_URI   ||
    process.env.MONGOHQ_URL               ||
    'mongodb://localhost/indexingQueues';

// Just some data for an article to keep on hand
var exampleArticle = {
    ids: {
        landes:17717,
        pm:3548250,
        pmc:3825233,
        doi:'10.4161/biom.25414',
        eid:'biomatter e25414',
        reut:null
    }
};

function Article(idKey, idValue){
    this.ids = {};
    this.ids[idKey] = idValue;
}

function articleFetch(params, res, cb){
    idKey = params[0];
    idValue = params[1];
    mongo.Db.connect(mongoUri, function dbConnect(err, db) {
        db.collection('articles', function dbUse(er, collection) {
            var idString = "ids." + idKey;
            var queryObject = { };
            queryObject[idString] = idValue;
            console.log(util.inspect(queryObject));
            collection.findOne(queryObject, function(error, article){
                console.log(util.inspect(article));
                // search for existing article or create new one.
                if(!article){
                    var article = new Article(idKey, idValue);
                    saveNewArticle(article);
                }
                res.writeHead(200, {"Content-Type":"text/json"});
                res.write(JSON.stringify(article));
                res.end();
            });
        });
    })
}

function saveNewArticle(article){
    // Stuff this full of stuff todo when a new article is created.
    launchIdScrape(article);
    mongo.Db.connect(mongoUri, function (err, db) {
        db.collection('articles', function dbWrite(er, collection) {
            collection.insert(article, {safe: true}, function(er,rs) {
              if(er){console.log("[error]".red + er);}
            });
        });
    })
}

function doiScrape(article){
    switch(article.ids){
    
    
    
    }

}
function respond(something){
    console.log(util.inspect(something));

}

app = express();

app.get('/article/*/*', function(req, res){
    console.log(util.inspect(req.params));
    // Check the db for an article with id whatever
    articleFetch(req.params, res, respond)
});

app.use('/', express.static(__dirname + '/public'));
app.listen(1337);
