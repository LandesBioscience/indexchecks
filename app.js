// app.js
// curl -X POST -H "Content-Type:application/json" -d '{"comment":"test", "line":2}' http://localhost:1337/article
// TODO: improve error logging, complete crape path, consolidate scrape code into a scraper object
//

var util    = require('util'),
    express = require('express'),
    mongo   = require('mongodb'),
    logfmt  = require("logfmt"),
    colors  = require('colors'),
    scraper = require('./scraper');


// Tell mongo to use dev db if none of heroku's environment variables are set
var mongoUri = process.env.MONGOLAB_URIi              ||
               process.env.MONGOHQ_URL                ||
               'mongodb://localhost/idx';

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

// Trying out the new Object.create syntax available in ES5
var Article = {
    save: function(){
        var junkFunction = {whatever: "screw you, i do what i want!"};
        saveArticle(this, function(err, doc){
            res.json(200, doc);
        });
    },
    init:  function(){
        saveArticle(this);     // Write obj to db
    }
};

// Helper functions
function cb(data){
    // This is just a placeholder Callback
    //console.log("[cb()]".red + util.inspect(data).blue);
}

function queryArticles(cb){
    mongo.Db.connect(mongoUri, function dbConnect(err, db) {
        db.collection('articles', function dbUse(er, collection) {
            cb(collection);
        });
    });
}

function articleCreate(doi, res, cb){
    // write article into db and instantiate scrapers
    var article = Object.create(Article);
    article.doi = doi;
    article.init();
    article = article.save(); // should get back the mongo record id... i'm thinkin?
    article.mesageForMatthew = "New article created, fetching status .";
    res.json(200, article);
}

function articleFetch(params, res, cb){
    idKey = params[0];
    idValue = params[1];
    mongo.Db.connect(mongoUri, function dbConnect(err, db) {
        db.collection('articles', function dbUse(er, collection) {
            var idString = "ids." + idKey;
            var queryObject = { };
            queryObject[idString] = idValue;
            // console.log(util.inspect(queryObject));
            collection.findOne(queryObject, function(error, article){
                // console.log(util.inspect(article));
                // search for existing article or create new one.
                if(!article){
                    article = new Article(idKey, idValue);
                    saveArticle(article);
                }
                res.json(200, article);
            });
        });
    });
}

function newArticle(article, cb){ // Not sure How this should act... should the server immediately respond to an article save with the saved article, or should it respons with a success message or what?
    mongo.Db.connect(mongoUri, function (err, db) {
        db.collection('articles', function dbWrite(err, collection) {
            // console.log(util.inspect(article));
            if(!article){
                cb(err, {error: "There was an error saving the article, perhaps and invalid doi?."}); 
                return;
            }
            collection.findOne({doi: article.doi}, {}, function(err, doc){
                //console.log("[newArticle() -- checking if article exists]".green);
                //console.log(util.inspect(doc).blue);
                //console.log(util.inspect(err).yellow);
                if(!doc){
                   doc = article;  // This is a new article. just using findAndModify because it returns the saved object

                } else {
                    // There is already an entry for this article, we're just going to add our most recent scrape data and save/respond_with that
                    for (var stat in article.stats){
                       doc.stats[stat] = article.stats[stat];
                    }
                }
                collection.findAndModify({doi: article.doi}, [], doc, {new:true, upsert:true}, function(err, doc){
                    cb(err, doc);
                    db.close();
                });
            });
        });
    });
}

function startScan(article){
    article.ids = exampleArticle.ids;
    // console.log(util.inspect(article));
    for(var source in article.sources){
        launchScraper(article, source, scrapeResults);
    }
}

function launchScraper(article, src, cb){
    var source = article.sources[src];
    var re = new RegExp("\\[id\\]");
    var url = article.sources[ src ].urlPattern;
    // console.log(util.inspect(article).red);
    kid = article.ids[String( article.sources[src].key )];
    url = url.replace( re, kid );
    var bits = [ article.ids.landes + "--->", "[ " + src + " ]", " " + url ];
    console.log(bits[0].white + bits[1].yellow + bits[2].blue ); // What? I want it to look pretty...
    request(url, function(error, response, body){
        cb(article, src, error, response, body);
    });
}

function scrapeResults(obj, cb){
    if (!obj.error && obj.response){
        var pattern = obj.source[2] || '$("#scrape-pattern-missing").text()';
        $ = cheerio.load(obj.body);
        var patternWarning = "<p id=\"scrape-pattern-missing\">No scrape pattern set for "+obj.source+"</p>"; // this will be the request going out, just passing to cb for now
        $('body').append(patternWarning);
        var status = eval(String(pattern)) || false;
        if (!status){
          //console.log(util.inspect(eval(String(pattern))));
        }
        var bits = [ obj.article.doi + "<---", "[ " + obj.source + " ]", obj.response.statusCode + ": ", " " + status ];
        //console.log(bits[0].white + bits[1].green + bits[2].white + bits[3].blue ); // What? I want it to look pretty...
        //console.log(util.inspect(obj.article));
        // get the success or failure and write to the db
        // need to record datetime and maybe an error message?
        cb(obj);
    } else {
        //console.log("error in scrapeResults(), ");
        ////console.log(util.inspect(obj.error));
    }
}

// Express code for routing etc.
app = express();
app.use(express.static(__dirname + '/public'));   // set the static files location /public/img will be /img for users
app.use(express.bodyParser());            // pull information from html in POST

app.configure(function (){
    app.use(express.logger('dev'));
});

app.post('/articles/all', function(req, res){
    queryArticles(function(articles){
        articles.distinct("doi", function(err, doc){
            var obj = {};
            obj.dois = doc;
            obj.messageToMatthew = 'that should work now.';
            res.json(200, obj);
        });
    });
});

app.post('/article', function(req, res){
    // This should be rewritten to accept a json object with one or more ids , and attempt to find a matching article in the db.
    // working on article add and scraping first
    if( req.body.doi ){
        queryArticles(function(articles){
            articles.findOne({ doi : req.body.doi }, function(err, doc){
                var response = !err ? doc : err;
                res.json(200, response);
            });
        });
    } else if( req.body.dois) { 
        queryArticles(function(articles){
           articles.find({ doi: { $in : req.body.dois }}, function(err, doc){
               doc.toArray(function(err, docs){
                  res.json(200, docs);
               });
           });
        });
    } else {
        var obj = {message: "malformed json object in request: expecting doi or array of dois"};
        res.json(400, obj);
    }
});

app.post('/article/scrape', function(req, res){ // post a doi or array of doi's to be added
    if( req.body.doi ){
        scraper.initialScrape(req.body.doi, function(err, article){
            newArticle(article, function(err, doc){
                res.json(200, doc);
            });
        });
    } else if( req.body.dois) { 
        var dois = req.body.dois;
        for (var i = 0; i < dois.length; i++ ){
            scraper.initialScrape(dois[i], function(err, article){
                newArticle(article, function(err, doc){
                    //console.log("[generating new article] ".green + doc.doi.blue);
                });
            });
        }
        res.json(200, {messageToMatthew: 'We\'ll get on that right away!'});
    } else {
       var obj = {"error": "malformed json object in request: expecting doi or array of dois"};
       res.json(400, obj);
    }
});

app.all('/sources', function(req, res){
    res.json(200, scraper.sources);
    ////console.log("spitting out sources".grey);
    //console.log(util.inspect(scraper).grey);
});

app.post('/please/nuke/the/database', function(req, res){
    if(req.body.pretty == 'please'){
        queryArticles(function(articles){
            articles.remove(function(err, doc){
                res.json(200, {message: 'Well, how can i refuse such a polite request...'});
            });
        });
    } else if(req.body.pretty == '...'){
        res.json(200, {message : 'pretty what?'});
    } else {res.json(404)}
});

app.get('/*', function(req, res){
    var obj = {};
    obj.message = "post some json!";
    res.json(200, obj);
});
app.listen(process.env.PORT || 1337);
