uuidv4 = require('uuidv4');
constants = require('./constants');


/**
 * Receives object from parsed GOLDBAR specification and recursively builds a graph
 * @param parsed The parsed GOLDBAR object
 * @param stateGraph Current graph
 * @param boundaryStack Boundary stack
 * @param representation String: which representation of the graph
 * @param categories Object: categories that the user input
 * @param maxCycles int: maximum number of cycles
 * @param mergeFlag boolean: whether there is a merge in the design
 */
function populateGraph(parsed, stateGraph, boundaryStack, representation, categories, maxCycles, mergeFlag) {
  // Handle if input is an atom
  if (parsed.Atom) {
    handleAtom(parsed.Atom, stateGraph, boundaryStack, categories, representation);
    return;
  }

  // Handle if input is an or
  if (Array.isArray(parsed)) {
    for (let i = 0; i < parsed.length; i++) {
      populateGraph(parsed[i], stateGraph, boundaryStack, representation, categories, maxCycles, mergeFlag);
    }
    return;
  }

  // Handle if input contains other or nested operations
  if (Object.keys(parsed).length > 0) {
    for (let operation in parsed) {
      let populateArgs = {
        parsed: parsed[operation],
        categories,
        maxCycles,
        mergeFlag
      };
      if (operation === constants.AND0) {
        handleOp(constants.AND, stateGraph, boundaryStack, representation, populateArgs, 0);
        return;
      } else if (operation === constants.AND1) {
        handleOp(constants.AND, stateGraph, boundaryStack, representation, populateArgs, 1);
        return;
      } else if (operation === constants.AND2) {
        handleOp(constants.AND, stateGraph, boundaryStack, representation, populateArgs, 2);
        return;
      } else if (operation === constants.OR && representation === constants.EDGE) {
        populateArgs.parsed = flattenOp(parsed[operation], operation);
        handleOp(operation, stateGraph, boundaryStack, representation, populateArgs);
      } else if (operation === constants.MERGE) {
        mergeFlag.pop();
        mergeFlag.push(true);
        handleOp(constants.MERGE, stateGraph, boundaryStack, representation, populateArgs);
        return;
      } else {
        populateGraph(parsed[operation], stateGraph, boundaryStack, representation, categories, maxCycles, mergeFlag);
        handleOp(operation, stateGraph, boundaryStack, representation, populateArgs);
      }
    }
  }
}

function flattenOp(parsedAtOp, operation) {
  let objOfOp = [];
  for (let obj of parsedAtOp) {
    if (obj[operation]) {
      objOfOp = objOfOp.concat(flattenOp(obj[operation], operation))
    } else {
      objOfOp.push(obj);
    }
  }
  return objOfOp;
}


/**
 * Calls appropriate graph functions not related to operators
 * @param stateGraph Current graph
 * @param boundaryStack Boundary stack
 * @param atom Atom to add
 * @param categories Object: categories that the user input
 */
function handleAtom(atom, stateGraph, boundaryStack, categories){
  stateGraph.handleAtom(atom, boundaryStack, categories);
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
  switch (op) {
    case constants.ONE:
      return;
    case constants.ACCEPT:
      if (representation === constants.EDGE) {
        stateGraph.addAcceptNodes(boundaryStack);
      } else {
        return stateGraph.addAcceptNodes(boundaryStack);
      }
      break;
    case constants.ROOT:
      return stateGraph.generateRootNode(boundaryStack);
    case constants.OR:
      if (representation === constants.EDGE) {
        stateGraph.handleOr(boundaryStack, representation, populateArgs);
      } else {
        stateGraph.handleOr(boundaryStack);
      }
      break;
    case constants.OR_SBOL:
      if (representation === constants.EDGE) {
        stateGraph.handleOrSBOL(boundaryStack);
      } else {
        stateGraph.handleOr(boundaryStack);
      }
      break;
    case constants.AND:
      if (representation === constants.EDGE) {
        stateGraph.handleAnd(boundaryStack, representation, populateArgs, tolerance);
      } else {
        throw new Error('The AND operation is not supported in the NODE representation');
      }
      break;
    case constants.MERGE:
      if (representation === constants.EDGE) {
        stateGraph.handleMerge(boundaryStack, representation, populateArgs);
      } else {
        throw new Error('The MERGE operation is not supported in the NODE representation');
      }
      break;
    case constants.THEN:
      stateGraph.handleThen(boundaryStack);
      break;
    case constants.ZERO_MORE:
      stateGraph.handleZeroOrMore(boundaryStack);
      break;
    case constants.ZERO_ONE:
      stateGraph.handleZeroOrOne(boundaryStack);
      break;
    case constants.ONE_MORE:
      stateGraph.handleOneOrMore(boundaryStack);
      break;
    case constants.ZERO_SBOL: // only exists in NodeGraph
      stateGraph.handleZeroOrMoreSbol(boundaryStack);
      break;
    case constants.ZERO_ONE_SBOL: // only exists in NodeGraph
      stateGraph.handleZeroOrOneSbol(boundaryStack);
      break;
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
  return stateGraph.enumeratePaths(root, maxCycles);
}

/**
 * Minimizes a graph without enumerating paths
 * @param stateGraph
 * @param representation
 */
function collapse(stateGraph, representation) {
  switch (representation) {
    case constants.NODE:
      let epsilonMap = stateGraph.getEpsilonParents();
      return stateGraph.collapseEpsilons(epsilonMap);
    case constants.EDGE:
      // collapse a copy and save the original for SBOL generation
      let collapsed = stateGraph.deepCopy();
      let old = collapsed.deepCopy();
      collapsed.collapseEpsilons();

      while (!collapsed.equals(old)) {
        old = collapsed.deepCopy();
        collapsed.collapseEpsilons();
      }
      return collapsed;
  }
}


module.exports = {
  handleAtom,
  handleOp,
  collapse,
  enumerate,
  populateGraph
};
