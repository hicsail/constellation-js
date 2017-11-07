'use strict'


const express = require('express');
const app = express();
const path = require('path');
const http = require('http')

var server = app.listen(8081, function() {
    console.log('Ready on port %d', server.address().port);
});


app.use(express.static(__dirname + '/app'));

app.get('/', function(req, res) {
    res.sendFile((path.join(__dirname + '/app/index.html')));
});