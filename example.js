var scraper = require('./scraper'),
    async   = require('async'),
    util    = require('util');

console.log(util.inspect(scraper));
var article = {};
article.doi = '10.4161/biom.25414';

async.series({
    pmc: function(cb){ 
        scraper.fetch(article, 'pmc','doi', cb);
    },
    eid: function(cb){ 
        scraper.fetch(article, 'eid','pmc', cb);
    },
    pmi: function(cb){ 
        scraper.fetch(article, 'pmi','eid', cb);
    },
    pubmed: function(cb){
        scraper.fetch(article, 'pubmed', 'pmi', cb);
    },
    pmcentral: function(cb){
        scraper.fetch(article, 'pmcentral', 'pmc', cb);
    }
},
function handleResults(err, results){
  for (var key in results){
      article[key] = results[key];
  }
  if(dev){ console.log(util.inspect(article).blue); }
  if(err){ console.log(err.red); }
});
