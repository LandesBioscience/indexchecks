var fs = require('fs'),
    request = require('request'),
    color = require('colors');

var r = request.defaults({uri:'http://127.0.0.1:1337/article/add', method:'POST'});

var dois = [];
fs.readFile('./landes_dois.csv',{encoding:'utf8'}, function(err, data){
    dois = data.split("\n");
    dois.shift();
    console.log(dois[0].red);
    dois = dois.map(function(doi){
        return doi;
    });

    for(var i = 0; i < dois.length; i+=20){
        var ii = i+20;
        var iii = dois.length -1;
        var range = (i+20 < dois.length) ? dois.slice(i, ii) : dois.slice(i, iii);
        // console.log(range.blue);
        //console.log(range);
        // console.log(String(i).blue + " - " + String(i+20).blue);
        post20(range);
    }
});



function post20(dois){
    obj = {};
    obj.dois = dois;
    r.post({json: obj});
}
