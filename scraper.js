#!/usr/bin/env node
var dev = (process.env.NODE_ENV == 'development'),
    async   = require('async'),
    request = require('request'),
    cheerio = require('cheerio'),
    request = request.defaults( {jar: true} );

if (dev) {
    var argv    = require('minimist')(process.argv.slice(2)),
        util    = require('util'),
        colors  = require('colors'),
        html    = require('html');
}

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
    wormbase: {
        type: 'status',
        pmi: {
            urlPatter      : 'wormbase.org/search/paper/[id]',
            scrapePattern   : '("#overview-content .field-content").first().text()'
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

function cliPut(string){
    if (dev && argv.v) { console.log(String(string)); }
}

exports.fetch = function(article, scrapeTarget, scrapeKey, cb){
    var scrape = sources[scrapeTarget][scrapeKey];
    scrape.type = sources[scrapeTarget].type;
    if (!scrape ) {cb(String("[ERROR] No source for scraping " + scrapeTarget + " with " + scrapeKey).red); return;}
    scrape.scrapeTarget = scrapeTarget;
    scrape.scrapeKey = scrapeKey;
    var token = new RegExp("\\[id\\]");
    scrape.url = scrape.urlPattern.replace( token, article[scrapeKey] );
    scrape.url = 'http://' + scrape.url;

    cliPut("[  urlPattern   ] ".blue + scrape.urlPattern.green);
    cliPut("[      id       ] ".blue + scrapeKey.green);
    cliPut("[      url      ] ".blue + scrape.url.green);

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
    if (argv.v) { console.log("[ scrapePattern ] ".blue + scrape.scrapePattern.green); }

    $ = cheerio.load(scrape.body);
    var scrapeWarning = "<p id=\"scrape-pattern-missing\">No scrape pattern set for "+scrape.scrapeTarget+"</p>"; // this will be the request going out, just passing to cb for now
    $('body').append(scrapeWarning);
    // The pattern should return the same result as the id given, if we give it a doi, write your pattern to return that same doi....
    // This is also where we can step in and override the stored pattern for a source using argv, and turn it into a pattern tester. TODO:NEXT
    scrape.match = eval(String(scrape.scrapePattern)) || false; // So this is where the pattern, stored as a string, is evaluated as code. 

    if (!scrape.match){
        cliPut("[error]".red + " could not generate  matchResult in scrapeResponse()");
        cliPut(util.inspect(scrape.article));
    }
    // Would like to add some validation in here... For the status scrape analog there's not realy a true/false, but could be written into the cheerio string.. maybe the same here......but that's really friggin long.
    if(scrape.match){
        if(scrape.type == 'status'){
            if(scrape.match == scrape.article[scrape.scrapeKey]){
                scrape.result = true;
            } else {
                scrape.result = false;
            }
        } else {
            if(argv.v){console.log("WE HAVE SUCCESS! ".green + String(scrape.scrapeTarget).blue + "=".blue + scrape.match.yellow);}
            // Send it off to the db to save.
            scrape.result = scrape.match;
        }
        scrape.article[scrape.scrapeTarget] = scrape.result;
        cb(null, scrape.result);
    } else {
        cliPut("There seems to be an error scraping ".red + scrape.scrapeTarget);
    }
    return;
    // get the success or failure and write to the db
    // need to record datetime and maybe an error message?
}

// Use ./scraper.js -v --test to test the initial scrape route.
//
// 1. Use doi to scrape for other ids. store the results. scrape for status at various indices
// 2. Scrape for status at various indices.
// 3. Process the results into a new Article object.

exports.initialScrape = function(doi, cb){
    var article = {};
    article.doi = doi || '10.4161/biom.25414';
    article.save = function(){
      cliPut("Do our save here or something");
    };

    async.series({
        pmc: function(cbb){ 
            exports.fetch(article, 'pmc','doi', cbb);
        },
        eid: function(cbb){ 
            exports.fetch(article, 'eid','pmc', cbb);
        },
        pmi: function(cbb){ 
            exports.fetch(article, 'pmi','eid', cbb);
        },
        pubmed: function(cbb){
            exports.fetch(article, 'pubmed', 'pmi', cbb);
        },
        pmcentral: function(cbb){
            exports.fetch(article, 'pmcentral', 'pmc', cbb);
        }
    },
    function writeResults(err, results){
      // massage these results to create the status object
      var stat = {};
      for (var prop in results){
          if(Object.prototype.toString.call(results[prop]) == '[object Boolean]'){
              stat[prop] =  results[prop];
              delete results[prop];
          }
      }
      results.stats = {};
      results.stats[new Date()] = stat;
      results.stats.error = err;
      var ret = err || results;
      ret.doi = doi;
      cb(ret);
    });
};
