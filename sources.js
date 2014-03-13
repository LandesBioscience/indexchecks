fs = require('fs');
// Storing scraping info here in code.
// nameOfPattern: = [urlPattern, key, successPattern, failPattern]
var sources = {
    pm:   ["http://www.ncbi.nlm.nih.gov/pubmed/?term=[id]&report=docsum", "eid", '$("#maincontent .rprt .details ").text()'],
    pmc:  ["http://www.ncbi.nlm.nih.gov/pmc/?term=[id]", "doi", '$("#maincontent .doi").text().substring(5)'],
    reut: ["http://thomsonreuters.com/is-difficult-to-scrape/[id]/", "reutid", null]

};

fs.writeFile('sources.json',JSON.stringify(sources), function (err){
    if(err) throw err;
    console.log('exported resources to json file. maintain those there.');
});
