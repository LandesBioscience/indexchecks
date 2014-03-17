#!/usr/bin/env node
var argv = require('minimist')(process.argv.slice(2));
var fs = require('fs');
var util = require('util');
var async = require('async');
var request = require('request');
var cheerio = require('cheerio');
var colors = require('colors');
var html = require('html');
var request = request.defaults(
    {jar: true}
);

var sources = {};
//default status sources
sources = {
    pubmed: {
        type: 'status',
        pmi: {
            urlPattern      : 'ncbi.nlm.nih.gov/pubmed/[id]?report=docsum',
            scrapePattern   : '$(".rprtid dd").first().text()'
        }
    },
    pmcentral:    {
        type: 'status',
        doi: {
            urlPattern      : 'ncbi.nlm.nih.gov/pmc/?term=[id]',
            scrapePattern   : '$("#maincontent .doi").text().substring(5)'
        },
        pmc: {
            urlPattern      : 'ncbi.nlm.nih.gov/pmc/articles/[id]/',
            scrapePattern   : '$(".accid").text().substring(3)'
        }
    },
    reuters: {
        type: 'status',
        reu: {
            urlPattern      : 'thomsonreuters.com/is-difficult-to-scrape/[id]',
            scrapePattern   : '$("#magical-id .status-class")'
        }
    },
    pmi: {
        type: 'id',
        eid: {
            urlPattern: 'ncbi.nlm.nih.gov/pubmed/?term=[id]&report=docsum',
            scrapePattern: '$(".rprt .title a").attr("href").substring(8)'
             }
    },
    pmc: {  // info for scraping to find an article's pmc id
        type: 'id',
        doi: {
            urlPattern      : 'ncbi.nlm.nih.gov/pmc/?term=[id]',
            scrapePattern   : '$(".rprtid dd").text().substring(3)'
        }
    },
    pid: {
        type: 'id',
    },
    reu: {
        type: 'id',
    },
    eid: {
        type: 'id',
        pmc:{
            urlPattern      : 'ncbi.nlm.nih.gov/pmc/articles/PMC[id]/',
            scrapePattern   : '$(".citation-abbreviation").text().split(".")[0]+$(".citation-flpages").text().substring(1).split(".")[0]'
        }
    },
    doi: {}
};
// default article with alot of ids
var article = {
    pid:17717,
    pmi:3548250,
    pmc:3825233,
    doi:'10.4161/biom.25414',
    eid:'biomatter e25414',
    reut:null
};

var sourceName = argv.src || 'pubmed';

function srcFetch(){
    var req = {};
    req.urlPattern = argv.urlPattern || 'ncbi.nlm.nih.gov/pmc/?term=[id]' || 'google.com/search?q=[id]';
    if(argv.v) { console.log("[  urlPattern   ] ".blue + req.urlPattern.green); }
    req.urlPattern = 'http://' + req.urlPattern;
    req.id = argv.id || '10.4161/biom.25414' || 'rtfc coding';
    if(argv.v) { console.log("[      id       ] ".blue + req.id.green); }
    req.token = new RegExp("\\[id\\]");


    req.url = argv.url || req.urlPattern.replace( req.token, req.id );
    if(argv.v) { console.log("[      url      ] ".blue + req.url.green); }
    request(String(req.url), function(err, res, body){
    if(argv.v) { console.log("[ Fetching url  ] ".yellow); }
        req.err = err;
        req.res = res;
        req.body = body;
        srcScrape(req);
    });
}

function srcScrape(req){
    if (!req.error && req.res){
        var result = {};

        var token = new RegExp('\\\\');                                               //
        if (argv.scrape){ argv.scrape = String(argv.scrape).replace( token, '\\' );} // These lines accept a cheerio pattern from the cli via --pattern='$(pattern).etc()'
        var scrape = argv.scrape || '$(".rprt .supp .details .doi b").text()' || '$(".g .s").first().text().split("\\n")[1]';      //
        if(argv.v) { console.log("[    Scrape     ] ".blue + scrape.green); }

        $ = cheerio.load(req.body);
        var scrapeWarning = "<p id=\"scrape-pattern-missing\">No scrape pattern set for "+req.source+"</p>"; // this will be the request going out, just passing to cb for now
        $('body').append(scrapeWarning);
        // The pattern should return the same result as the id given, if we give it a doi, write your pattern to return that same doi....
        // This is also where we can step in and override the stored pattern for a source using argv, and turn it into a pattern tester. TODO:NEXT
        var matchResult = eval(String(scrape)) || false; // So this is where the pattern, stored as a string, is evaluated as code. 
        if (!matchResult){
            console.log("[error]".red + " could not generate  matchResult in srcScrape()");
        };
        result.url = req.url;
        result.body = req.body;
        result.match = matchResult;
        report(result);
        // get the success or failure and write to the db
        // need to record datetime and maybe an error message?
    } else {
        console.log("error in scrapeResults(), ".red);
        console.log(util.inspect(req.err));
    }
}

function report(result){
    console.log("[ match results ] ".blue + result.match.green);
    if (!argv.v && !(argv.urlPattern || argv.id || argv.url || argv.scrape)){ console.log("[ Or..... invoke with -v to see how that result was generate. ;-P ]".grey);}
    if (argv.v && !(argv.urlPattern || argv.id || argv.url || argv.scrape)) { 
        console.log("Any of these variables can be set from the cli, try the following: ".grey);
        console.log("./bench.js -v --id=\'rtfm\' --scrape=\'$(\".g .s\").first().text()\'".grey);
    }
    if (argv.b) { console.log(html.prettyPrint(result.body));}
}

function fetch(article, scrapeTarget, scrapeKey, cb){
    var scrape = sources[scrapeTarget][scrapeKey];
    scrape.type = sources[scrapeTarget].type;
    if (!scrape ) {cb(String("[ERROR] No source for scraping " + scrapeTarget + " with " + scrapeKey).red); return;}
    scrape.scrapeTarget = scrapeTarget;
    scrape.scrapeKey = scrapeKey;
    var token = new RegExp("\\[id\\]");
    scrape.url = scrape.urlPattern.replace( token, article[scrapeKey] );
    scrape.url = 'http://' + scrape.url;

    if(argv.v) { console.log("[  urlPattern   ] ".blue + scrape.urlPattern.green); }
    if(argv.v) { console.log("[      id       ] ".blue + scrapeKey.green); }
    if(argv.v) { console.log("[      url      ] ".blue + scrape.url.green); }

    request(String(scrape.url), function(err, res, body){
        if(argv.v) { console.log("[ Fetching url  ] ".yellow); }
        if(!err){
            scrape.res = res;
            scrape.body = body;
            scrape.article = article;
            scrapeResponse(scrape, cb);
        } else {
          cb(err, null);
        }
    });
}

function scrapeResponse(scrape, cb){
    //if(argv.v) { console.log("[ scrapePattern ] ".blue + scrape.scrapePattern.green); }

    $ = cheerio.load(scrape.body);
    var scrapeWarning = "<p id=\"scrape-pattern-missing\">No scrape pattern set for "+scrape.scrapeTarget+"</p>"; // this will be the request going out, just passing to cb for now
    $('body').append(scrapeWarning);
    // The pattern should return the same result as the id given, if we give it a doi, write your pattern to return that same doi....
    // This is also where we can step in and override the stored pattern for a source using argv, and turn it into a pattern tester. TODO:NEXT
    scrape.match = eval(String(scrape.scrapePattern)) || false; // So this is where the pattern, stored as a string, is evaluated as code. 
    if (!scrape.match){
        console.log("[error]".red + " could not generate  matchResult in scrapeResponse()");
        console.log(util.inspect(scrape.article));
        console.log(eval(String(scrape.scrapePattern)));
    };
    // Would like to add some validation in here... For the status scrape analog there's not realy a true/false, but could be written into the cheerio string.. maybe the same here......but that's really friggin long.
    console.log(util.inspect(scrape.type));
    if(scrape.match){
        if(scrape.type == 'status'){
            console.log("TREATIBG AS A STATUS SCRAPE");
            if(scrape.match = scrape.article[scrape.scrapeKey]){
                scrape.result = true;
            } else {
                scrape.result = false;
            }
        } else {
            console.log("WE HAVE SUCCESS! ".green + String(scrape.scrapeTarget).blue + "=".blue + scrape.match.yellow);
            // Send it off to the db to save.
            scrape.result = scrape.match;
        }
        scrape.article[scrape.scrapeTarget] = scrape.result;
        cb(null, scrape.result);
    } else {
        console.log("There seems to be an error scraping ".red + scrape.scrapeTarget);
    }
    return;
    // get the success or failure and write to the db
    // need to record datetime and maybe an error message?
}



// InitialScrape
// one stop controller for the initial scrape
// Going to be a series of scrapes, starting with a doi.
//
// Use doi to scrape for other ids. store the results. scrape for status at various indices
if(argv.full){
    var article = {};
    article.doi = argv.doi || '10.4161/biom.25414';

    //scrape pmc for pmid
    // fetchId(article, 'pmc','doi', scrapeId);
    async.series({
        pmc: function(cb){ 
            fetch(article, 'pmc','doi', cb);
        },
        eid: function(cb){ 
            fetch(article, 'eid','pmc', cb);
        },
        pmi: function(cb){ 
            fetch(article, 'pmi','eid', cb);
        },
        statusPubmed: function(cb){
            fetch(article, 'pubmed', 'pmi', cb);
        },
        statusPmcentral: function(cb){
            fetch(article, 'pmcentral', 'pmc', cb);
        }
    },
    function (err, results){
      console.log("So now we march forward".red);
      console.log(util.inspect(results).blue);
      if(err){console.log(err.red);}
    });
}
