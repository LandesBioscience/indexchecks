var scraper = require('./scraper'),
    async   = require('async'),
    colors   = require('colors'),
    util    = require('util');

var article = {};
article.doi = '10.4161/biom.28283';


var whatever = function(err ,obj){
    console.log("------------Returned Object----------".yellow);
    console.log(util.inspect(obj).blue);
    console.log(util.inspect(err).red);
};

var res = scraper.initialScrape(article.doi, whatever);
