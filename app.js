// app.js
// TODO Get this guy listening on a socket for json objects
var util = require('util'),
    request = require('request'),
    express = require('express'),
    mongo = require('mongodb'),
    cheerio = require('cheerio'),
    colors = require('colors');

var request = request.defaults(
  {jar: true}
);

// Tell mongo to use dev db if none of heroku's environment variables are set
var mongoUri = process.env.MONGOLAB_URI ||
  process.env.MONGOHQ_URL ||
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


// Storing scraping info here in code.
// nameOfPattern: = [urlPattern, key, successPattern, failPattern]
var sources = {
    pm:   ["http://www.ncbi.nlm.nih.gov/pubmed/?term=[id]&report=docsum", "eid", '$("#maincontent .rprt .details ").text()'],
    pmc:  ["http://www.ncbi.nlm.nih.gov/pmc/?term=[id]", "doi", '$("#maincontent .doi").text().substring(5)'],
    reut: ["http://thomsonreuters.com/is-difficult-to-scrape/[id]/", "reutid", null]

};
function Source(sourceName){
    this.status = "pending";
    this.urlPattern = sources[sourceName][0];
    this.key = sources[sourceName][1];
    this.scrapePattern  = sources[sourceName][2];
}

function Article(articleID){
    this.ids = {
        landes : articleID,
        pm : null,
        pmc : null,
        doi: null,
        eid: null,
        reut : null
    }
    this.sources = {}
    for(var src in sources){
        this.sources[src] = new Source(src);
    }
}

function articleFetch(articleID, cb){
    mongo.Db.connect(mongoUri, function dbConnect(err, db) {
        db.collection('articles', function dbUse(er, collection) {
          // console.log('<------------------');
          collection.findOne({lid: articleID}, function(error, item){
            var ret = item || new Article(articleID);
            cb(ret);
          });
        });
    })
}

function articleSave(article){
    mongo.Db.connect(mongoUri, function (err, db) {
        db.collection('articles', function db_write(er, collection) {
            collection.insert(article, {safe: true}, function(er,rs) {if(er){console.log("[error]".red + er);}});
        });
    })
}

function articleGetStatus(lid) {
  // fetch article from db or use create new article
    articleFetch( lid, startScan);
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

// articleGetStatus(exampleArticle.ids.lid);
