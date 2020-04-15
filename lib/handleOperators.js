uuidv4 = require('uuidv4');
graphDataOnNodes = require('./graphDataOnNodes');
graphDataOnEdges = require('./graphDataOnEdges');

const NODE = 'NODE';
const EDGE = 'EDGE';

// Constants for both NODE and EDGE
const EPSILON = 'epsilon';  // Denotes an intermediary node
const ATOM = 'atom';  // Denotes a GOLDBAR atom
const ACCEPT = 'accept';    // Denotes an end node/a global leaf
const ROOT = 'root';  // Denotes the unique root node

const OR = 'Or';
const OR_SBOL = 'OrSBOL';
const THEN = 'Then';
const ONE_MORE = "OneOrMore";
const ZERO_MORE = "ZeroOrMore";
const ZERO_ONE = 'ZeroOrOne';
const OR_MORE = "OrMore";
const ZERO_SBOL = 'ZeroOrMoreSBOL';
const ZERO_ONE_SBOL = 'ZeroOrOneSBOL';
const ONE = 'one';
const AND = 'And';
const MERGE = 'Merge';


/**
 * Calls appropriate graph functions not related to operators
 * @param stateGraph Current graph
 * @param boundaryStack Boundary stack
 * @param representation NODE or EDGE
 * @param atom Atom to add
 * @param categories Object: categories that the user input
 */
function handleAtom(atom, stateGraph, boundaryStack, categories, representation){
  switch(representation){
    case NODE:
      graphDataOnNodes.handleAtom(atom, stateGraph, boundaryStack, categories);
      break;
    default: //EDGE
      graphDataOnEdges.handleAtom(atom, stateGraph, boundaryStack, categories)
  }
}

/**
 * Calls appropriate graph functions related to operators
 * @param op Operator or accept or root
 * @param stateGraph Current graph
 * @param boundaryStack Boundary stack
 * @param representation NODE or EDGE
 * @param populateArgs Object: arguments to populateGraph (from graphGOLDBAR)
 */
function handleOp(op, stateGraph, boundaryStack, representation, populateArgs) {
  if(op === ONE){
    return;
  }

  switch(representation){
    case NODE:
      if(op === ACCEPT){
        return graphDataOnNodes.addAcceptNodes(stateGraph, boundaryStack);
      }
      if(op === ROOT){
        return graphDataOnNodes.generateRootNode(stateGraph, boundaryStack)
      }

      // Parent must always be added to the graph
      const parentId = uuidv4();
      stateGraph[parentId] = {id: parentId, text: EPSILON, type: EPSILON, component: EPSILON, edges:[], operator: []};

      if (op === OR) {
        graphDataOnNodes.handleOr(stateGraph, boundaryStack, parentId);
      }
      if (op === OR_SBOL) { // OR works the same for SBOL and GOLDBAR on NODE side
        graphDataOnNodes.handleOr(stateGraph, boundaryStack, parentId);
      }
      if (op === AND) {
        throw new Error('The AND operation is not supported in the NODE representation');
      }
      if (op === MERGE) {
        throw new Error('The MERGE operation is not supported in the NODE representation');
      }
      if (op === THEN) {
        graphDataOnNodes.handleThen(stateGraph, boundaryStack, parentId);
      }
      if (op === ZERO_MORE) {
        graphDataOnNodes.handleZeroOrMore(stateGraph, boundaryStack, parentId);
      }
      if (op === ZERO_ONE) {
        graphDataOnNodes.handleZeroOrOne(stateGraph, boundaryStack, parentId);
      }
      if (op === ONE_MORE) {
        graphDataOnNodes.handleOneOrMore(stateGraph, boundaryStack, parentId);
      }
      if (op === ZERO_SBOL) {
        graphDataOnNodes.handleZeroOrMoreSbol(stateGraph, boundaryStack, parentId);
      }
      if (op === ZERO_ONE_SBOL) {
        graphDataOnNodes.handleZeroOrOneSbol(stateGraph, boundaryStack, parentId);
      }
      break;

    default: //edge
      if(op === ACCEPT){
        graphDataOnEdges.addAcceptNodes(stateGraph, boundaryStack)
      }
      if(op === ROOT){
        return graphDataOnEdges.generateRootNode(stateGraph, boundaryStack)
      }
      if (op === OR) {
        graphDataOnEdges.handleOr(stateGraph, boundaryStack, representation, populateArgs);
      }
      if (op === OR_SBOL) { // need a different handleOr for SBOL to flatten ORs
        graphDataOnEdges.handleOrSBOL(stateGraph, boundaryStack);
      }
      if (op === AND) {
        graphDataOnEdges.handleAnd(stateGraph, boundaryStack, representation, populateArgs);
      }
      if (op === MERGE) {
        graphDataOnEdges.handleMerge(stateGraph, boundaryStack, representation, populateArgs);
      }
      if (op === THEN) {
        graphDataOnEdges.handleThen(stateGraph, boundaryStack);
      }
      if (op === ZERO_MORE) {
        graphDataOnEdges.handleZeroOrMore(stateGraph, boundaryStack);
      }
      if (op === ZERO_ONE) {
        graphDataOnEdges.handleZeroOrOne(stateGraph, boundaryStack);
      }
      if (op === ONE_MORE) {
        graphDataOnEdges.handleOneOrMore(stateGraph, boundaryStack);
      }
      if (op === ZERO_SBOL) {
        graphDataOnEdges.handleZeroOrMoreSbol(stateGraph, boundaryStack);
      }
  }
}

/**
 * Calls appropriate function for path enumeration
 * @param root The root node
 * @param stateGraph Current graph
 * @param maxCycles number of times to repeat through an orMore
 * @param representation NODE or EDGE
 * @returns {object} Array of paths through graph
 */
function enumerate(root, stateGraph, maxCycles, representation){
  switch(representation){
    case NODE:
      return graphDataOnNodes.enumeratePaths(root, stateGraph, maxCycles);

    default: //EDGE
      return graphDataOnEdges.enumeratePaths(root, stateGraph, maxCycles);
  }
}

/**
 * Minimizes a graph without enumerating paths
 * @param stateGraph
 * @param representation
 */
function collapse(stateGraph, representation) {
  switch (representation) {
    case NODE:
      let epsilonMap = graphDataOnNodes.getEpsilonParents(stateGraph);
      return graphDataOnNodes.collapseEpsilons(stateGraph, epsilonMap);
    case EDGE:
      return graphDataOnEdges.collapseEpsilons(stateGraph);
  }
}


module.exports = {
  handleAtom,
  handleOp,
  collapse,
  enumerate,
  EDGE,
  NODE,
  EPSILON,
  ATOM,
  ACCEPT,
  ROOT,
  OR,
  OR_SBOL,
  THEN,
  ONE_MORE,
  ZERO_MORE,
  ZERO_ONE,
  OR_MORE,
  ZERO_SBOL,
  ZERO_ONE_SBOL,
  ONE,
  AND,
  MERGE
};
