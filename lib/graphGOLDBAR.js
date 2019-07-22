if (typeof window === 'undefined') {
  graphDataOnEdges = require('./graphDataOnEdges');
  graphDataOnNodes = require('./graphDataOnNodes');
}

const NODE = 'NODE';
const EDGE = 'EDGE';

/**
 * Generates graph based on parsed GOLDBAR object
 * @param parsedObject Parsed GOLDBAR object
 * @returns {{stateGraph: Object, paths: Array}}
 */
function createGraphFromGOLDBAR(parsedObject, maxCycles, representation) {
  if (maxCycles > 10) {
    throw new Error('Cycle depth is too high');
  }

  let stateGraph = {};    // Stores currently generated edges
  let boundaryStack = []; // Stores connected nodes in an object. Leaf nodes are stored in object.leaves
  let paths = [];

  if (representation === NODE) {
    populateGraph(parsedObject, stateGraph, boundaryStack, representation);
    graphDataOnNodes.addAcceptNodes(stateGraph, boundaryStack);
    const root = graphDataOnNodes.generateRootNode(stateGraph, boundaryStack);
    paths = graphDataOnNodes.enumeratePaths(root, stateGraph, maxCycles);
  
  } else if (representation === EDGE) {
    // Generate graph
    populateGraph(parsedObject, stateGraph, boundaryStack, representation);
    graphDataOnEdges.addAcceptNodes(stateGraph, boundaryStack);
    // Get root of whole graph
    const root = graphDataOnEdges.generateRootNode(stateGraph, boundaryStack);
    paths = [];
    // paths = graphDataOnEdges.enumeratePaths(root, stateGraph, maxCycles);

  } else {
    throw new Error('Invalid graph representation')
  }


  return {stateGraph, paths: paths};
}

/**
 * Receives object from parsed GOLDBAR specification and recursively builds a graph
 * @param parsed The parsed GOLDBAR object
 * @param stateGraph Current graph
 * @param boundaryStack Boundary stack
 */
function populateGraph(parsed, stateGraph, boundaryStack, representation) {
  // Handle if input is an atom
  if (parsed.Atom) {
    if (representation === NODE) {
      graphDataOnNodes.handleAtom(parsed.Atom, stateGraph, boundaryStack);
    } else if (representation === EDGE) {
      graphDataOnEdges.handleAtom(parsed.Atom, stateGraph, boundaryStack);
    }
    return;
  }

  // Handle if input is an or
  if (Array.isArray(parsed)) {
    for (let i = 0; i < parsed.length; i++) {
      populateGraph(parsed[i], stateGraph, boundaryStack, representation);
    }
    return;
  }

  // Handle if input contains other or nested operations
  if (Object.keys(parsed).length > 0) {
    for (let operation in parsed) {
      populateGraph(parsed[operation], stateGraph, boundaryStack, representation);
      if (representation === NODE) {
        graphDataOnNodes.handleOp(operation, stateGraph, boundaryStack);
      } else if (representation === EDGE) {
        graphDataOnEdges.handleOp(operation, stateGraph, boundaryStack);
      }
    }
  }
}

if (typeof window === 'undefined') {
  module.exports = createGraphFromGOLDBAR;
}
