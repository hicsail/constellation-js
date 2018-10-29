let express = require('express');
let app = express();
let path = require('path');
let bodyParser = require('body-parser');
let constellation = require('../lib/constellation');

app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: false }));
app.set('json spaces', 1);

app.use(function(req, res, next) {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept');
  next();
});

app.use(express.static(__dirname + '/static'));
// app.use(express.static(__dirname + '/static/css'));
// app.use(express.static(__dirname + '/static/js'));
app.use(express.static(__dirname + '/../lib/'));

const server = app.listen(8082, function () {
  console.log('Listening on port %d', server.address().port);
  console.log('http://localhost:8082/');
});

app.get('/', function(req,res) {
  res.sendFile((path.join(__dirname + '/static/client.html')));
});

app.post('/postSpecs', function(req,res) {
  let designName = req.body.designName;
  let langText = req.body.specification;
  let categories = req.body.categories;
  let numDesigns = req.body.numDesigns;
  let maxCycles = req.body.maxCycles;
  console.log('---Received new input---');
  console.log('Design Name: ', designName);
  console.log('Specification: ', langText);
  console.log('Categories: ', categories);
  console.log('numDesigns: ', numDesigns);
  console.log('maxCycles: ', maxCycles);

  let data;
  try {
    data = constellation(designName, langText, categories, numDesigns, maxCycles);
    res.status(200).send(data);
  } catch (error) {
    console.log(error);
    res.status(405).send(String(error));
  }
});
