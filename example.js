var scraper = require('./scraper'),
    async   = require('async'),
    util    = require('util');

var article = {};
article.doi = '10.4161/biom.25414';


var whatever = function(obj){
    console.log(util.inspect(obj));
};

var res = scraper.initialScrape(article.doi, whatever);
