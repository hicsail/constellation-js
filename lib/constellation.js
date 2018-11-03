/*global graph:true designEnumeration:true imparse:true*/

if (typeof(window) === 'undefined') {
  graph = require('./graph');
  designEnumeration = require('./designEnumeration');
  imparse = require('imparse');
  sbol = require('./sbol');
}

const GRAMMAR_DEF = [{'Seq':[{'Then':[['Exp'],'.',['Seq']]},{'Then':[['Exp'],'then',['Seq']]},{'':[['Exp']]}]},{'Exp':[{'Or':[['Term'],'or',['Exp']]},{'And':[['Term'],'and',['Exp']]},{'':[['Term']]}]},{'Term':[{'OneOrMore':['one-or-more',['Term']]},{'ZeroOrMore':['zero-or-more',['Term']]},{'ZeroOrMoreSBOL':['zero-or-more-sbol',['Term']]},{'':['{',['Seq'],'}']},{'':['(',['Seq'],')']},{'Atom':[{'RegExp':'([A-Za-z0-9]|-|_)+'}]}]}];

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
const constellation = function (designName, langText, categories, numDesigns, maxCycles = 1) {
  if (isNaN(numDesigns)) {
    throw new Error('Invalid number of designs');
  }
  if (isNaN(maxCycles)) {
    throw new Error('Invalid cycle depth');
  }
  if (numDesigns < 0) {
    throw new Error('Number of designs is too low');
  }
  if (maxCycles < 0) {
    throw new Error('Cycle depth is too low');
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

  gra = graph(parsed, maxCycles);
  graSBOL = graph(parsedSBOL, maxCycles).stateGraph;
  designs = designEnumeration(gra.paths, categories, numDesigns);

  try {
    console.log(graSBOL);
    designName = String(designName).replace(/ /g, '_');
    sbolDoc = sbol(graSBOL, categories, designName);
    console.log(sbolDoc);
  } catch (error) {
    console.log(error);
  }

  return {stateGraph: gra.stateGraph, designs: designs, paths: gra.paths, sbol: sbolDoc};
};

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

if (typeof window === 'undefined') {
  module.exports = constellation;
}
