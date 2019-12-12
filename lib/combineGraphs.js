
const andOperator = require('./andOperator');
const mergeOperator = require('./mergeOperator');

const AND = 'and';
const MERGE = 'merge';
const EPSILON = 'epsilon';  // Denotes an intermediary node
const ATOM = 'atom';  // Denotes a GOLDBAR atom
const ACCEPT = 'accept';    // Denotes an end node/a global leaf
const ROOT = 'root';  // Denotes the unique root node

const util = require('util');

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
    combined = handleAnd(stateGraphObj[0], stateGraphObj[1], categories[0], categories[1], tolerance);

  } else if (combineMethod === MERGE) {
    combined = handleMerge(stateGraphObj[0], stateGraphObj[1], categories[0], categories[1], tolerance);

  } else {
    throw new Error('Invalid combine method');
  }

  //if the graph is empty at the end (and/merge was unsuccessful) return an empty graph
  if (JSON.stringify(combined.graph ) === JSON.stringify({})) {
    return {graph: {}, categories: {}, paths: []};
  }

  // console.log(Object.keys(combined.graph).length);
  // console.log(util.inspect(combined.graph, {showHidden: false, depth: null}));

  return {graph: combined.graph, categories: combined.categories};
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
  andOperator(newGraph, graph1, graph2, categories1, categories2, finalCategories, tolerance);
  // rename the ids of the new graph so that they have the form id1-id2 (instead of an array of ids)
  newGraph = renameIds(newGraph);
  // remove nodes and edges that do not belong to path
  removeNonPaths(newGraph);
  return {graph: newGraph, categories: finalCategories};
}


/**
 * Called if combine method is MERGE; merges pairs of graphs sequentially
 * @param graph1 Object representing the left side of the merge
 * @param graph2 Object representing the right side of the merge
 * @param categories Object of each graph's categories
 * @param finalCategories Object: categories in the final combined graph
 * @returns Object: Merge of both graphs
 */
function handleMerge(graph1, graph2, categories, finalCategories) {
  console.log("handleMerge called");

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

      // if the operators on the node are the same, keep them
      operator = node1.operator.filter(op => node2.operator.includes(op));

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

/**
 * Removes all edges pointing to a deleted node
 * @param graph
 * @param deleted
 */
function removeNodeFromEdges(graph, deleted) {
  for (let id in graph) {
    let node = graph[id];
    for (let edge of node.edges) {
      if (edge.dest === deleted) {
        let index = node.edges.indexOf(edge);
        node.edges.splice(index, 1);
      }
    }
  }
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
      return id;
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
      accepts.push(id);
    }
  }
  return accepts
}


function removeNonPaths(graph) {
  let root = findRoot(graph);
  let accepts = findAccepts(graph);
  let pMap = getParents(graph);
  // make all every node's visited field false
  for (let id in graph) {
    graph[id].visited = false;
  }
  // perform bfs to see which nodes can be reached from the root node
  let visitedForward = bfs(graph, root);
  let visitedBackward = [];

  // perform a reverse bfs to see which nodes can be reached from any of the accept nodes
  for (let a of accepts) {
    // make all every node's visited field false again
    for (let id in graph) {
      graph[id].visited = false;
    }
    visitedBackward = visitedBackward.concat(reverseBFS(graph, pMap, a));
  }
  // keep only the nodes that can be reached from both the root node and any of the accept nodes
  let keepIds = visitedForward.filter(id => visitedBackward.includes(id));
  if (keepIds.length !== 0) {
    keepIds.push(root);
    keepIds = keepIds.concat(accepts);
  }
  for (let id in graph) {
    if (!keepIds.includes(id)) {
      removeNodeFromEdges(graph, id);
      delete graph[id];
    }
  }
}

function bfs(graph, root) {

  // Create a queue for BFS
  let queue = [];
  let visited = [];
  // Mark the source node as visited and enqueue it
  queue.push(root);
  let node = graph[root];
  node.visited = true;
  visited.push(root);

  while (queue.length > 0) {
    // Dequeue a node from queue
    root = queue.shift();
    node = graph[root];
    // Get all adjacent nodes of the dequeued node root. If an adjacent has not been visited,
    // then mark it visited and enqueue it
    for (let edge of node.edges) {
      let next = graph[edge.dest];
      if (!next.visited) {
        queue.push(next.id);
        next.visited = true;
        visited.push(next.id);
      }
    }
  }
  return visited;
}


function reverseBFS(graph, pMap, accept) {
  // Create a queue for BFS
  let queue = [];
  let visited = [];
  // Mark the source node as visited and enqueue it
  queue.push(accept);
  let node = graph[accept];
  node.visited = true;
  visited.push(accept);

  while (queue.length > 0) {
    // Dequeue a node from queue
    accept = queue.shift();
    if (!pMap[accept]) {
      continue;
    }

    // Get all adjacent nodes of the dequeued node root. If an adjacent has not been visited,
    // then mark it visited and enqueue it
    for (let pid of Array.from(pMap[accept])) {
      let next = graph[pid];
      if (!next.visited) {
        queue.push(pid);
        next.visited = true;
        visited.push(pid);
      }
    }
  }
  return visited;
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

