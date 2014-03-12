// app.js
// TODO Get this guy listening on a socket for json objects
// curl -X POST -H "Content-Type:application/json" -d '{"comment":"test", "line":2}' http://localhost:1337/article

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

function loadSources(){
    var sources;
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
     init:  function(){
        // Write obj to db
        // begin initial scrape?
        // Other things?......
        console.log("[article init()]".green);
        console.log(util.inspect(this).blue);
    }
}

function articleCreate(doi, res, cb){
    // write article into db and instantiate scrapers
    var article = Object.create(Article);
    article.doi = doi;
    article.init();
    console.log(util.inspect(article).blue);
    resWithJSON(res, 200, article);
}

function resWithJSON(res, status, obj){
    res.status(status);
    res.write(JSON.stringify(obj));
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


function startScan(article){
    // just for testing... the initial scrape of landes still needs doing.
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

function scrapeResults(article, src, error, response, body){
    var pattern = article.sources[src].scrapePattern || '$("#scrape-pattern-missing").text()';
    $ = cheerio.load(body);
    var patternWarning = "<p id=\"scrape-pattern-missing\">No scrape pattern set for "+src+"</p>"; // this will be the request going out, just passing to cb for now
    $('body').append(patternWarning);
    var status = eval(String(pattern)) || false;
    if (!status){
      console.log(util.inspect(eval(String(pattern))));

    };
    var bits = [ article.ids.landes + "<---", "[ " + src + " ]", response.statusCode + ": ", " " + status ];
    console.log(bits[0].white + bits[1].green + bits[2].white + bits[3].blue ); // What? I want it to look pretty...
    //console.log(util.inspect(response));
    // get the success or failure and write to the db
    // need to record datetime and maybe an error message?
}

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
    var json = JSON.stringify(req.body);
    console.log(json);
    // Check the db for an article with id whatever
    articleFetch(req.params, res, cb)
});

app.post('/article/add', function(req, res){
    console.log("[create article]".green + JSON.stringify(req.body));
    // Check the db for an article with id whatever
    var jsonKey = Object.keys(req.body)[0];
    if( req.body.doi ){
        var doi = req.body.doi;
        console.log("create  one article");
        articleCreate(req.body.doi, res, cb); 
    } else if( req.body.dois) { 
        var dois = req.body['dois'];
        console.log(util.inspect(dois).blue);
        for (var i = 0; i < dois.length; i++ ){
            console.log("create  article " + dois[i]);
            articleCreate(dois[i], res, cb);
        }
    } else {
        res.status(400);
        res.write('{"error": "malformed json object in request: expecting doi or array of dois"}');
        res.end();
    }
});

function cb(data){
    // This is just a placeholder Callback
    console.log("[cb()]".red + util.inspect(data).blue)
};

app.listen(1337);
// articleGetStatus(exampleArticle.ids.lid);
