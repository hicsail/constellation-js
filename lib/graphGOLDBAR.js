

const combineGraphs = require('./combineGraphs');
const util = require('util');
handleOp = require('./handleOperators');

const NODE = 'NODE';
const EDGE = 'EDGE';

/**
 * Generates graph based on parsed GOLDBAR object
 * @param parsedObject Parsed GOLDBAR object
 * @param maxCycles Integer: maximum number of cycles
 * @param representation String: which representation of the graph
 * @param categories Object: categories that the user input
 * @param andTolerance Tolerance level of AND (0-2)
 * @param mergeTolerance Tolerance level of MERGE (0-2)
 * @returns {{stateGraph: Object, paths: Array}}
 */
function createGraphFromGOLDBAR(parsedObject, maxCycles, representation, categories, andTolerance, mergeTolerance) {
  if (maxCycles > 10) {
    throw new Error('Cycle depth is too high');
  }

  let stateGraph = {};    // Stores currently generated edges
  let boundaryStack = []; // Stores connected nodes in an object. Leaf nodes are stored in object.leaves
  let paths = [];

  populateGraph(parsedObject, stateGraph, boundaryStack, representation, categories, maxCycles, andTolerance, mergeTolerance);
  handleOp.handleOp(handleOp.ACCEPT, stateGraph, boundaryStack, representation);
  const root = handleOp.handleOp(handleOp.ROOT, stateGraph, boundaryStack, representation);

  if (Object.keys(stateGraph).length === 1) {
    return {stateGraph: {}, paths:[]};
  }

  paths = handleOp.enumerate(root, stateGraph, maxCycles, representation);

  return {stateGraph, paths: paths};
}

/**
 * Receives object from parsed GOLDBAR specification and recursively builds a graph
 * @param parsed The parsed GOLDBAR object
 * @param stateGraph Current graph
 * @param boundaryStack Boundary stack
 * @param representation String: which representation of the graph
 * @param categories Object: categories that the user input
 * @param andTolerance Tolerance level of AND (0-2)
 * @param mergeTolerance Tolerance level of MERGE (0-2)
 * @param maxCycles int: maximum number of cycles
 */
function populateGraph(parsed, stateGraph, boundaryStack, representation, categories, maxCycles, andTolerance, mergeTolerance) {
  // Handle if input is an atom
  if (parsed.Atom) {
    handleOp.handleAtom(parsed.Atom, stateGraph, boundaryStack, categories, representation);
    return;
  }

  // if And, compute both sub-graphs and get combined graph
  // if (parsed.And) {
  //   let partialStateGraphs = {};
  //   let partialBoundaryStacks = [];
  //   let artificialCategories = {}; // repeat the categories for every partial graph (to work with existing combineGraphs)
  //   // find partial stateGraphs for each half of the And
  //   for (let i = 0; i < parsed.And.length; i++) {
  //     let partialGraph = {};
  //     let partialBoundary = [];
  //     populateGraph(parsed.And[i], partialGraph, partialBoundary, representation, categories, maxCycles, andTolerance, mergeTolerance);
  //     partialStateGraphs[i] = partialGraph;
  //     partialBoundaryStacks.push(partialBoundary);
  //     artificialCategories[i] = categories;
  //   }
  //
  //   // add accept and root nodes to the partial graphs (to work with existing combineGraphs)
  //   for (let i = 0; i < Object.keys(partialStateGraphs).length; i++) {
  //     let partial = partialStateGraphs[i];
  //     graphDataOnEdges.addAcceptNodes(partial, partialBoundaryStacks[i]);
  //     let root = graphDataOnEdges.generateRootNode(partial, partialBoundaryStacks[i]);
  //     graphDataOnEdges.enumeratePaths(root, partial, maxCycles);
  //   }
  //   // combine the graphs and add them to the larger stateGraph of the whole expression
  //   let combined = combineGraphs.combineGraphs('and', partialStateGraphs, artificialCategories, andTolerance);
  //   let combinedRoot = combineGraphs.findRoot(combined.graph);
  //   let combinedAccepts = combineGraphs.findAccepts(combined.graph);
  //   graphDataOnEdges.handleAnd(stateGraph, boundaryStack, combinedRoot, combinedAccepts, combined.graph);
  //   Object.assign(categories, combined.categories);
  //   return;
  //
  // }

  // Handle if input is an or
  if (Array.isArray(parsed)) {
    for (let i = 0; i < parsed.length; i++) {
      populateGraph(parsed[i], stateGraph, boundaryStack, representation, categories, maxCycles, andTolerance, mergeTolerance);
    }
    return;
  }

  // Handle if input contains other or nested operations
  if (Object.keys(parsed).length > 0) {
    for (let operation in parsed) {
      populateGraph(parsed[operation], stateGraph, boundaryStack, representation, categories, maxCycles, andTolerance, mergeTolerance);
      handleOp.handleOp(operation, stateGraph, boundaryStack, representation);
    }
  }
}

module.exports = createGraphFromGOLDBAR;
