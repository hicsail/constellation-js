
graphDataOnEdges = require('./graphDataOnEdges');
graphDataOnNodes = require('./graphDataOnNodes');

const util = require('util');

const NODE = 'NODE';
const EDGE = 'EDGE';

/**
 * Generates graph based on parsed GOLDBAR object
 * @param parsedObject Parsed GOLDBAR object
 * @param maxCycles Integer: maximum number of cycles
 * @param representation String: which representation of the graph
 * @param categories Object: categories that the user input
 * @returns {{stateGraph: Object, paths: Array}}
 */
function createGraphFromGOLDBAR(parsedObject, maxCycles, representation, categories) {
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
    populateGraph(parsedObject, stateGraph, boundaryStack, representation, categories);
    graphDataOnEdges.addAcceptNodes(stateGraph, boundaryStack);
    // Get root of whole graph
    const root = graphDataOnEdges.generateRootNode(stateGraph, boundaryStack);
    // paths = [];
    paths = graphDataOnEdges.enumeratePaths(root, stateGraph, maxCycles);

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
 * @param representation String: which representation of the graph
 * @param categories Object: categories that the user input
 */
function populateGraph(parsed, stateGraph, boundaryStack, representation, categories) {
  // Handle if input is an atom
  if (parsed.Atom) {
    if (representation === NODE) {
      graphDataOnNodes.handleAtom(parsed.Atom, stateGraph, boundaryStack, categories);
    } else if (representation === EDGE) {
      graphDataOnEdges.handleAtom(parsed.Atom, stateGraph, boundaryStack, categories);
    }
    return;
  }

  // Handle if input is an or
  if (Array.isArray(parsed)) {
    for (let i = 0; i < parsed.length; i++) {
      populateGraph(parsed[i], stateGraph, boundaryStack, representation, categories);
    }
    return;
  }

  // Handle if input contains other or nested operations
  if (Object.keys(parsed).length > 0) {
    for (let operation in parsed) {
      populateGraph(parsed[operation], stateGraph, boundaryStack, representation, categories);
      if (representation === NODE) {
        graphDataOnNodes.handleOp(operation, stateGraph, boundaryStack);
      } else if (representation === EDGE) {
        graphDataOnEdges.handleOp(operation, stateGraph, boundaryStack);
      }
    }
  }
}

module.exports = createGraphFromGOLDBAR;
