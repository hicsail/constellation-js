SBOLDocument = require('sboljs');
handleOp = require('./handleOperators');
combineGraphs = require('./combineGraphs');
const util = require('util');

//default values if annotation cannot be found in the SBOL
const MAX_CYCLE = 0;
const NUM_DESIGNS = 100;

const OPERATOR_URIS = {
  'http://sbols.org/v2#zeroOrMore': handleOp.ZERO_MORE,
  'http://sbols.org/v2#zeroOrOne': handleOp.ZERO_ONE,
  'http://sbols.org/v2#one': handleOp.ONE,
  'http://sbols.org/v2#oneOrMore': handleOp.ONE_MORE
};

/**
 * Generates graph based on combinatorial SBOL, handles case of multiple SBOL files
 * @param sbolArray Array of SBOL documents
 * @param representation NODE or EDGE
 * @param combineMethod
 * @param tolerance
 * @returns {{stateGraph: {}, paths: Array}}
 */
function createGraphFromSBOL(sbolArray, representation, combineMethod, tolerance) {
  let allResults = {};
  let allGraphs = {};
  let allCategories = {};
  let allMaxCycles = [];
  let allNumDesigns = [];
  let result;

  for (let i = 0; i < sbolArray.length; i++) {
    let sbolGraph = createGraphFromSingleSBOL(sbolArray[i], representation);
    allResults[i] = sbolGraph;
    allGraphs[i] = sbolGraph.stateGraph;
    allCategories[i] = sbolGraph.categories;
    allMaxCycles.push(sbolGraph.maxCycles);
    allNumDesigns.push(sbolGraph.numDesigns);
  }

  let maxCycles = Math.min(...allMaxCycles);
  let numDesigns = Math.max(...allNumDesigns);

  if (Object.keys(allResults).length > 1) {
    result = combineGraphs.combineGraphs(combineMethod, allGraphs, allCategories, tolerance);
    let root = combineGraphs.findRoot(result.graph);
    result.paths = handleOp.enumerate(root, result.graph, maxCycles, representation);
    return {stateGraph:result.graph, paths: result.paths, categories: result.categories, numDesigns};
  } else {
    result = allResults[0];
    return {stateGraph:result.stateGraph, paths: result.paths, categories: result.categories, numDesigns};
  }

}

/**
 * Generates graph based on combinatorial SBOL
 * @param sbol
 * @param representation NODE or EDGE
 * @return {{stateGraph, numDesigns: (*|number), paths: Array, categories: (*|{}), maxCycles: (*|number)}|undefined}
 */
function createGraphFromSingleSBOL(sbol, representation) {
  let stateGraph = {};    // Stores currently generated edges
  let boundaryStack = []; // Stores connected nodes in an object. Leaf nodes are stored in object.leaves

  //parse out categories
  let categories = getCategories(sbol);
  if (Object.keys(categories).length === 0){
    return undefined;
  }

  //get custom attributes
  let rootCV = getRootCombinatorialDerivation(sbol);

  // keep minimum if duplicate annotation
  let numDesigns = getMinAnnotation(rootCV, "numDesigns");
  numDesigns = numDesigns? numDesigns:NUM_DESIGNS;
  let maxCycles = getMinAnnotation(rootCV, "maxCycles");
  maxCycles = maxCycles? maxCycles:MAX_CYCLE;

  //create graph
  recurseVariableComponents(rootCV, stateGraph, boundaryStack, categories, representation);

  handleOp.handleOp(handleOp.ACCEPT, stateGraph, boundaryStack, representation);

  // Get root of whole graph
  const root = handleOp.handleOp(handleOp.ROOT, stateGraph, boundaryStack, representation);

  // Generate all paths
  const paths = handleOp.enumerate(root, stateGraph, maxCycles, representation);

  return {stateGraph, paths, categories, numDesigns, maxCycles};
}


function reformatCategories(categories) {
  let newCategories = {};
  for (let name in categories) {
    let cat = categories[name];
    newCategories[name] = {ids:cat, roles:[name]};
  }
  return newCategories;
}

function getMinAnnotation(rootCV, annotation){
  let annotations = rootCV.getAnnotations(annotation);
  if (!annotations || annotations.length === 0){
    return undefined;
  }

  let min = 0;
  for(let a of annotations){
    min = Math.min(min, Number.parseInt(a));
  }

  return min;
}

/**
 * @param combinatorialDerivation {CombinatorialDerivation}
 * @param stateGraph
 * @param boundaryStack
 * @param categories
 * @param representation NODE or EDGE
 */
function recurseVariableComponents(combinatorialDerivation, stateGraph, boundaryStack, categories, representation){
  let sortedVCs = sortVariableComponents(combinatorialDerivation);

  for(let v=0; v<sortedVCs.length; v++){

    const variableComponent = sortedVCs[v];
    const variantDerivs = variableComponent.variantDerivations;
    const collections = variableComponent.variantCollections;
    const hasVariants = collections.length > 0;

    //handle structure for just repeats
    if (variantDerivs.length === 1 && !hasVariants){
      for (let cv of variantDerivs) {
        recurseVariableComponents(cv, stateGraph, boundaryStack, categories, representation);
        handleOp.handleOp(OPERATOR_URIS[variableComponent.operator], stateGraph, boundaryStack, representation);
      }
    }

    // handle ORs
    else {
      // partial boundary stack to hold all OR-ed parts
      let partialBoundary = [];

      // OR if there is more than one collection
      // add to partial boundary stack
      for(let c=0; c<collections.length; c++) {
        handleOp.handleAtom([collections[c].displayId], stateGraph, partialBoundary, categories, representation);
      }

      // apply OR within the same VD or with variant (for collapsed OR)
      // first thing on the boundary stack is the thing being OR-ed -- add to partial boundary stack
      for(let i=0; i<variantDerivs.length; i++){
        recurseVariableComponents(variantDerivs[i], stateGraph, boundaryStack, categories, representation);
        partialBoundary.push(boundaryStack.pop());
      }

      // OR all the parts in the partial boundary stack at once (flattened)
      if (partialBoundary.length > 1) {
        handleOp.handleOp(handleOp.OR_SBOL, stateGraph, partialBoundary, representation);
      }
      boundaryStack.push(...partialBoundary);

      handleOp.handleOp(OPERATOR_URIS[variableComponent.operator], stateGraph, boundaryStack, representation);
    }

    // apply THEN within the same Combinatorial Derivation
    if (v > 0 && boundaryStack.length > 1){
      handleOp.handleOp(handleOp.THEN, stateGraph, boundaryStack, representation);
    }

  }
}

/**
 * Return sorted components by sequence constraints
 * @param combinatorialDerivation {CombinatorialDerivation}
 */
function sortVariableComponents(combinatorialDerivation){
  let orderedComponents = [];
  //make ordered components from sequence constraints
  let seqConstraints = combinatorialDerivation.template.sequenceConstraints;
  for (let constraint of seqConstraints){
    let subject = constraint.subject;
    let object = constraint.object;
    //subject precedes object
    let subIndex = orderedComponents.indexOf(subject);
    let objIndex = orderedComponents.indexOf(object);
    // if neither are found
    if (subIndex === -1 && objIndex === -1){
      orderedComponents.push(subject);
      orderedComponents.push(object);
    } else if(subIndex > -1){ //if subject is found, put object after it
      orderedComponents.splice(subIndex+1, 0, object);
    }else if(objIndex > -1){ //if obj is found, put subject before it
      orderedComponents.splice(objIndex, 0, subject);
    }
  }

  //order variable components based on components array
  let orderedVCs = [];
  let variableComponents = combinatorialDerivation.variableComponents;
  for (let vc of variableComponents){
    let index = orderedComponents.indexOf(vc.variable);
    orderedVCs.splice(index, 0, vc);
  }

  return orderedVCs;
}

/**
 * Get the Combinatorial Derivation that isn't referred to
 * by any other Variant Derivations
 * @param sbol {SBOLDocument}
 */
function getRootCombinatorialDerivation(sbol){
  let derivations = sbol.combinatorialDerivations;
  for (let combDerivation of sbol.combinatorialDerivations) {
    for (let vc of combDerivation.variableComponents){
      derivations = derivations.filter((element) => !vc.variantDerivations.includes(element));
    }
  }
  return derivations[0];
}

/**
 * Parse categories from SBOL collections
 * @param sbol {SBOLDocument}
 * @returns {{}}
 */
function getCategories(sbol){
  let categories = {};
  for (let collection of sbol.collections){
    let members = {};
    for (let member of collection.members){
      for (let role of member.roles) {
        let soURL = 'http://' + role._parts.hostname + role._parts.path;
        let toAdd = Object.keys(SBOLDocument.terms).find(role => SBOLDocument.terms[role] === soURL);
        if (toAdd in members) {
          members[toAdd].push(member.displayId);
        } else {
          members[toAdd] = [member.displayId];
        }
      }
    }
    categories[collection.displayId] = members;
  }
  return categories;
}

module.exports = createGraphFromSBOL;
