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
  let langText = req.body.specification;
  let categories = req.body.categories;
  console.log('Received new specification', langText, categories);

  let data;
  try {
    data = constellation(langText, categories, 40);
    res.status(200).send(data);
  } catch (error) {
    res.send(String(error));
  }
});
