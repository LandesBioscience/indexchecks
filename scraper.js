#!/usr/bin/env node
var dev = (process.env.NODE_ENV == 'development'),
    argv = (dev) ? require('minimist')(process.argv.slice(2)): null,
    async   = require('async'),
    request = require('request'),
    cheerio = require('cheerio'),
    request = request.defaults( {jar: true} );


if (dev) {
    var util    = require('util'),
        colors  = require('colors'),
        html    = require('html');
}

exports.fetch = fetch;
exports.sources = sources;
exports.initialScrape = initialScrape;



var source = {};
//default status sources
var sources = {
    pubmed: {
        type: 'status',
        pmi: {
            urlPattern      : 'ncbi.nlm.nih.gov/pubmed/[id]?report=docsum',
            scrapePattern   : function($){
                return $(".rprtid dd").first().text();
            }
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
        pii: {
          type: 'json',
          urlPattern      : 'landesbioscience.com/api/articles/citation_txt/[id]',
          scrapePattern   : function(json){
              return json.full_citation.replace(/\s/g, "").split(";").map(function(item){return item.split(":");}).filter(function(item){return item[0] == "PMID";})[0][1];
            }
        },
        doi: {
          urlPattern      : 'dx.doi.org/[id]',
          scrapePattern   : function($){
              return $(".full_citation_text").text().replace(/\s/g, "").split(";").map(function(item){return item.split(":");}).filter(function(item){return item[0] == "PMID";})[0][1];

            }
        },
        eid: {
            urlPattern: 'ncbi.nlm.nih.gov/pubmed/?term=[id]&report=docsum',
            scrapePattern: '$(".rprt .title a").attr("href").substring(8)'
             }
    },
    pmc: {  // info for scraping to find an article's pmc id
        type: 'id',
        doi: {
            urlPattern      : 'pubmedcentral.nih.gov/utils/idconv/v1.0/?ids=[id]',
            scrapePattern   : '$("record").attr("pmcid").substring(3)'
        }
    },
    pii: {
        type: 'id',
        doi: {
            urlPattern      : 'dx.doi.org/[id]',
            scrapePattern   : function($){
                return $(".tweetpage").attr("article-id");
            }
        }
    },
    reu: {
        type: 'id'
    },
    eid: {
        type: 'id',
        pmc:{
            urlPattern      : 'ncbi.nlm.nih.gov/pmc/articles/PMC[id]/',
            scrapePattern   : '$(".citation-abbreviation").text().split(".")[0]+$(".citation-flpages").text().substring(1).split(".")[0]'
        }
    },
    doi: {
        type: 'id'
    }
};

function cliPut(string){
    if (dev) { console.log(String(string)); }
}

function fetch(article, scrapeTarget, scrapeKey, cb){
    var scrape = {};
    scrape.errors = [];
    scrape.source = sources[scrapeTarget][scrapeKey];
    scrape.type = sources[scrapeTarget].type;
    if (!scrape.source ) {cb(String("[ERROR] No source for scraping " + scrapeTarget + " with " + scrapeKey).red); return;}
    scrape.scrapeTarget = scrapeTarget;
    scrape.scrapeKey = scrapeKey;
    var token = new RegExp("\\[id\\]");
    if(article[scrapeKey]){ var scrapKeyValue = article[scrapeKey]; } else{cb(null, "error"); return; }

    try{ scrape.url = scrape.source.urlPattern.replace( token, String(article[scrapeKey]));}
    catch(e){scrape.url  = "error"; scrape.errors.push(e);}
    scrape.url = 'http://' + scrape.url;

    cliPut("[  urlPattern   ] ".blue + scrape.source.urlPattern.green);
    cliPut("[      id       ] ".blue + scrapeKey.green);
    cliPut("[      url      ] ".blue + scrape.url.green);

    request(String(scrape.url), function(err, res, body){
        cliPut("[ Fetching url  ] ".yellow);
        scrape.res = res;
        scrape.body = body;
        scrape.article = article;
        scrape.errors.push(err);
        scrapeResponse(scrape, cb);
    });
}

function scrapeResponse(scrape, cb){
    var toScrape = (scrape.source.type == 'json') ? JSON.parse(scrape.body) : cheerio.load(scrape.body);

    // The pattern should return the same result as the id given, if we give it a doi, write your pattern to return that same doi....
    try{
        scrape.match = scrape.source.scrapePattern(toScrape);
    }
    catch(e){
        cliPut(console.log(util.inspect(e).yellow));
        scrape.match = "error";
        scrape.errors.push(e);
    }

    if (!scrape.match){
        var err = {};
        err.message = "[error]".red + " could not generate  matchResult in scrapeResponse()";
        cliPut(err.message.red);
        scrape.errors.push(err);
    }
    scrape.result = {};
    scrape.result.match = scrape.match;
    // ajt: futzing here... 
    if(scrape.type == 'status'){
        if(!scrape.match){
            cliPut("There seems to be an error scraping ".red + scrape.scrapeTarget);
            scrape.errors.push({scrape: scrape, message: 'There seems to be an error scraping'}) ;
        }
        if(scrape.match == scrape.article[scrape.scrapeKey]){
            scrape.result.match = true;
        } else {
            scrape.result.match = false;
        }
    }
    scrape.article[scrape.scrapeTarget] = scrape.result.match;
    if(scrape.errors.length > 0){ scrape.result.errors = scrape.errors;}
   cliPut("[scrapeResponse] ".red + scrape.result.match); 
    cb(null, scrape.result.match);
}

// Use ./scraper.js -v --test to test the initial scrape route.
//
// 1. Use doi to scrape for other ids. store the results. scrape for status at various indices
// 2. Scrape for status at various indices.
// 3. Process the results into a new Article object.

function initialScrape(doi, cb){
    var article = {};
    article.doi = doi || '10.4161/biom.25414';
    article.save = function(){
      cliPut("Do our save here or something");

    };

    async.series({
        pii: function(cbb){ 
            fetch(article, 'pii','doi', cbb);
        },
        pmi: function(cbb){ 
            fetch(article, 'pmi','pii', cbb);
        },
        pubmed: function(cbb){
            fetch(article, 'pubmed', 'pmi', cbb);
        },
        pmcentral: function(cbb){
            fetch(article, 'pmcentral', 'doi', cbb);
        }
    },
    function writeResults(err, results){
      // massage these results to create the status object
      var stat = {};
          cliPut("initialScrapeResults before stats".yellow);
          cliPut(util.inspect(results).yellow);
      for (var prop in results){
          if(Object.prototype.toString.call(results[prop]) == '[object Boolean]'){
              stat[prop] =  results[prop];
              delete results[prop];
          }
      }
      results.stats = {};
      results.stats[new Date()] = stat;
      results.doi = doi;
      cb(null, results);
    });
};
