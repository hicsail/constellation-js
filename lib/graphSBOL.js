if (typeof window === 'undefined') {
  SBOLDocument = require('sboljs');
  graph = require('./graph');
}

//default values if annotation cannot be found in the SBOL
const MAX_CYCLE = 0;
const NUM_DESIGNS = 100;

const OPERATOR_URIS = {
  'http://sbols.org/v2#zeroOrMore': graph.ZERO_MORE,
  'http://sbols.org/v2#one': graph.ONE,
  'http://sbols.org/v2#oneOrMore': graph.ONE_MORE
};

/**
 * Generates graph based on combinatorial SBOL
 * @param sbol {SBOLDocument}
 * @returns {{stateGraph: {}, paths: Array}}
 */
function createGraphFromSBOL(sbol) {

  const stateGraph = {};    // Stores currently generated edges
  const boundaryStack = []; // Stores connected nodes in an object. Leaf nodes are stored in object.leaves

  //parse out categories
  const categories = getCategories(sbol);
  if (Object.keys(categories).length === 0){
    return undefined;
  }

  //get custom attributes
  let rootCV = getRootCombinatorialDerivation(sbol);

  //todo not deterministic, will return the first annotation that matches
  let numDesigns = rootCV.getAnnotation("numDesigns")? rootCV.getAnnotation("numDesigns"): NUM_DESIGNS;
  let maxCycles = rootCV.getAnnotation("maxCycles")? rootCV.getAnnotation("maxCycles"): MAX_CYCLE;

  //create graph
  recurseVariableComponents(rootCV, stateGraph, boundaryStack);
  graph.addAcceptNodes(stateGraph, boundaryStack);

  // Get root of whole graph
  const root = graph.generateRootNode(stateGraph, boundaryStack);

  // Generate all paths
  const paths = graph.enumeratePaths(root, stateGraph, maxCycles);

  return {stateGraph, paths, categories, numDesigns};
}

/**
 * @param combinatorialDerivation {CombinatorialDerivation}
 * @param stateGraph
 * @param boundaryStack
 */
function recurseVariableComponents(combinatorialDerivation, stateGraph, boundaryStack){
  let sortedVCs = sortVariableComponents(combinatorialDerivation);

  for (let variableComponent of sortedVCs) {

    // recurse through variant derivations
    let variantDerivs = variableComponent.variantDerivations;

    let hasVariants = variableComponent.variants.length > 0 && variableComponent.variantCollections.length > 0;

    //handle structure for just repeats
    if (variantDerivs.length === 1 && !hasVariants){
      for (let cv of variantDerivs) {
        recurseVariableComponents(cv, stateGraph, boundaryStack);
        graph.handleOp(OPERATOR_URIS[variableComponent.operator], stateGraph, boundaryStack);
      }
    }

    else {
      const collections = variableComponent.variantCollections;
      for (let c of collections){
        graph.handleAtom([c.displayId], stateGraph, boundaryStack);
        if (collections.length > 1 && boundaryStack.length > 1){
          graph.handleOp(graph.OR, stateGraph, boundaryStack);
        }
      }

      for (let cv of variantDerivs) {
        recurseVariableComponents(cv, stateGraph, boundaryStack);
        graph.handleOp(graph.OR, stateGraph, boundaryStack);
      }

      graph.handleOp(OPERATOR_URIS[variableComponent.operator], stateGraph, boundaryStack);
    }

    if (boundaryStack.length > 1){
      graph.handleOp(graph.THEN, stateGraph, boundaryStack);
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
    let members = [];
    for (let member of collection.members){
      members.push(member.displayId);
    }
    categories[collection.displayId] = members;
  }
  return categories;
}

// /**
//  * Get all roles associated with a list of Collections
//  * @param collections {Collection []}
//  * @param roles {Set}
//  */
// function getCollectionsRoles(collections, roles){
//   for (let c of collections){
//     for (let v of variants){
//       for (let r of v.roles){
//         let soURL = 'http://' + r._parts.hostname + r._parts.path;
//         role = Object.keys(SBOLDocument.terms).find(key => SBOLDocument.terms[key] === soURL);
//         roles.add(role);
//       }
//     }
//   }
// }

if (typeof window === 'undefined') {
  module.exports = createGraphFromSBOL;
}
