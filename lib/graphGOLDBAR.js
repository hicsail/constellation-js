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
  parsedObject = balance(parsedObject);

  populateGraph(parsedObject, stateGraph, boundaryStack, representation, categories, maxCycles, andTolerance, mergeTolerance);

  if (Object.keys(stateGraph).length === 0) {
    return {stateGraph: {}, paths:[]};
  }

  handleOp.handleOp(handleOp.ACCEPT, stateGraph, boundaryStack, representation);
  const root = handleOp.handleOp(handleOp.ROOT, stateGraph, boundaryStack, representation);
  let result = handleOp.enumerate(root, stateGraph, maxCycles, representation);

  return {stateGraph: result.graph, paths: result.paths, collapsed: result.collapsed};
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
      let populateArgs = {
        parsed: parsed[operation],
        categories,
        maxCycles,
        andTolerance,
        mergeTolerance
      };
      if (operation === handleOp.AND) {
        handleOp.handleOp(handleOp.AND, stateGraph, boundaryStack, representation, populateArgs);
        return;
      } else if (operation === handleOp.OR && representation === EDGE) {
        populateArgs.parsed = flattenOp(parsed[operation], operation);
        handleOp.handleOp(operation, stateGraph, boundaryStack, representation, populateArgs);
      } else if (operation === handleOp.MERGE) {
        handleOp.handleOp(handleOp.MERGE, stateGraph, boundaryStack, representation, populateArgs);
        return;
      } else {
        populateGraph(parsed[operation], stateGraph, boundaryStack, representation, categories, maxCycles, andTolerance, mergeTolerance);
        handleOp.handleOp(operation, stateGraph, boundaryStack, representation, populateArgs);
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

function balance(ast_node) {
  // A node has only one key, so this loop runs once.
  for (let operator in ast_node) {
    if (operator != "Atom") {
      let children = ast_node[operator];
      for (let i = 0; i < children.length; i++) {
        children[i] = balance(children[i]); // Recursively balance first.
        children[i] = balance_root(children[i]); // Balance this node.
      }
      ast_node[operator] = children;
    }
  }
  return ast_node;
}

function balance_root(ast_node) {
  let operators = ["Or", "And"];
  for (let i = 0; i < operators.length; i++) {
    if (operators[i] in ast_node) {
      return spread(gather(ast_node, operators[i]), operators[i]);
    }
  }
  return ast_node; // Not a binary operator.
}

function gather(ast_node, operator) {
  if (operator in ast_node) {
    let nodes = [];
    nodes = nodes.concat(gather(ast_node[operator][0], operator));
    nodes = nodes.concat(gather(ast_node[operator][1], operator));
    return nodes;
  } else {
    return [ast_node];
  }
}

function spread(nodes, operator) {
  if (nodes.length == 1) {
    return nodes[0];
  } else {
    let half = Math.floor(nodes.length / 2);
    let lft = spread(nodes.slice(0, half), operator);
    let rgt = spread(nodes.slice(half, nodes.length), operator);
    let node = {};
    node[operator] = [lft, rgt];
    return node;
  }
}

module.exports = {
  createGraphFromGOLDBAR,
  populateGraph
};
