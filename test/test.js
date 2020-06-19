'use strict';

// const graphTests = require('./graphTests');
const enumerationTests = require('./enumerationTests');
const constellationTests = require('./constellationTests');
const simplificationTests = require('./simplificationTests');
const sbolTests = require('./sbolTests');
const graphCombinationTests = require('./graphCombinationTests');
const symbolicTests = require('./symbolicTests');

constellationTests();
enumerationTests();
simplificationTests();
sbolTests();
graphCombinationTests();
symbolicTests();
