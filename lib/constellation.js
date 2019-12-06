/*global graph:true designEnumeration:true imparse:true*/
design = require('./designEnumeration');
imparse = require('imparse');
graphGOLDBAR = require('./graphGOLDBAR');
graphDataOnEdges = require('./graphDataOnEdges');
uuidv4 = require('uuidv4');

graphToSBOL = require('./sbol');
graphFromSBOL = require('./graphSBOL');
SBOLDocument = require('sboljs');
simplify = require('./simplifyOperators');
combineGraphs = require('./combineGraphs');
toGoldbar = require('./to_goldbar/toGoldbar');


const GRAMMAR_DEF = [{'Seq':[{'Then':[['Exp'],'.',['Seq']]},{'Then':[['Exp'],'then',['Seq']]},{'':[['Exp']]}]},{'Exp':[{'Or':[['Term'],'or',['Exp']]},{'And':[['Term'],'and',['Exp']]},{'':[['Term']]}]},{'Term':[{'OneOrMore':['one-or-more',['Term']]},{'ZeroOrMore':['zero-or-more',['Term']]},{'ZeroOrOne':['zero-or-one',['Term']]},{'ZeroOrOneSBOL':['zero-or-one-sbol',['Term']]},{'ZeroOrMoreSBOL':['zero-or-more-sbol',['Term']]},{'':['{',['Seq'],'}']},{'':['(',['Seq'],')']},{'Atom':[{'RegExp':'([A-Za-z0-9]|-|_)+'}]}]}];
const NODE = 'NODE';
const EDGE = 'EDGE';
const util = require('util');

/* * * * * * */
/*    MAIN   */
/* * * * * * */
/**
 * Runs constellation
 * @param designName Name of combinatorial design
 * @param langText Text with GOLDBAR specification input
 * @param categories Text with categories
 * @param numDesigns Maximum number of designs to output
 * @param maxCycles Maximum depth of cycles
 * @param representation Config variable representing which form of graph was requested (NODE vs. EDGE)
 * @returns {{stateGraph, designs: *, paths}}
 */
async function goldbar(designName, langText, categories, numDesigns, maxCycles = 1, representation) {
  if (!numDesigns || isNaN(numDesigns) || numDesigns <= 0) {
    throw new Error('Invalid number of designs');
  }
  if (isNaN(maxCycles) || maxCycles < 0) {
    throw new Error('Invalid cycle depth');
  }
  if (!langText) {
    throw new Error('No input received');
  }
  if (!designName) {
    throw new Error('No design name is specified');
  }

  let parsed, parsedSBOL, gra, graSBOL, designs, sbolDoc, sparsed, sparsedSBOL;

  try {
    parsed = parseGoldbar(langText);
    categories = parseCategories(categories);
  } catch (error) {
    throw new Error('Parsing error!')
  }

  if (!validateCategories(categories)) {
    throw new Error('Every category must have ids and a role');
  }

  // simplify the parsed object based on the formalized simplification rules
  sparsed = simplify.simplifyTree(parsed);
  // graph the data on whatever representation is in the config file
  gra = graphGOLDBAR(sparsed, maxCycles, representation, categories);
  // if we get an empty graph back (invalid design) display a single epsilon node
  if (JSON.stringify(gra.stateGraph) === JSON.stringify({})) {
    let epsGraph = {};
    graphDataOnEdges.createEpsilonNode(epsGraph);
    return {stateGraph: epsGraph, designs: [], paths: [], sbol: null};
  }
  // if the original design has an AND or MERGE in it, convert to GOLDBAR and back to generate SBOL
  if (has(sparsed, 'And') || has(sparsed, 'Merge')) {
    let goldbar = await toGoldbar(gra.stateGraph);
    let newParsed = imparse.parse(GRAMMAR_DEF, goldbar);
    let newSimpParsed = simplify.simplifyTree(newParsed);
    sparsedSBOL = simplify.getSimplifiedSBOL(newSimpParsed);
    graSBOL = graphGOLDBAR(sparsedSBOL, maxCycles, NODE, categories).stateGraph;
  } else { // if no AND or MERGE, generate SBOL from original design
    sparsedSBOL = simplify.getSimplifiedSBOL(sparsed);
    graSBOL = graphGOLDBAR(sparsedSBOL, maxCycles, NODE, categories).stateGraph;
  }
  designs = design.enumerateDesigns(gra.paths, categories, numDesigns);

  try {
    designName = String(designName).replace(/ /g, '_');
    sbolDoc = graphToSBOL(graSBOL, categories, designName, numDesigns, maxCycles);
  } catch (error) {
    console.log(error);
  }
  return {stateGraph: gra.stateGraph, designs: designs, paths: gra.paths, sbol: sbolDoc};

}

// https://stackoverflow.com/questions/23808928/javascript-elegant-way-to-check-nested-object-properties-for-null-undefined
/**
 * Checks if a key exists in a nested object
 * @param obj Object
 * @param key String: key that you are looking for
 * @return {boolean} Whether the key exists
 */
function has(obj, key) {
  return key.split(".").every(function(x) {
    if(typeof obj != "object" || obj === null) {
      return false;
    } else {
      if (x in obj) {
        return true;
      } else {
        for (let k in obj) {
          if (has(obj[k], key)) {
            return true;
          }
        }
        return false;
      }
    }
  });
}


async function sbol(sbolDoc){
  let gra, designs;
  let sbol = await loadSBOL(sbolDoc);

  try {
    gra = graphFromSBOL(sbol);
  } catch (error) {
    console.log(error);
    throw new Error('SBOL Parsing error!')
  }

  if (!gra){
    throw new Error('No collections were found in the SBOL');
  }

  designs = design.enumerateDesigns(gra.paths, gra.categories, gra.numDesigns);

  return {stateGraph: gra.stateGraph, designs: designs, paths: gra.paths}
}

/**
 * Makes sure that every category has the ids and role fields
 * @param categories
 * @return {boolean}
 */
function validateCategories(categories) {
  for (let i in categories) {
    let cat = categories[i];
    if (!cat.hasOwnProperty('ids') || !cat.hasOwnProperty('role')) {
      return false;
    }
  }
  return true;
}

/**
 * Sanitises specification input and parses GOLDBAR
 * @param langText Text with GOLDBAR specification text
 * @returns {object} Parsed object
 */
function parseGoldbar(langText) {
  langText = String(langText).replace('\t', ' ');
  langText = langText.trim();
  return imparse.parse(GRAMMAR_DEF, langText);
}

function parseCategories(categories) {
  categories = String(categories).replace('\t', ' ');
  return JSON.parse(categories);
}

function loadSBOL(sbolData) {
  return new Promise((resolve) => {
    SBOLDocument.loadRDF(sbolData, (err, sbol) => {
      resolve(sbol);
    });
  });
}

module.exports = {
  goldbar,
  sbol
};
