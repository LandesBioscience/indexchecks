#!/usr/bin/env node
var dev = (process.env.NODE_ENV == 'development'),
    argv = (dev) ? require('minimist')(process.argv.slice(2)): null,
    async   = require('async'),
    request = require('request'),
    util    = require('util'), 
    cheerio = require('cheerio');

try{
    scraperAuthInfo = require('./scraper-auth-info');
}
catch(e){
  cliPut("couldn't find scraper-auth-info.js.... but maybe you're not scraping anything with auth..");
}

var j = request.jar(),
    request = request.defaults( {jar: j} );

if (dev) {

    var colors  = require('colors'),
        html    = require('html');
}


function cliPut(string){
    if (dev) { console.log(String(string)); }
}

function fetchWithAuth(article, scrapeTarget, scrapeKey, cb){
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
var url = 'http://landesbioscience.com/admin/article/27943';
var src = 'landes';
function scrape(){
  request(url, function(err, res, body){
    var $ = cheerio.load(body);
    cliPut($('#title').text().green);
  });
}
function authenticate(srcName){
  cliPut(util.inspect(scraperAuthInfo).green);
  var authURL = scraperAuthInfo[srcName].url;
  var r = request.post(authURL, function optionalCallback (err, httpResponse, bod) {
    if (err) {
      return console.error('login failed:', err);
    }
    cliPut('Login successful!  Server responded with:'.green);
    //console.log(bod.substring(8000,16000).blue);
    // make scraperequest as always.
    scrape();
  });
  var form = r.form();
  for(var field in scraperAuthInfo[src].form){
    form.append(field, scraperAuthInfo[src].form[field]);
  }
}
authenticate(src);
