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
        console.log('exported resources to json file. maintain those there.');
    });
}

function srcFetch(article, source, cb){
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
         srcScrape(obj, cb);
    });
}

function srcScrape(obj, cb){
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
function printTest(obj){
    console.log(util.inspect(obj));

}
function test(src){
   console.log('testing:' + src);
   console.log(util.inspect(sources[src]));
   srcFetch(article, sources[src], printTest);
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
