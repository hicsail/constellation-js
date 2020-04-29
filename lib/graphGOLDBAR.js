const constants = require('./constants');
EdgeGraph = require('./edgeGraph');
NodeGraph = require('./nodeGraph');
handleOp = require('./handleOperators');

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

  let stateGraph; // Stores currently generated edges
  if (representation === constants.NODE) {
    stateGraph = new NodeGraph();
  } else {
    stateGraph = new EdgeGraph();
  }

  let boundaryStack = []; // Stores connected nodes in an object. Leaf nodes are stored in object.leaves
  parsedObject = balance(parsedObject);

  handleOp.populateGraph(parsedObject, stateGraph, boundaryStack, representation, categories, maxCycles);

  if (stateGraph.nodes.length === 0) {
    let epsGraph = new EdgeGraph();
    return {stateGraph: epsGraph, paths:[], collapsed: epsGraph};
  }

  handleOp.handleOp(constants.ACCEPT, stateGraph, boundaryStack, representation);
  const root = handleOp.handleOp(constants.ROOT, stateGraph, boundaryStack, representation);
  let result = stateGraph.enumeratePaths(root, maxCycles);

  return {stateGraph: result.graph, paths: result.paths, collapsed: result.collapsed};
}

/**
 * Balance nested operations e.g. ((1 and 2) and (3 and 4)) instead of (1 and (2 and (3 and 4)))
 * @param ast_node
 * @returns {*}
 */
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
};
