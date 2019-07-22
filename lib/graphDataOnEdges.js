/*global uuidv4:true*/

if (typeof window === 'undefined') {
  uuidv4 = require('uuidv4');
}

// Global Constants
const EPSILON = 'epsilon';  // Denotes an intermediary node
const ATOM = 'atom';  // Denotes a GOLDBAR atom
const ACCEPT = 'accept';    // Denotes an end node/a global leaf
const ROOT = 'root';  // Denotes the unique root node

const OR = 'Or';
const THEN = 'Then';
const ONE_MORE = "OneOrMore";
const ZERO_MORE = "ZeroOrMore";
const OR_MORE = "OrMore";
const ZERO_SBOL = 'ZeroOrMoreSBOL';
const ONE = 'one';
const AND = 'And';
const MERGE = 'Merge';


/* * * * * * * * * * */
/*   NODE HANDLING   */
/* * * * * * * * * * */

/**
 * Adds accept nodes to all remaining leaf nodes
 * @param stateGraph Current graph
 * @param boundaryStack Boundary stack
 */
function addAcceptNodes(stateGraph, boundaryStack) {

  const leaves = boundaryStack[0].leaves;

  for (var leafId of leaves) {
    stateGraph[leafId].type = ACCEPT;
    stateGraph[leafId].text = ACCEPT;
  }
}

function createEpsilonNode(stateGraph) {
  const epsilonId = uuidv4();
  stateGraph[epsilonId] = {id: epsilonId, text: EPSILON, type: EPSILON, edges: [], operator: []};
  return epsilonId;
}

/**
 * Chooses root node. Boundary stack should only have one connected element remaining when called
 * @param stateGraph Current graph
 * @param boundaryStack Boundary stack
 * @returns {*} Root node
 */
function generateRootNode(stateGraph, boundaryStack) {
  if (boundaryStack.length !== 1) {
    throw new Error('Error generating graph');
  }

  let root = boundaryStack[0].head;
  // stateGraph[root].text = ROOT;
  stateGraph[root].type = ROOT;

  return root;
}

/**
 * Adds a connected component to the boundary stack
 * @param head The head of the component
 * @param leaves
 * @param boundaryStack The boundary stack
 */
function addToBoundaryStack(head, leaves, boundaryStack) {
  let obj = {head: head, leaves: leaves};
  boundaryStack.push(obj);
}

/* * * * * * * * */
/*   OPERATORS   */
/* * * * * * * * */

/**
 * Handles operators and calls appropriate functions
 * @param op Operator
 * @param stateGraph Current graph
 * @param boundaryStack Boundary stack
 */
function handleOp(op, stateGraph, boundaryStack) {
  if(op === 'one'){
    return;
  }

  if (op === OR) {
    handleOr(stateGraph, boundaryStack);
  }
  if (op === AND) {
    handleAnd(stateGraph, boundaryStack);
  }
  if (op === THEN) {
    handleThen(stateGraph, boundaryStack);
  }
  if (op === ZERO_MORE) {
    handleZeroOrMore(stateGraph, boundaryStack);
  }
  if (op === ONE_MORE) {
    handleOneOrMore(stateGraph, boundaryStack);
  }
  if (op === ZERO_SBOL) {
    handleZeroOrMoreSbol(stateGraph, boundaryStack);
  }
}

/**
 * Handles or operator
 * @param stateGraph Current graph
 * @param boundaryStack Boundary stack
 * @param parentId The ID of the parent epsilon node
 */
function handleOr(stateGraph, boundaryStack) {
  let a = boundaryStack.pop();
  let b = boundaryStack.pop();

  console.log("handleOr:");
  console.log("a", a, "b: ", b);
  for (var e of stateGraph[b.head].edges) {
    e.src = a.head;
    stateGraph[a.head].edges.push(e);

    // handles one-or-more cases. Redirects edge pointing back to b.head to a.head.
    for (de of stateGraph[e.dest].edges) {
      if (de.dest === b.head) {
        de.dest = a.head;
      }
    }
  }

  let children = a.leaves;
  for (let child of b.leaves) {
    children.push(child);
  }

  stateGraph[a.head].operator.push(OR);
  addToBoundaryStack(a.head, children, boundaryStack);
  delete stateGraph[b.head];
}

/**
 * Handles and operator
 * @param stateGraph Current graph
 * @param boundaryStack Boundary stack
 * @param parentId The ID of the parent epsilon node
 */
function handleAnd(stateGraph, boundaryStack, parentId) {

  const g = boundaryStack.pop().head; //subgraph1 leaves
  const v = boundaryStack.pop().head; //subgraph2 leaves
 
  andHelper(stateGraph[g], stateGraph[v], stateGraph, parentId, {});

  let leaves = [];
  getLeaves(parentId, stateGraph, leaves, {});
  addToBoundaryStack(parentId, leaves, boundaryStack);


  deleteSubGraph(g, stateGraph, {});
  deleteSubGraph(v, stateGraph, {});
}

function getLeaves(nodeId, stateGraph, leaves, visited) {
  var node = stateGraph[nodeId];
  var edges = node.edges;

  if (visited[nodeId]) {
    leaves.push(nodeId);
    return;
  }
  visited[nodeId] = true;

  for (var e of edges) {
    if (stateGraph[e].edges.length === 0) {
      leaves.push(e);
    }
    getLeaves(e, stateGraph, leaves, visited);
  }
}



function deleteSubGraph(node, stateGraph, visited) {

  if (node in visited) {
    return;
  }

  var children = stateGraph[node].edges;
  visited[node] = true;

  for (var c of children) {
    deleteSubGraph(c, stateGraph, visited);
  }

  stateGraph[node].edges = [];
  delete stateGraph[node];
}


function checkMultipleEps(g, v, stateGraph, parentId, visited) {
  if (g.type === EPSILON && v.type === EPSILON) {
   for (var gChild of g.edges) {
    for (var vChild of v.edges) {
      visited[v.id] = true;
      visited[g.id] = true;
      andHelper(stateGraph[gChild], stateGraph[vChild], stateGraph, parentId, visited);
    }
   }
   return true;
  } else if (g.type === EPSILON) {
    for (var gChild of g.edges) {
      visited[g.id] = true;
      andHelper(stateGraph[gChild], v, stateGraph, parentId, visited);
    }
    return true;
  } else if (v.type === EPSILON) {
    for (var vChild of v.edges) {
      visited[v.id] = true;
      andHelper(g, stateGraph[vChild], stateGraph, parentId, visited);
    }
    return true;
  }
  return false;
}

/**
 * 
 * @param {node} g 
 * @param {node} v 
 * @param {object} stateGraph 
 * @param {id} parentId 
 */
function andHelper(g, v, stateGraph, parentId, visited) {
  // if my parent is an epsilon and so am i, skip me, go onto children
  if (stateGraph[parentId].type === EPSILON) {
    if(checkMultipleEps(g, v, stateGraph, parentId, visited)) {
      return;
    }
  }

  // not the same
  if (g.text !== v.text) return;

  // Creating new node
  var newNodeId = uuidv4();
  stateGraph[newNodeId] = {id: newNodeId, text: g.text, type: g.type, edges: [], operator: [ATOM]};
  stateGraph[parentId].edges.push(newNodeId);

  visited[g.id] = true;
  visited[v.id] = true;

  // Visit additional children
  for (var gChild of g.edges) {
    for (var vChild of v.edges) {
      if (visited[vChild] || visited[gChild]) {
        stateGraph[newNodeId].edges.push(parentId);
      } else {
        andHelper(stateGraph[gChild], stateGraph[vChild], stateGraph, newNodeId, visited);
      }
    }
  }
}

/**
 * Handles then operator
 * @param stateGraph Current graph
 * @param boundaryStack Boundary stack
 * @param parentId The ID of the parent epsilon node
 */
function handleThen(stateGraph, boundaryStack) {
  const b = boundaryStack.pop();
  const a = boundaryStack.pop();

  // Gets all children of a and b to re-add to boundary stack
  const children = [];
  let lenA = a.leaves.length;
  let lenB = b.leaves.length;

  console.log("handleThen", "a: ", a.head, a.leaves, "b: ", b.head, b.leaves);

  for (let i = 0; i < lenA; i++) {
    const leaf = a.leaves.pop();
    stateGraph[leaf].edges.push({'src': leaf, 'dest': b.head, 'component': EPSILON, 'type': EPSILON, 'text': EPSILON});
  }
  len = b.leaves.length;
  for (let i = 0; i < len; i++) {
    children.push(b.leaves.pop());
  }

  stateGraph[b.head].operator.push(THEN);
  addToBoundaryStack(a.head, children, boundaryStack);
}

/**
 * Handles zero-or-more operator
 * Generates the following graph: parent -> a.head -> ... -> leaves -> parent
 * @param stateGraph Current graph
 * @param boundaryStack Boundary stack
 * @param parentId The ID of the parent epsilon node
 */

function handleZeroOrMore(stateGraph, boundaryStack) {
  const a = boundaryStack.pop();

  console.log("handleZeroOrMore", "a : ", a.head);
  for (var leaf of a.leaves) {
    stateGraph[leaf].edges.push({'src': leaf, 'dest': a.head, 'component': EPSILON, 'type': ZERO_MORE, 'text': OR_MORE });
  }
  // make a 'zero' edge
  let zero = createEpsilonNode(stateGraph);
  a.leaves.push(zero);
  stateGraph[a.head].edges.push({'src': a.head, 'dest': zero, 'component': EPSILON, 'type': ZERO_MORE, 'text': 'ZERO'});
  stateGraph[a.head].operator.push(ZERO_MORE);
  addToBoundaryStack(a.head, a.leaves, boundaryStack);
}


/**
 * Handles one-or-more operator
 * Generates the following graph: parent -> a.head -> ... -> leaves -> epsilon -> a.head
 * @param stateGraph Current graph
 * @param boundaryStack Boundary stack
 * @param parentId The ID of the parent epsilon node
 */
function handleOneOrMore(stateGraph, boundaryStack) {

  const a = boundaryStack.pop();
  console.log("one-or-more: ", stateGraph[a.head].text);
  console.log(stateGraph[a.head].text, "leaves: ", a.leaves);

  for (var leaf of a.leaves) {
    stateGraph[leaf].edges.push({'src': leaf, 'dest': a.head, 'component': EPSILON, 'type': ONE_MORE, 'text': OR_MORE});
  }

  stateGraph[a.head].operator.push(ONE_MORE);
  addToBoundaryStack(a.head, a.leaves, boundaryStack);
}


/**
 * Handles zero-or-more for SBOL generation, behaves the same as one-or-more
 * Generates the following graph: parent -> a.head -> ... -> leaves -> epsilon -> a.head
 * @param stateGraph Current graph
 * @param boundaryStack Boundary stack
 * @param parentId The ID of the parent epsilon node
 */
function handleZeroOrMoreSbol(stateGraph, boundaryStack, parentId) {
  const a = boundaryStack.pop();

  const epsilonId = uuidv4();
  stateGraph[epsilonId] = {id: epsilonId, text: EPSILON, type: EPSILON, edges:[], operator: []};
  stateGraph[parentId].edges.push(a.head);

  // Add edges from leaves of a to epsilon
  let tempLeaves = []; // TODO try to not need tempLeaves

  let len = a.leaves.length;
  for (let i = 0; i < len; i++) {
    const leaf = a.leaves.pop();
    tempLeaves.push(leaf);
    stateGraph[leaf].edges.push(epsilonId);
  }

  stateGraph[parentId].operator.push(ZERO_SBOL);
  stateGraph[epsilonId].edges.push(parentId);
  addToBoundaryStack(parentId, tempLeaves, boundaryStack);
}

/**
 * Adds a single atom to the graph
 * @param atom Atom to add
 * @param stateGraph Current graph
 * @param boundaryStack Boundary stack
 */
function handleAtom(atom, stateGraph, boundaryStack) {

  const epsilon0 = createEpsilonNode(stateGraph);

  const epsilon1 = createEpsilonNode(stateGraph);

  stateGraph[epsilon0].text = atom[0] + ".head";
  stateGraph[epsilon0].edges.push({'src': epsilon0, 'dest': epsilon1, 'component': atom[0], 'type': ATOM, 'text': atom[0]});
  addToBoundaryStack(epsilon0, [epsilon1], boundaryStack);
}


/* * * * * * * * * * * */
/*   GRAPH TRAVERSAL   */
/* * * * * * * * * * * */
/**
 * Generates all paths through the graph
 * @param root The root node
 * @param stateGraph Current graph
 * @returns {Array} Array of paths through graph
 */
function enumeratePaths(root, stateGraph, maxCycles) {
  let visited = {};
  let allPaths = [];
  const {pMap, cMap} = getEpsilonParents(stateGraph);
  collapseEpsilons(stateGraph, pMap, cMap);

  // visitNodes(root, visited, stateGraph, [], allPaths, maxCycles);
  return allPaths;
}

/**
 * Visits nodes recursively and generates paths
 * @param nodeId Node to visit
 * @param visited Array of visited nodes
 * @param stateGraph Current graph
 * @param currentPath Current path being checked
 * @param allPaths Array of all final paths
 * @param maxCycles Maximum depth of cycles
 */
function visitNodes(nodeId, visited, stateGraph, currentPath, allPaths, maxCycles) {
  const node = stateGraph[nodeId];

  // Don't let atoms exceed max cycle depth
  if (visited[nodeId] > maxCycles && stateGraph[nodeId].type === ATOM) {
    return;
  }
  // Allow epsilon nodes to exceed max cycle depth + 1, in case an atom is stuck in a cycle within a cycle
  if (visited[nodeId] > maxCycles + 1) {
    return;
  }
  // Handle ends of paths
  if (node.type === ACCEPT) {
    processPath(currentPath, allPaths);
    //return;  //TODO: Get rid of base case below
  }
  // Dead ends should only occur in accept nodes. Dead ends are not valid paths
  if (node.edges.length === 0) {
    return;
  }

  // Update cycle counter
  if (!(nodeId in visited)) {
    visited[nodeId] = 0;
  }
  visited[nodeId]++;
  currentPath.push(node);

  for (let child of node.edges) {
    visitNodes(child, visited, stateGraph, currentPath, allPaths, maxCycles);
  }

  // Update cycle counter
  currentPath.pop();
  visited[nodeId]--;
}

/**
 * Adds a path to array of final paths
 * Ignores epsilon and root nodes
 * @param path Path to add
 * @param allPaths Array of final paths
 */
function processPath(path, allPaths) {
  let processedPath = [];
  for (let node of path) {
    if (node.type === EPSILON || node.type === ROOT) {
      continue;
    }
    // Deep copy of node
    processedPath.push(JSON.parse(JSON.stringify(node)));
  }

  // Check if path is valid
  if (!processedPath.length) {
    return;
  }
  if (!isDuplicatePath(processedPath, allPaths)) {
    return;
  }
  allPaths.push(processedPath);
}

/**
 * Checks if an array of paths already contains a path
 * Runs in O(n^2) time
 * @param processedPath Path to check
 * @param allPaths Array of paths
 * @returns {boolean} Whether the path is a duplicate
 */
function isDuplicatePath(processedPath, allPaths) {
  for (let path of allPaths) {
    let equal = true;

    if (path.length !== processedPath.length) {
      equal = false;
    }

    for (let i = 0; i < processedPath.length && equal; i++) {
      if (processedPath[i].id !== path[i].id) {
        equal = false;
      }
    }

    if (equal) {
      return false;
    }
  }
  return true;
}

/**
 * Remove all epsilon edges (edges that have type EPSILON)
 * @param stateGraph Current graph
 * @param epsilonMap Map of epsilon nodes
 */

function collapseEpsilons(stateGraph, pMap, cMap) {
  for (let epId in pMap) {
    const pIds = Array.from(pMap[epId]);
    const cIds = Array.from(cMap[epId]);

    if (pIds.length !== 1) {
      continue;
    }

    const pN = stateGraph[pIds[0]];

    let pel = pN.edges.length;
    for (let i = 0; i < pel; i++) {
      let pE = pN.edges[i];
      if (pE.dest === epId) {
        for (let cId of cIds) {
          stateGraph[pN.id].edges.push({'src': pN.id, 'dest': cId, 'component': pE.component, 'type': pE.type, 'text': pE.text});
          // check if epId had non-epsilon edges which must be transferred to its child, cannot "collapse" non-epsilons
          for (let eE of stateGraph[epId].edges) {
            if (!(cIds.includes(eE.dest)) || eE.dest === pE.src) {
              eE.src = cId;
              stateGraph[cId].edges.push(eE);
            }
          }
        }
        pN.edges.splice(i, 1);
      }
    }
    delete stateGraph[epId];
  }
}

/**
 * Gets each epsilon node's children if the edge from epsilon --> epsilon child is an epsilon edge
 * @param stateGraph Current graph
 * @returns {Object} Map of each epsilon node's parents
 */
function getEpsilonChildren(stateGraph) {
  let childrenMap = {};
  for (let srcNode in stateGraph) {
    for (let edge of stateGraph[srcNode].edges) {
      if (edge.type === EPSILON) {
        if (!(edge.src in childrenMap)) {
          childrenMap[edge.src] = new Set();
        }
        childrenMap[edge.src].add(edge.dest);
      }
    }
  }
  console.log("getEpsilonChildren", childrenMap);
  return childrenMap;
}


/**
 * Gets each epsilon node's parents if parent --> epsilon is NOT an epsilon edge
 * @param stateGraph Current graph
 * @returns {Object} Map of each epsilon node's parents
 */
function getEpsilonParents(stateGraph) {

  let cMap = getEpsilonChildren(stateGraph);
  let pMap = {};
  for (let srcNode in stateGraph) {
    for (let edge of stateGraph[srcNode].edges) {
      if (edge.dest in cMap) {
        if (!(edge.dest in pMap)) {
          pMap[edge.dest] = new Set();
        }
        pMap[edge.dest].add(srcNode);
      }
    }
  }
  console.log("getEpsilonParents", pMap);
  return {pMap, cMap};
}

if (typeof window === 'undefined') {
  module.exports = {
    enumeratePaths,
    generateRootNode,
    addAcceptNodes,
    handleOp,
    handleAtom,
    EPSILON,
    ATOM,
    ACCEPT,
    ROOT,
    OR,
    THEN,
    ONE_MORE,
    ZERO_MORE,
    ZERO_SBOL,
    ONE
  };
}

/* * * * * * * * * * */
/*     DEBUGGING     */
/* * * * * * * * * * */

// noinspection JSUnusedLocalSymbols
/**
 * Prints a path to the console
 * @param path The path to print
 */
function printPath(path) { // eslint-disable-line no-unused-vars
  let pathStr = 'Path: ';
  for (let i = 0; i < path.length; i++) {
    pathStr += ' ' + path[i].id;
  }
  console.log(pathStr);
}
