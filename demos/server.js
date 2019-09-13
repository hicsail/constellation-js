let express = require('express');
let app = express();
let path = require('path');
let bodyParser = require('body-parser');
let FormData = require('form-data');
const Readable = require('stream').Readable;
const xmlparser = require('express-xml-bodyparser');

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

const server = app.listen(80, function () {
  console.log('Listening on port %d', server.address().port);
  console.log('http://localhost:80/');
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
    data = constellation.goldbar(designName, langText, categories, numDesigns, maxCycles);
    res.status(200).send(data);
  } catch (error) {
    console.log(error);
    res.status(405).send(String(error));
  }
});

app.post('/importSBOL', xmlparser(), async function(req,res) {
  let data;
  try {
    data = await constellation.sbol(req.rawBody);
    res.status(200).send(data);
  } catch (error) {
    console.log(error);
    res.status(500).send(String(error));
  }
});

app.post('/sendToKnox', function(req,res) {

  let form = new FormData();
  let sbolDocs = JSON.parse(req.body['sbolDocs[]']);

  for(let sbol of sbolDocs){
    let stream = new Readable();
    stream.push(sbol);
    stream.push(null);
    form.append('inputSBOLFiles[]', stream, {
      filename : 'test.xml',
      contentType: 'application/xml',
      knownLength: sbol.length
    }); //extra fields necessary
  }
  form.append('outputSpaceID', req.body.designName);

  form.submit('http://localhost:8080/sbol/importCombinatorial', function(error, result) {
    if (error) {
      console.log('Error!');
      res.status(405).send(String(error));
    } else{
      res.status(200).send(String(result));
    }
  });
});
