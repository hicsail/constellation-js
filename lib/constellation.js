/*global graph:true designEnumeration:true imparse:true*/

if (typeof(window) === 'undefined') {
  design = require('./designEnumeration');
  imparse = require('imparse');
  graphGOLDBAR = require('./graphGOLDBAR');

  // graphToSBOL = require('./sbol');
  // graphFromSBOL = require('./graphSBOL');
  // SBOLDocument = require('sboljs');
}

const GRAMMAR_DEF = [{'Seq':[{'Then':[['Exp'],'.',['Seq']]},{'Then':[['Exp'],'then',['Seq']]},{'':[['Exp']]}]},{'Exp':[{'Or':[['Term'],'or',['Exp']]},{'And':[['Term'],'and',['Exp']]},{'':[['Term']]}]},{'Term':[{'OneOrMore':['one-or-more',['Term']]},{'ZeroOrMore':['zero-or-more',['Term']]},{'ZeroOrMoreSBOL':['zero-or-more-sbol',['Term']]},{'':['{',['Seq'],'}']},{'':['(',['Seq'],')']},{'Atom':[{'RegExp':'([A-Za-z0-9]|-|_)+'}]}]}];
const NODE = "NODE";
const EDGE = "EDGE";

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
 * @returns {{stateGraph, designs: *, paths}}
 */
function goldbar(designName, langText, categories, numDesigns, maxCycles = 1, representation) {
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

  let parsed, parsedSBOL, gra, graSBOL, designs, sbolDoc;

  try {
    parsed = parseGoldbar(langText);
    //must use regex for pattern! If pattern is a string, only the first occurrence will be replaced
    parsedSBOL = parseGoldbar(langText.replace(/zero-or-more/gi, 'zero-or-more-sbol'));
    categories = parseCategories(categories);
  } catch (error) {
    throw new Error('Parsing error!')
  }

  if (representation === NODE) {
    gra = graphGOLDBAR(parsed, maxCycles, NODE);
    graSBOL = graphGOLDBAR(parsedSBOL, maxCycles, NODE).stateGraph;
    designs = design.enumerateDesigns(gra.paths, categories, numDesigns);
    
  } else if (representation === EDGE) {
    gra = graphGOLDBAR(parsed, maxCycles, EDGE);
    graSBOL = {};
    designs = [];
  } else {
    throw new Error('Invalid graph representation');
  }

  try {
    designName = String(designName).replace(/ /g, '_');
    // sbolDoc = graphToSBOL(graSBOL, categories, designName, numDesigns, maxCycles);
  } catch (error) {
    console.log(error);
  }

  return {stateGraph: gra.stateGraph, designs: designs, paths: gra.paths, sbol: {}};
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

if (typeof window === 'undefined') {
  module.exports = {
    goldbar,
    sbol
  };
}
