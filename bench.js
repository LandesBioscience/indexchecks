#!/usr/bin/env node
var argv = require('minimist')(process.argv.slice(2));
var fs = require('fs');
var util = require('util');
var request = require('request');
var cheerio = require('cheerio');
var colors = require('colors');
var html = require('html');

var request = request.defaults(
    {jar: true}
);

//default id sources
var idSources = {
    doi: "Sorry, this one's where we start for now"

};
var sources = {};
//default status sources
sources.statuses = {
    pubmed:   ["http://www.ncbi.nlm.nih.gov/pubmed/?term=[id]&report=docsum", "eid", '$("#maincontent .rprt .details ").text()'],
    pmc:  ["http://www.ncbi.nlm.nih.gov/pmc/?term=[id]", "doi", '$("#maincontent .doi").text().substring(5)'],
    reuters: ["http://thomsonreuters.com/is-difficult-to-scrape/[id]/", "reutid", null]

};
sources.ids = {
    pmi: {},
    pmc: {  // info for scraping to find an article's pmc id
        {
          id_key          : 'doi',
          urlPattern      : 'ncbi.nlm.nih.gov/pmc/?term=[id]',
          scrapePattern   : '$(".rprtid dd").text().substring(3)'
        }
    },
    pid: {},
    reu: {},
    eid: {},
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
        if(argv.v) { console.log("[ scraping resp ] ".yellow); }
        if (!matchResult){
            console.log("[error]".red + " could not generate  matchResult in srcScrape()");
            console.log(String(scrape));
            console.log(eval(String(scrape)));
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

srcFetch();
