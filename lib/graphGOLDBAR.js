if (typeof window === 'undefined') {
  graph = require('./graph');
}

/**
 * Generates graph based on parsed GOLDBAR object
 * @param parsedObject Parsed GOLDBAR object
 * @returns {{stateGraph: Object, paths: Array}}
 */
function createGraphFromGOLDBAR(parsedObject, maxCycles) {
  if (maxCycles > 10) {
    throw new Error('Cycle depth is too high');
  }

  const stateGraph = {};    // Stores currently generated edges
  const boundaryStack = []; // Stores connected nodes in an object. Leaf nodes are stored in object.leaves

  // Generate graph
  populateGraph(parsedObject, stateGraph, boundaryStack);
  graph.addAcceptNodes(stateGraph, boundaryStack);
  // Get root of whole graph
  const root = graph.generateRootNode(stateGraph, boundaryStack);
  
  // Generate all paths
  // const paths = graph.enumeratePaths(root, stateGraph, maxCycles);

  return {stateGraph, paths:[]};
}

/**
 * Receives object from parsed GOLDBAR specification and recursively builds a graph
 * @param parsed The parsed GOLDBAR object
 * @param stateGraph Current graph
 * @param boundaryStack Boundary stack
 */
function populateGraph(parsed, stateGraph, boundaryStack) {
  // Handle if input is an atom
  if (parsed.Atom) {
    graph.handleAtom(parsed.Atom, stateGraph, boundaryStack);
    return;
  }

  // Handle if input is an or
  if (Array.isArray(parsed)) {
    for (let i = 0; i < parsed.length; i++) {
      populateGraph(parsed[i], stateGraph, boundaryStack);
    }
    return;
  }

  // Handle if input contains other or nested operations
  if (Object.keys(parsed).length > 0) {
    for (let operation in parsed) {
      populateGraph(parsed[operation], stateGraph, boundaryStack);
      graph.handleOp(operation, stateGraph, boundaryStack);
    }
  }
}

if (typeof window === 'undefined') {
  module.exports = createGraphFromGOLDBAR;
}
