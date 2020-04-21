
const andOperator = require('./andOperator');
const mergeOperator = require('./mergeOperator');

const AND = 'and';
const MERGE = 'merge';
const EPSILON = 'epsilon';  // Denotes an intermediary node
const ATOM = 'atom';  // Denotes a GOLDBAR atom
const ACCEPT = 'accept';    // Denotes an end node/a global leaf
const ROOT = 'root';  // Denotes the unique root node

const THEN = 'Then';
const ONE_MORE = 'OneOrMore';
const ZERO_MORE = 'ZeroOrMore';
const ZERO_ONE = 'ZeroOrOne';

/**
 * Combines graphs sequentially with specified method
 * @param combineMethod String specifying which method of AND or MERGE
 * @param stateGraphObj Object of stateGraphs to be combined
 * @param categories Object of each graph's categories
 * @param tolerance Tolerance level of combined method (0-2)
 * @returns Object of combined graph, its categories, and the new paths
 */
function combineGraphs(combineMethod, stateGraphObj, categories, tolerance) {

  let combined;
  // call the correct handler method on the stateGraphs
  if (combineMethod === AND) {
    combined = linearCall(handleAnd, stateGraphObj, categories, tolerance);

  } else if (combineMethod === MERGE) {
    combined = linearCall(handleMerge, stateGraphObj, categories, tolerance);

  } else {
    throw new Error('Invalid combine method');
  }

  //if the graph is empty at the end (and/merge was unsuccessful) return an empty graph
  if (JSON.stringify(combined.graph ) === JSON.stringify({})) {
    return {graph: {}, categories: {}, paths: []};
  }

  return {graph: combined.graph, categories: combined.categories};
}

/**
 * Calls whichever handler function on the graphs sequentially
 * @param handleFunc Function: the function to call on each item in the object
 * @param graphObj Object: the stateGraphs of all the submitted designs
 * @param categories Object: original list of categories per stateGraph
 * @param tolerance Tolerance level of combined method (0-2)
 * @return {{categories: Object, graph: Object}}
 */
function linearCall(handleFunc, graphObj, categories, tolerance) {
  // do one iteration before the loop
  let firstIter = handleFunc(graphObj[0], graphObj[1], categories[0], categories[1], tolerance);
  let finalGraph = firstIter.graph;
  let finalCategories = firstIter.categories;
  // all subsequent and/merges must happen in relation to the first and/merge
  for (let i = 2; i < Object.keys(graphObj).length; i++) {
    let nextIter = handleFunc(finalGraph, graphObj[i], finalCategories, categories[i], tolerance);
    finalGraph = nextIter.graph;
    finalCategories = nextIter.categories;
  }
  return {graph: finalGraph, categories: finalCategories};
}


/**
 * Called if combine method is AND; and's one pair of graphs
 * @param graph1 Object representing the left side of the and
 * @param graph2 Object representing the right side of the and
 * @param categories1 Object of first graph's categories
 * @param categories2 Object of second graph's categories
 * @param tolerance Tolerance level of combined method (0-2)
 * @returns Object: {categories: combined categories, graph: combined graph}
 */
function handleAnd(graph1, graph2, categories1, categories2, tolerance) {
  // object to hold the categories from the final graph
  let finalCategories = {};
  let newGraph = cartesianNodes(graph1, graph2);

  // do the AND algorithm on the new graph
  andOperator.andOperator(newGraph, graph1, graph2, categories1, categories2, finalCategories, tolerance);
  // rename the ids of the new graph so that they have the form id1-id2 (instead of an array of ids)
  newGraph = renameIds(newGraph);
  // remove nodes and edges that do not belong to path
  andOperator.removeNonPaths(newGraph, findRoot(newGraph), findAccepts(newGraph), getParents(newGraph));

  return {graph: newGraph, categories: finalCategories};
}


/**
 * Called if combine method is MERGE; merges pairs of graphs sequentially
 * @param graph1 Object representing the left side of the merge
 * @param graph2 Object representing the right side of the merge
 * @param categories1 Object of each first graph's categories
 * @param categories2 Object of each second graph's categories
 * @param tolerance Tolerance level of combined method (0-2)
 * @returns Object: Merge of both graphs
 */
function handleMerge(graph1, graph2, categories1, categories2, tolerance) {
  // console.log("handleMerge called");
  // object to hold the categories from the final graph
  let finalCategories = {};
  let newGraph = cartesianNodes(graph1, graph2);
  mergeOperator.mergeOperator(newGraph, graph1, graph2, categories1, categories2, finalCategories, tolerance);
  // rename the ids of the new graph so that they have the form id1-id2 (instead of an array of ids)
  newGraph = renameIds(newGraph);

  mergeOperator.removeNonPaths(newGraph, findRoot(newGraph), findAccepts(newGraph), getParents(newGraph));

  return {graph: newGraph, categories: finalCategories};
}


/**
 * Returns a list of node-pairs that make up the
 * cartesian product of the nodes in the two graphs
 * @param graph1 Object: the first graph
 * @param graph2 Object: the second graph
 * @returns Object: graph with nodes labeled as node pairs of original graphs
 */
function cartesianNodes(graph1, graph2) {
  // object to hold new graph
  let nodes = {};
  for (let id1 in graph1) {
    let node1 = graph1[id1];
    for (let id2 in graph2) {
      let node2 = graph2[id2];
      let newID = [id1, id2];
      let type = '';
      let text = '';
      let operator = [];
      // if both nodes are roots, the new node is also a root; if both are accepts, new node is an accept
      if (node1.type === ROOT && node2.type === ROOT) {
        type = ROOT;
      } else if (node1.type === ACCEPT && node2.type === ACCEPT) {
        type = ACCEPT;
      } else {
        type = EPSILON;
      }

      // if both nodes' texts are 'root', the new node's text is also 'root'; if both are 'accept', new node is 'accept'
      if (node1.text === ROOT && node2.text === ROOT) {
        text = ROOT;
      } else if (node1.text === ACCEPT && node2.text === ACCEPT) {
        text = ACCEPT;
      } else {
        text = EPSILON;
      }

      if (node1.type === ACCEPT || node2.type === ACCEPT) {
        operator = [];
      } else {
        operator = assignOperators(node1.operator, node2.operator);
      }

      // insert new node into new graph
      let newNode = {
        id: newID,
        text: text,
        type: type,
        edges: [],
        operator: operator
      };
      nodes[newID] = newNode;
    }
  }
  return nodes;
}

function assignOperators(opArr1, opArr2) {
  let finalOps = [];
  // if there are any THENs, push a THEN onto the operators
  if (opArr1.includes(THEN) || opArr2.includes(THEN)) {
    finalOps.push(THEN);
  }
  // only THENs should be carried regardless,
  // all other operators should only be carried if both nodes have operators
  if (opArr1.length === 0 || opArr2.length === 0) {
    return finalOps;
  }
  // if the first node is a OM, as long as the other node is not a ZO, push a OM onto the operators
  if (opArr1.includes(ONE_MORE)) {
    if (!opArr2.includes(ZERO_ONE)) {
      finalOps.unshift(ONE_MORE);
    }
  }
  // if the first node is a ZM
  if (opArr1.includes(ZERO_MORE)) {
    // if the other node is a ZO, push a ZO
    if (opArr2.includes(ZERO_ONE)) {
      finalOps.push(ZERO_ONE);
    } else if (opArr2.includes(ONE_MORE)) {
      // if the other node is a OM, push an OM
      finalOps.unshift(ONE_MORE);
    } else {
      // if the other node is neither ZO nor OM, push a ZM
      finalOps.push(ZERO_MORE);
    }
  }
  // if the first node is a ZO, push a ZO only if the other node is a ZM or ZO
  if (opArr1.includes(ZERO_ONE)) {
    if (opArr2.includes(ZERO_MORE) || opArr2.includes(ZERO_ONE)) {
      finalOps.push(ZERO_ONE);
    }
  }
  return [...new Set(finalOps)]
}


/**
 * Renames the ids in a graph from the form [id1, id2] to the form id1-id2
 * @param graph
 */
function renameIds(graph) {
  let renamedGraph = {};
  for (let id in graph) {
    let node = graph[id];
    let newId = node.id.join('-');
    node.id = newId;

    for (let edge of node.edges) {
      edge.src = newId;
      edge.dest = edge.dest.join('-');
    }
    renamedGraph[newId] = node;
  }
  return renamedGraph;

}

/**
 * Finds the root node's ID in a graph
 * @param graph
 * @return {string}
 */
function findRoot(graph) {
  for (let id in graph) {
    let node = graph[id];
    if (node.text === ROOT) {
      return node.id;
    }
  }
}

/**
 * Finds the accept nodes' IDs in a graph
 * @param graph
 * @return {Array}
 */
function findAccepts(graph) {
  let accepts = [];
  for (let id in graph) {
    let node = graph[id];
    if (node.type === ACCEPT) {
      accepts.push(node.id);
    }
  }
  return accepts
}


function getParents(stateGraph){
  let pMap = {};
  for (let node in stateGraph) {
    stateGraph[node].edges.forEach((edge) =>{
      if(!(edge.dest in pMap)){
        pMap[edge.dest] = new Set();
      }
      pMap[edge.dest].add(edge.src);
    });
  }
  return pMap;
}



module.exports = {
  combineGraphs,
  findRoot,
  findAccepts,
  AND,
  MERGE
};

