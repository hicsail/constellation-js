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
async function goldbar(designName, langText, categories, combine, numDesigns, maxCycles = 1, representation) {
  categories = JSON.parse(categories);
  langText = JSON.parse(langText);
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
  } catch (error) {
    throw new Error('Parsing error!')
  }
  
  try {
    categories = parseCategories(categories);
  } catch (error) {
    throw new Error('Every category must have ids and a role');
  }
  

  if (Object.keys(parsed).length > 1) {
    gra = {};
    let stateGraphs = {};

    for (let i = 0; i < Object.keys(parsed).length; i++) {
      sparsed = simplify.simplifyTree(parsed[i]);
      gra[i] = graphGOLDBAR(sparsed, maxCycles, representation, categories[i]);
      stateGraphs[i] = gra[i].stateGraph;
    }

    let combinedGraph = combineGraphs.combineGraphs(combine, stateGraphs, categories);
    if (JSON.stringify(combinedGraph.graph) === JSON.stringify({})) {
      let epsGraph = {};
      graphDataOnEdges.createEpsilonNode(epsGraph);
      return {stateGraph: epsGraph, designs: [], paths: [], sbol: null};
    }
    let combinedGOLDBAR = await toGoldbar(combinedGraph.graph);
    let combParsed = imparse.parse(GRAMMAR_DEF, combinedGOLDBAR);
    let simpParsed = simplify.simplifyTree(combParsed);
    sparsedSBOL = simplify.getSimplifiedSBOL(simpParsed);
    graSBOL = graphGOLDBAR(sparsedSBOL, maxCycles, NODE, combinedGraph.categories).stateGraph;

    designs = design.enumerateDesigns(combinedGraph.paths, combinedGraph.categories, numDesigns);

    try {
      designName = String(designName).replace(/ /g, '_');
      sbolDoc = graphToSBOL(graSBOL, combinedGraph.categories, designName, numDesigns, maxCycles);

    } catch (error) {
      console.log(error);
    }
    return {stateGraph: combinedGraph.graph, designs: designs, paths: combinedGraph.paths, sbol: sbolDoc};

  } else {
    sparsed = simplify.simplifyTree(parsed[0]);
    gra = graphGOLDBAR(sparsed, maxCycles, EDGE, categories[0]);
    if (JSON.stringify(gra.stateGraph) === JSON.stringify({})) {
      let epsGraph = {};
      graphDataOnEdges.createEpsilonNode(epsGraph);
      return {stateGraph: epsGraph, designs: [], paths: [], sbol: null};
    }
    if (has(sparsed, 'And') || has(sparsed, 'Merge')) {
      let goldbar = await toGoldbar(gra.stateGraph);
      let newParsed = imparse.parse(GRAMMAR_DEF, goldbar);
      let newSimpParsed = simplify.simplifyTree(newParsed);
      sparsedSBOL = simplify.getSimplifiedSBOL(newSimpParsed);
      graSBOL = graphGOLDBAR(sparsedSBOL, maxCycles, NODE, categories[0]).stateGraph;
    } else {
      sparsedSBOL = simplify.getSimplifiedSBOL(sparsed);
      graSBOL = graphGOLDBAR(sparsedSBOL, maxCycles, NODE, categories[0]).stateGraph;
    }
    designs = design.enumerateDesigns(gra.paths, categories[0], numDesigns);

    try {
      designName = String(designName).replace(/ /g, '_');
      sbolDoc = graphToSBOL(graSBOL, categories[0], designName, numDesigns, maxCycles);
    } catch (error) {
      console.log(error);
    }
    return {stateGraph: gra.stateGraph, designs: designs, paths: gra.paths, sbol: sbolDoc};
  }

}

// https://stackoverflow.com/questions/23808928/javascript-elegant-way-to-check-nested-object-properties-for-null-undefined
function has(obj, key) {
  return key.split(".").every(function(x) {
    if(typeof obj != "object" || obj === null || ! x in obj)
      return false;
    obj = obj[x];
    return true;
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

function validateCategories(categories) {
  for (let i in categories) {
    let cats = categories[i];
    for (let j in cats) {
      let cat = cats[j];
      if (!cat.hasOwnProperty('ids') || !cat.hasOwnProperty('role')) {
        return false;
      }
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
  if (!validateCategories(categories)) {
    throw new Error();
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
