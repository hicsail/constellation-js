/*global graph:true designEnumeration:true imparse:true*/
design = require('./designEnumeration');
imparse = require('imparse');
graphGOLDBAR = require('./graphGOLDBAR');

graphToSBOL = require('./sbol');
graphFromSBOL = require('./graphSBOL');
SBOLDocument = require('sboljs');
simplify = require('./simplifyOperators');
combineGraphs = require('./combineGraphs');
toGoldbar = require('./to_goldbar/toGoldbar');

const util = require('util');


const GRAMMAR_DEF = [{'Seq':[{'Then':[['Exp'],'.',['Seq']]},{'Then':[['Exp'],'then',['Seq']]},{'':[['Exp']]}]},{'Exp':[{'Or':[['Term'],'or',['Exp']]},{'And':[['Term'],'and',['Exp']]},{'':[['Term']]}]},{'Term':[{'OneOrMore':['one-or-more',['Term']]},{'ZeroOrMore':['zero-or-more',['Term']]},{'ZeroOrOne':['zero-or-one',['Term']]},{'ZeroOrOneSBOL':['zero-or-one-sbol',['Term']]},{'ZeroOrMoreSBOL':['zero-or-more-sbol',['Term']]},{'':['{',['Seq'],'}']},{'':['(',['Seq'],')']},{'Atom':[{'RegExp':'([A-Za-z0-9]|-|_)+'}]}]}];
const NODE = 'NODE';
const EDGE = 'EDGE';

/* * * * * * */
/*    MAIN   */
/* * * * * * */
/**
 * Runs constellation
 * @param designName Name of combinatorial design
 * @param langText Text with GOLDBAR specification input
 * @param categories Text with categories
 * @param combine String representing the chosen method of combining designs
 * @param numDesigns Maximum number of designs to output
 * @param maxCycles Maximum depth of cycles
 * @param representation Config variable representing which form of graph was requested (NODE vs. EDGE)
 * @returns {{stateGraph, designs: *, paths}}
 */
function goldbar(designName, langText, categories, combine, numDesigns, maxCycles = 1, representation) {
  categories = JSON.parse(categories);
  langText = JSON.parse(langText);
  // if (Object.keys(categories).length > 1) {
  //   throw new Error('Wrong Categories');
  // }
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

  if (Object.keys(parsed).length > 1) {
    gra = {};
    graSBOL = {};
    let stateGraphs = {};

    for (let i = 0; i < Object.keys(parsed).length; i++) {
      sparsed = simplify.simplifyTree(parsed[i]);
      sparsedSBOL = simplify.getSimplifiedSBOL(sparsed);

      if (representation === NODE) {
        gra[i] = graphGOLDBAR(sparsed, maxCycles, NODE);
        stateGraphs[i] = gra[i].stateGraph;
        graSBOL[i] = graphGOLDBAR(sparsedSBOL, maxCycles, NODE).stateGraph;

      } else if (representation === EDGE) {
        gra[i] = graphGOLDBAR(sparsed, maxCycles, EDGE);
        stateGraphs[i] = gra[i].stateGraph;
        // console.log(util.inspect(sparsedSBOL[i], {showHidden: false, depth: null}));
        graSBOL[i] = graphGOLDBAR(sparsedSBOL, maxCycles, NODE).stateGraph;

      } else {
        throw new Error('Invalid graph representation');
      }
    }

    let combinedGraph = combineGraphs.combineGraphs(combine, stateGraphs, categories);
    // let combinedGOLDBAR = toGoldbar(combinedGraph.graph);
    // let combinedGraphSBOL = combineGraphs(combine, graSBOL, categories);

    designs = design.enumerateDesigns(combinedGraph.paths, combinedGraph.categories, numDesigns);

    try {
      designName = String(designName).replace(/ /g, '_');
      sbolDoc = graphToSBOL(combinedGraph.graph, combinedGraph.categories, designName, numDesigns, maxCycles);
    } catch (error) {
      console.log(error);
    }
    return {stateGraph: combinedGraph.graph, designs: designs, paths: gra.paths, sbol: sbolDoc};

  } else {
    sparsed = simplify.simplifyTree(parsed[0]);
    sparsedSBOL = simplify.getSimplifiedSBOL(sparsed);

    if (representation === NODE) {
      gra = graphGOLDBAR(sparsed, maxCycles, NODE, categories[0]);
      graSBOL = graphGOLDBAR(sparsedSBOL, maxCycles, NODE, categories[0]).stateGraph;
      designs = design.enumerateDesigns(gra.paths, categories, numDesigns);

    } else if (representation === EDGE) {
      gra = graphGOLDBAR(sparsed, maxCycles, EDGE, categories[0]);
      graSBOL = graphGOLDBAR(sparsedSBOL, maxCycles, NODE, categories[0]).stateGraph;
      designs = design.enumerateDesigns(gra.paths, categories[0], numDesigns);

    } else {
      throw new Error('Invalid graph representation');
    }

    console.log(util.inspect(gra.stateGraph, {showHidden: false, depth: null}));

    try {
      designName = String(designName).replace(/ /g, '_');
      sbolDoc = graphToSBOL(graSBOL, categories[0], designName, numDesigns, maxCycles);
    } catch (error) {
      console.log(error);
    }
    return {stateGraph: gra.stateGraph, designs: designs, paths: gra.paths, sbol: sbolDoc};
  }

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
  for (let i = 0; i < Object.keys(langText).length; i++) {
    let specI = String(langText[i]).replace('\t', ' ');
    specI = specI.trim();
    langText[i] = imparse.parse(GRAMMAR_DEF, specI);
  }
  return langText;
}

function parseCategories(categories) {
  for (let i = 0; i < Object.keys(categories).length; i++) {
    categories[i] = JSON.parse(categories[i].replace('\t', ' '));
  }
  return categories;
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
