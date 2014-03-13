#!/usr/bin/env node
var argv = require('minimist')(process.argv.slice(2));
var fs = require('fs');
var util = require('util');
// Storing scraping info here in code.
// nameOfPattern: = [urlPattern, key, successPattern, failPattern]
var sources = {
    pm:   ["http://www.ncbi.nlm.nih.gov/pubmed/?term=[id]&report=docsum", "eid", '$("#maincontent .rprt .details ").text()'],
    pmc:  ["http://www.ncbi.nlm.nih.gov/pmc/?term=[id]", "doi", '$("#maincontent .doi").text().substring(5)'],
    reut: ["http://thomsonreuters.com/is-difficult-to-scrape/[id]/", "reutid", null]

};

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

function exportJson(){
    fs.writeFile('sources.json',JSON.stringify(sources), function (err){
        if(err) throw err;
        console.log('exported resources to json file. maintain those there.');
    });
}

if(argv.src){
    console.log('source is:'+argv.src);
} else if(argv._[0] == 'export'){
    exportJson();
} else {
    console.log("use $./sources.js export; to export sources json file");
    console.log("current sources:");
    console.log(util.inspect(sources));
}
