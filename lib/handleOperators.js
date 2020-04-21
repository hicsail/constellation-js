uuidv4 = require('uuidv4');
graphDataOnNodes = require('./graphDataOnNodes');
graphDataOnEdges = require('./graphDataOnEdges');
constants = require('./constants');


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
    case constants.NODE:
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
 * @param tolerance number: tolerance level for AND
 */
function handleOp(op, stateGraph, boundaryStack, representation, populateArgs, tolerance) {
  if(op === constants.ONE){
    return;
  }

  switch(representation){
    case constants.NODE:
      if(op === constants.ACCEPT){
        return graphDataOnNodes.addAcceptNodes(stateGraph, boundaryStack);
      }
      if(op === constants.ROOT){
        return graphDataOnNodes.generateRootNode(stateGraph, boundaryStack)
      }

      // Parent must always be added to the graph
      const parentId = uuidv4();
      stateGraph[parentId] = {id: parentId, text: constants.EPSILON, type: constants.EPSILON, component: constants.EPSILON, edges:[], operator: []};

      if (op === constants.OR) {
        graphDataOnNodes.handleOr(stateGraph, boundaryStack, parentId);
      }
      if (op === constants.OR_SBOL) { // OR works the same for SBOL and GOLDBAR on NODE side
        graphDataOnNodes.handleOr(stateGraph, boundaryStack, parentId);
      }
      if (op === constants.AND) {
        throw new Error('The AND operation is not supported in the NODE representation');
      }
      if (op === constants.MERGE) {
        throw new Error('The MERGE operation is not supported in the NODE representation');
      }
      if (op === constants.THEN) {
        graphDataOnNodes.handleThen(stateGraph, boundaryStack, parentId);
      }
      if (op === constants.ZERO_MORE) {
        graphDataOnNodes.handleZeroOrMore(stateGraph, boundaryStack, parentId);
      }
      if (op === constants.ZERO_ONE) {
        graphDataOnNodes.handleZeroOrOne(stateGraph, boundaryStack, parentId);
      }
      if (op === constants.ONE_MORE) {
        graphDataOnNodes.handleOneOrMore(stateGraph, boundaryStack, parentId);
      }
      if (op === constants.ZERO_SBOL) {
        graphDataOnNodes.handleZeroOrMoreSbol(stateGraph, boundaryStack, parentId);
      }
      if (op === constants.ZERO_ONE_SBOL) {
        graphDataOnNodes.handleZeroOrOneSbol(stateGraph, boundaryStack, parentId);
      }
      break;

    default: //edge
      if(op === constants.ACCEPT){
        graphDataOnEdges.addAcceptNodes(stateGraph, boundaryStack)
      }
      if(op === constants.ROOT){
        return graphDataOnEdges.generateRootNode(stateGraph, boundaryStack)
      }
      if (op === constants.OR) {
        graphDataOnEdges.handleOr(stateGraph, boundaryStack, representation, populateArgs);
      }
      if (op === constants.OR_SBOL) { // need a different handleOr for SBOL to flatten ORs
        graphDataOnEdges.handleOrSBOL(stateGraph, boundaryStack);
      }
      if (op === constants.AND) {
        graphDataOnEdges.handleAnd(stateGraph, boundaryStack, representation, populateArgs, tolerance);
      }
      if (op === constants.MERGE) {
        graphDataOnEdges.handleMerge(stateGraph, boundaryStack, representation, populateArgs);
      }
      if (op === constants.THEN) {
        graphDataOnEdges.handleThen(stateGraph, boundaryStack);
      }
      if (op === constants.ZERO_MORE) {
        graphDataOnEdges.handleZeroOrMore(stateGraph, boundaryStack);
      }
      if (op === constants.ZERO_ONE) {
        graphDataOnEdges.handleZeroOrOne(stateGraph, boundaryStack);
      }
      if (op === constants.ONE_MORE) {
        graphDataOnEdges.handleOneOrMore(stateGraph, boundaryStack);
      }
      if (op === constants.ZERO_SBOL) {
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
    case constants.NODE:
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
    case constants.NODE:
      let epsilonMap = graphDataOnNodes.getEpsilonParents(stateGraph);
      return graphDataOnNodes.collapseEpsilons(stateGraph, epsilonMap);
    case constants.EDGE:
      return graphDataOnEdges.collapseEpsilons(stateGraph);
  }
}


module.exports = {
  handleAtom,
  handleOp,
  collapse,
  enumerate,
};
