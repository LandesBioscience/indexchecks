function printJSON(json){
    //$('#result').html(JSON.stringify(json, null, '\t'));
    console.log(json);
}
function setTableHeaders(data){
  var headers = data.map(function(article){
      return Object.keys(article);
  });
  headers = headers.reduce(function(a, b){
        return a.concat(b);
  });
  headers = headers.reverse().filter(function (e, i, joined) {
        return headers.indexOf(e, i+1) === -1;
  }).reverse();
  for ( i = 0; i < headers.length; i++){
        $('#data thead tr').append('<th>' + headers[i] + '</th>');
  }
  return headers;
}
function setTableData(data, headers){
  var flatData = [];
  for(var i = 0; i < data.length; i++){
    flatData[i] = [];
    for(var ii = 0; ii < headers.length; ii++ ){
      flatData[i][ii] = data[i][headers[ii]] || null;
    }
  }
  console.log("well at least it's running!");
  var elements = $();
  for (i = 0; i < flatData.length; i++){
    var mongo_id = flatData[i][0];
    flatData[i] = flatData[i].map(function(item){
          return '<td>' + item + '</td>';
    });
    elements = elements.add('<tr id="' + mongo_id + '">' + flatData[i] + '</tr>');
  }
  $('#data tbody').append(elements);
}
function createTable(data){
  console.log("creating table");
  var headers = setTableHeaders(data);
  setTableData(data, headers);
}

$(function(){
  console.log("here we go dork.");
  $.post('/articles/all', function(json){
      printJSON(json);
      var articles = json.articles;
      var obj = {};
      obj.dois = [];
      for (var i = 0 ; i < articles.length ; i++){
        obj.dois[i] = articles[i].doi;
      }
      console.log(obj);
      $.post('/article', obj, function(json){
        printJSON(json);
        createTable(json);
      });
  });
  
  
  
});


