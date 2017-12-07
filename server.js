const express = require('express');
const app = express();
const path = require('path');
const http = require('http');
const bodyParser = require('body-parser');

const constellation = require('./constellation');

app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: false }));
app.set('json spaces', 1);


app.use(function(req, res, next) {
  res.header("Access-Control-Allow-Origin", "*");
  res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept");
  next();
});


var server = app.listen(8082, function() {
  console.log('Listening on port %d', server.address().port);
  console.log('http://localhost:8082/');
});

app.get('/', function(req,res) {
  res.sendFile((path.join(__dirname + '/static/index.html')));
});


app.post('/postSpecs', function(req,res) {

    var langText = req.body.specification.trim();
    console.log("Received new specification", langText);
    var categories = req.body.categories;
    try {
      categories = JSON.parse(categories);
    } catch (err) {
      res.status(500).send(err);
    }

    var designObj = constellation(langText, categories, 40); 
    
    res.send(designObj);
});
