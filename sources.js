#!/usr/bin/env node
var argv = require('minimist')(process.argv.slice(2));
var fs = require('fs');
var util = require('util');
var request = require('request');
var cheerio = require('cheerio');
var colors = require('colors');

var request = request.defaults(
    {jar: true}
);
// Storing scraping info here in code.
// nameOfPattern: = [urlPattern, key, successPattern, failPattern]
var sources = {
    pm:   ["http://www.ncbi.nlm.nih.gov/pubmed/?term=[id]&report=docsum", "eid", '$("#maincontent .rprt .details ").text()'],
    pmc:  ["http://www.ncbi.nlm.nih.gov/pmc/?term=[id]", "doi", '$("#maincontent .doi").text().substring(5)'],
    reut: ["http://thomsonreuters.com/is-difficult-to-scrape/[id]/", "reutid", null]

};

var article = {
    pid:17717,
    pmi:3548250,
    pmc:3825233,
    doi:'10.4161/biom.25414',
    eid:'biomatter e25414',
    reut:null
};

function exportJson(){
    fs.writeFile('sources.json',JSON.stringify(sources), function (err){
        if(err) throw err;
        console.log('exported resources to json file. maintain those there.'.green);
    });
}

function srcFetch(article, sourceName, cb){
    var source = sources[sourceName];
    // console.log(util.inspect(source));
    var re = new RegExp("\\[id\\]");
    var url = argv.url || source[0];
    // console.log(util.inspect(article).red);
    var id_key = source[1];
    url = String(url).replace( re, article[id_key] );
    var bits = [ article.doi + "--->", "[ " + url + " ]"];
    console.log("to scrape the status of " );
    console.log("   ID  --> ".white + "[   URL   ]".yellow ); // What? I want it to look pretty...
    console.log(bits[0].white + bits[1].yellow ); // What? I want it to look pretty...
    request(url, function(error, response, body){
        obj = {};obj.article = article;obj.source = source;obj.error = error;obj.response = response;obj.body = body;
         srcScrape(obj, cb);
    });
}

function srcScrape(obj, cb){
    if (!obj.error && obj.response){
        var pattern = argv.pattern || obj.source[2] || '$("#scrape-pattern-missing").text()';
        $ = cheerio.load(obj.body);
        var patternWarning = "<p id=\"scrape-pattern-missing\">No scrape pattern set for "+obj.source+"</p>"; // this will be the request going out, just passing to cb for now
        $('body').append(patternWarning);
        // The pattern should return the same result as the id given, if we give it a doi, write your pattern to return that same doi....
        // This is also where we can step in and override the stored pattern for a source using argv, and turn it into a pattern tester. TODO:NEXT
        var matchResult = eval(String(pattern)) || false; // So this is where the pattern, stored as a string, is evaluated as code. 
        if (!matchResult){
            console.log("[error]".red + " could not generate  matchResult in srcScrape()");
            console.log(util.inspect(eval(String(pattern))));
        };
        var articleStatus = (matchResult == obj.article.doi) || false;
        var bits = [ obj.article.doi + "<---", "[ " + pattern + " ]", obj.response.statusCode + ": ", " " + articleStatus ];
        var result = {};
        result.articleStatus = articleStatus;
        var bits = [ "doi: " + article.doi, " [ " + obj.source[1] + " ]<---", "[ status: " + articleStatus + " ]"];
        console.log(bits[0].white + bits[1].blue , bits[2].blue); // What? I want it to look pretty...

        // get the success or failure and write to the db
        // need to record datetime and maybe an error message?
        cb(result);
    } else {
        console.log("error in scrapeResults(), ".red);
        console.log(util.inspect(obj.error));
    }
}
function printTest(result){
    // console.log(util.inspect(result));
    console.log("finished");

}
function test(src){
   srcFetch(article, src, printTest);
}

if(argv.test){
    test(argv.test);
} else if(argv._[0] == 'export'){
    exportJson();
} else {
    console.log("use $./sources.js export; to export sources json file");
    console.log("current sources:");
    console.log(util.inspect(sources));
}
