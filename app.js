// app.js
// curl -X POST -H "Content-Type:application/json" -d '{"comment":"test", "line":2}' http://localhost:1337/article
// TODO: improve error logging, complete crape path, consolidate scrape code into a scraper object
//

var util           = require('util'),
    fs             = require('fs'),
    request        = require('request'),
    express        = require('express'),
    mongo          = require('mongodb'),
    cheerio        = require('cheerio'),
    colors         = require('colors');

var request = request.defaults(
  {jar: true}
);

// Tell mongo to use dev db if none of heroku's environment variables are set
var mongoUri = process.env.MONGOLAB_URIi              ||
               process.env.MONGOHQ_URL                ||
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

var sources = {};

function loadSources(){
    fs.readFile('sources.json', 'utf8', function (err, data) {
        if (err) throw err;
        sources = JSON.parse(data);
    });
};

function Scraper(article){
    this.article = article;
    this.sources = {};
};

function Source(sourceName){
    this.status = "pending";
    this.urlPattern = sources[sourceName][0];
    this.key = sources[sourceName][1];
    this.scrapePattern  = sources[sourceName][2];
}

// Trying out the new Object.create syntax available in ES5
var Article = {
    save: function(){
        var junk = {whatever: "screw you, i do what i want!"};
        console.log("[article.save()]".green);
        console.log(util.inspect(this).grey);
        saveArticle(this);
    },
    init:  function(){
        saveArticle(this);     // Write obj to db
        pmcFetch(this); // start scraper chain
    }
};

// Helper functions
function cb(data){
    // This is just a placeholder Callback
    console.log("[cb()]".red + util.inspect(data).blue)
};

function pmcFetch(article){
    var source = sources['pmc'];
    // console.log(util.inspect(source));
    var re = new RegExp("\\[id\\]");
    var url = source[0];
    // console.log(util.inspect(article).red);
    url = url.replace( re, article.oid );
    // var bits = [ article.oid + "--->", "[ " + source + " ]", " " + url ];
    // console.log(bits[0].white + bits[1].yellow + bits[2].blue ); // What? I want it to look pretty...
    request(url, function(error, response, body){
        obj = {};obj.article = article;obj.source = source;obj.error = error;obj.response = response;obj.body = body;
         pmcScrape(obj);
    });
}

function pmFetch(article){
    var source = sources['pm'];
    // console.log(util.inspect(source));
    var re = new RegExp("\\[id\\]");
    var url = source[0];
    // console.log(util.inspect(article).red);
    url = url.replace( re, article.oid );
    // var bits = [ article.oid + "--->", "[ " + source + " ]", " " + url ];
    // console.log(bits[0].white + bits[1].yellow + bits[2].blue ); // What? I want it to look pretty...
    request(url, function(error, response, body){
        obj = {};obj.article = article;obj.source = source;obj.error = error;obj.response = response;obj.body = body;
         // pmcScrape(obj);
         console.log("end of the line, buddy: pmFetch");
    });
}

function articleCreate(doi, res, cb){
    // write article into db and instantiate scrapers
    var article = Object.create(Article);
    article.doi = doi;
    article.init();
    article.save();
    var obj = article; // trying to be verbose about it, maybe a waste
    obj.mesage = "New article created, fetching status .";
    res.json(200, obj);
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
                    var article = new Article(idKey, idValue);
                    saveArticle(article);
                }
                res.json(200, article);
            });
        });
    })
}

function saveArticle(article){
    mongo.Db.connect(mongoUri, function (err, db) {
        db.collection('articles', function dbWrite(err, collection) {
            collection.update({doi: article.doi}, article, {upsert: true}, function (err, resp){
                if(err){console.log('There was an error saving the article'.red);}
            });
        });
    });
}

function startScan(article){
    article.ids = exampleArticle.ids;
    // console.log(util.inspect(article));
    for(source in article.sources){
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
function pmcScrape(obj){
    // I feel like i could bundle some of this info up to keep the params smaller... TODO
    scrapeResults(obj, pmFetch);
}

function scrapeResults(obj, cb){
    if (!obj.error && obj.response){
        var pattern = obj.source[2] || '$("#scrape-pattern-missing").text()';
        $ = cheerio.load(obj.body);
        var patternWarning = "<p id=\"scrape-pattern-missing\">No scrape pattern set for "+obj.source+"</p>"; // this will be the request going out, just passing to cb for now
        $('body').append(patternWarning);
        var status = eval(String(pattern)) || false;
        if (!status){
          console.log(util.inspect(eval(String(pattern))));
        };
        var bits = [ obj.article.doi + "<---", "[ " + obj.source + " ]", obj.response.statusCode + ": ", " " + status ];
        console.log(bits[0].white + bits[1].green + bits[2].white + bits[3].blue ); // What? I want it to look pretty...
        console.log(util.inspect(obj.article));
        // get the success or failure and write to the db
        // need to record datetime and maybe an error message?
        cb(obj);
    } else {
        console.log("error in scrapeResults(), ");
        console.log(util.inspect(obj.error));
    }
}

// Express code for routing etc.
app = express();
app.use(express.static(__dirname + '/public'));   // set the static files location /public/img will be /img for users
app.use(express.bodyParser());            // pull information from html in POST

app.configure(function (){
    app.use(express.logger('dev'));
});

app.get('/article', function(req, res){
    // Look in the db and respond with the appropriate article
});

app.post('/article', function(req, res){
    // This should be rewritten to accept a json object with one or more ids , and attempt to find a matching article in the db.
    // working on article add and scraping first
    // if( req.body.doi ){
    //     var doi = req.body.doi;
    //     articleFetch(req.body.doi, res, cb); 
    // } else if( req.body.dois) { 
    //     var dois = req.body['dois'];
    //     for (var i = 0; i < dois.length; i++ ){
    //         console.log("create  article " + dois[i]);
    //         articleFetch(dois[i], res, cb);
    //     }
    // } else {
    //     var obj = {message: "malformed json object in request: expecting doi or array of dois"}
    //     res.json(400, obj);
    // }
    req.body.message = "Is there an echo in here?";
    res.json(200, req.body); // echoing for now
});

app.post('/article/add', function(req, res){
    if( req.body.doi ){
        var doi = req.body.doi;
        articleCreate(req.body.doi, res, cb); 
    } else if( req.body.dois) { 
        var dois = req.body['dois'];
        for (var i = 0; i < dois.length; i++ ){
            console.log("create  article " + dois[i]);
            articleCreate(dois[i], res, cb);
        }
    } else {
       var obj = {"error": "malformed json object in request: expecting doi or array of dois"};
       res.json(400, obj);
    }
});

loadSources();
app.listen(1337);
// articleGetStatus(exampleArticle.ids.lid);
