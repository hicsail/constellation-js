/*global uuidv4:true*/

uuidv4 = require('uuidv4');
const util = require('util');


// Global Constants
const EPSILON = 'epsilon';  // Denotes an intermediary node
const ATOM = 'atom';  // Denotes a GOLDBAR atom
const ACCEPT = 'accept';    // Denotes an end node/a global leaf
const ROOT = 'root';  // Denotes the unique root node

const OR = 'Or';
const THEN = 'Then';
const ONE_MORE = "OneOrMore";
const ZERO_MORE = "ZeroOrMore";
const ZERO_ONE = 'ZeroOrOne';
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

  if (stateGraph[root].type === ACCEPT) {
    stateGraph[root].text = ROOT;
  } else {
    stateGraph[root].text = ROOT;
    stateGraph[root].type = ROOT;
  }
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
  if (op === ZERO_ONE) {
    handleZeroOrOne(stateGraph, boundaryStack);
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

  let parentId = createEpsilonNode(stateGraph);

  stateGraph[parentId].edges.push({'src': parentId, 'dest': a.head, 'component': EPSILON, 'type': EPSILON, 'text': EPSILON});
  stateGraph[parentId].edges.push({'src': parentId, 'dest': b.head, 'component': EPSILON, 'type': EPSILON, 'text': EPSILON});

  let children = a.leaves;
  for (let child of b.leaves) {
    children.push(child);
  }

  stateGraph[parentId].operator.push(OR);
  addToBoundaryStack(parentId, children, boundaryStack);
}
/**
 * Handles and operator
 * @param stateGraph Current graph
 * @param boundaryStack Boundary stack
 * @param combinedRoot The ID of the root node of the combined graph
 * @param combinedAccepts The IDs of the accept nodes of the combined graph
 * @param combinedGraph Object: the and of the two sub-graphs
 */
function handleAnd(stateGraph, boundaryStack, combinedRoot, combinedAccepts, combinedGraph) {
  if (JSON.stringify(combinedGraph) === JSON.stringify({})) {
    let epsID = createEpsilonNode(stateGraph);
    addToBoundaryStack(epsID, [], boundaryStack);
    return;
  }

  // remove root and accept labels since this is an intermediate graph
  removeLabelsFromAndGraph(combinedGraph, combinedRoot, combinedAccepts);

  // add the combined graph into stateGraph
  Object.assign(stateGraph, combinedGraph);

  addToBoundaryStack(combinedRoot, combinedAccepts, boundaryStack);
}

/**
 * Removes the 'root' and 'accept' labels from root and accept nodes in AND-ed graphs
 * @param graph
 * @param rootID
 * @param acceptIDs
 */
function removeLabelsFromAndGraph(graph, rootID, acceptIDs) {
  let rootNode = graph[rootID];
  rootNode.text = EPSILON;
  rootNode.type = EPSILON;

  for (let acceptID of acceptIDs) {
    let acceptNode = graph[acceptID];
    acceptNode.text = EPSILON;
    acceptNode.type = EPSILON;
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

  for (let i = 0; i < lenA; i++) {
    const leaf = a.leaves.pop();
    stateGraph[leaf].edges.push({'src': leaf, 'dest': b.head, 'component': EPSILON, 'type': EPSILON, 'text': EPSILON});
  }
  for (let i = 0; i < lenB; i++) {
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

  for (var leaf of a.leaves) {
    stateGraph[leaf].edges.push({'src': leaf, 'dest': a.head, 'component': EPSILON, 'type': ZERO_MORE, 'text': OR_MORE });
  }

  stateGraph[a.head].operator.push(ZERO_MORE);
  addToBoundaryStack(a.head, [a.head], boundaryStack);
}

/**
 * Handles zero-or-one operator
 * @param stateGraph Current graph
 * @param boundaryStack Boundary stack
 */

function handleZeroOrOne(stateGraph, boundaryStack) {

  const a = boundaryStack.pop();

  for (let leaf of a.leaves) {
    stateGraph[a.head].edges.push({'src': a.head, 'dest': leaf, 'component': EPSILON, 'type': ZERO_ONE, 'text': 'ZERO' });
  }

  stateGraph[a.head].operator.push(ZERO_ONE);
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

  // check if one-or-more (zero-or-more (....))
  for (let edge of stateGraph[a.leaves[0]].edges) {
    if (edge.dest === a.head) {
      addToBoundaryStack(a.head, a.leaves, boundaryStack);
      return;
    }
  }
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
function handleZeroOrMoreSbol(stateGraph, boundaryStack) {
  const a = boundaryStack.pop();

  for (var leaf of a.leaves) {
    stateGraph[leaf].edges.push({'src': leaf, 'dest': a.head, 'component': EPSILON, 'type': ONE_MORE, 'text': OR_MORE});
  }

  stateGraph[a.head].operator.push(ZERO_SBOL);
  addToBoundaryStack(a.head, a.leaves, boundaryStack);
}

/**
 * Adds a single atom to the graph
 * @param atom Atom to add
 * @param stateGraph Current graph
 * @param boundaryStack Boundary stack
 * @param categories Object: categories that the user input
 */
function handleAtom(atom, stateGraph, boundaryStack, categories) {
  const epsilon0 = createEpsilonNode(stateGraph);

  const epsilon1 = createEpsilonNode(stateGraph);

  stateGraph[epsilon0].text = atom[0] + ".head";
  stateGraph[epsilon0].edges.push({'src': epsilon0, 'dest': epsilon1, 'component': categories[atom[0]], 'type': ATOM, 'text': atom[0]});
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
  let visitedE = {};
  let visitedN = {};
  let allPaths = [];

  const eMap = getEpsilonMap(stateGraph);
  const nep = getNonEpsilonParents(stateGraph, eMap);
  collapseEpsilons(stateGraph, eMap, nep);

  let dummyEdge = {'src': 'dummy', 'dest': root, 'component': EPSILON, 'type': EPSILON, 'text': EPSILON};
  visitEdges(root, dummyEdge, visitedE, visitedN, stateGraph, [], allPaths, maxCycles);

  for (let path of allPaths) {
    printPath(path);
  }
  return allPaths;
}

/**
 * Visits nodes recursively and generates paths
 * @param nodeId Node to visit
 * @param edgeUsed edge used to get to node to visit
 * @param visited Array of visited nodes
 * @param stateGraph Current graph
 * @param currentPath Current path being checked
 * @param allPaths Array of all final paths
 * @param maxCycles Maximum depth of cycles
 */


function visitEdges(nodeId, edgeUsed, visitedE, visitedN, stateGraph, currentPath, allPaths, maxCycles) {
  const node = stateGraph[nodeId];
  const edgeId = edgeUsed.src + "_" + edgeUsed.dest + "_" + edgeUsed.text;

  // Don't let atoms exceed max cycle depth
  if (visitedE[edgeId] > maxCycles) {
    return;
  }
  // Allow epsilon nodes to exceed max cycle depth + 1, in case an atom is stuck in a cycle within a cycle
  // if (visitedE[edgeId] > maxCycles + 1) {
  //   return;
  // }

  if (visitedN[nodeId] > maxCycles + 1) {
    return;
  }

  if (!(edgeId in visitedE)) {
    visitedE[edgeId] = 0;
  }
  if (!(nodeId in visitedN)) {
    visitedN[nodeId] = 0;
  }

  // visit edge that precedes node
  visitedE[edgeId]++;
  visitedN[nodeId]++;
  currentPath.push(edgeUsed);

  if (node.type === ACCEPT) {
    processPath(node, currentPath, allPaths);
  }

  for (let e of node.edges) {
    visitEdges(e.dest, e, visitedE, visitedN, stateGraph, currentPath, allPaths, maxCycles);
  }
  currentPath.pop();
  visitedE[edgeId]--;
  visitedN[nodeId]--;
}

/**
 * Adds a path to array of final paths
 * Ignores epsilon and root nodes
 * @param path Path to add
 * @param allPaths Array of final paths
 */
function processPath(node, path, allPaths) {
  let processedPath = [];
  for (let edge of path) {
    if (edge.component === EPSILON || node.type === ROOT) {
      continue;
    }
    processedPath.push(JSON.parse(JSON.stringify(edge)));
  }
  if (!processedPath.length) {
    return;
  }
  if (isDuplicatePath(processedPath, allPaths)) {
    return;
  }
  allPaths.push(processedPath);
}

/**
 * Checks if an array of paths already contains a path
 * Runs in O(n^2) time
 * @param processedPath Path to check
 * @param allPaths Array of paths
 * @returns {boolean} true if it is duplicate, false otherwise
 */
function isDuplicatePath(processedPath, allPaths) {
  for (let path of allPaths) {
    let equal = true;

    if (path.length !== processedPath.length) {
      equal = false;
    }

    for (let i = 0; i < processedPath.length && equal; i++) {
      if (processedPath[i].component !== path[i].component ||
        (processedPath[i].src !== path[i].src || processedPath[i].dest !== path[i].dest)) {
        equal = false;
      }
    }

    if (equal) {
      return true;
    }
  }
  return false; // this means it is NOT a duplicate path
}

/**
 * Remove all epsilon edges (edges that have type EPSILON)
 * @param stateGraph Current graph
 * @param eMap Map of epsilon nodes
 * @param nep Map of epsilon nodes with non-epsilon parents
 */
function collapseEpsilons(stateGraph, eMap, nep) {
  for (let dest in eMap) {
    const srcs = Array.from(eMap[dest]);

    // if more than one parent exists, ignore
    if (srcs.length !== 1) {
      continue;
    }

    const srcNode = stateGraph[srcs[0]];
    const destNode = stateGraph[dest];

    if (destNode.text === ROOT && srcNode.edges.length === 1) {
      delete stateGraph[srcs[0]];
      continue;
    }

    if (destNode.type === ACCEPT && checkZeroOrOne(srcNode, dest)) {
      continue;
    }

    for (let edge of destNode.edges) {
      // Transfer children
      edge.src = srcs[0];
      srcNode.edges.push(edge);

      if (destNode.type === ACCEPT) {
        srcNode.type = ACCEPT;
      }

      if (edge.dest in eMap) {
        let index = Array.from(eMap[edge.dest]).indexOf(dest);
        if (index > -1) {
          eMap[edge.dest].delete(dest);
          eMap[edge.dest].add(srcs[0]);

        }
      }

      // Transfer operators
      if (destNode.operator.length > 0) {
        const last = srcNode.operator.length - 1;
        for (let i = 0; i < destNode.operator.length; i++) {
          if (srcNode.operator[last] !== OR || destNode.operator[0] !== OR) {
            srcNode.operator.push(destNode.operator[i]);
          }
        }
      }
      // Transfer loops
      for (let dE of stateGraph[edge.dest].edges) {
        if (dE.dest === dest) {
          dE.dest = srcs[0];
        }
      }
    }
    let edgeIndex = srcNode.edges.indexOf(srcNode.edges.find(obj => obj.dest === dest));
    if (edgeIndex > -1) {
      srcNode.edges.splice(edgeIndex, 1);
      if (destNode.type === ACCEPT) {
        srcNode.type = ACCEPT;
        srcNode.text = ACCEPT;
      }
    }

    //re assign any non-epsilon parent nodes to the epsilon parent node
    if (dest in nep) {
      let neps = Array.from(nep[dest]);
      for (let n of neps) {
        let nepNode = stateGraph[n];
        let edgeIndex = nepNode.edges.indexOf(nepNode.edges.find(obj => obj.dest === dest));
        if (edgeIndex > -1) {
          let edge = nepNode.edges.find(obj => obj.dest === dest);
          edge.dest = srcs[0];
          // nepNode.edges.splice(edgeIndex, 1);
        }
      }
    }

    // update neps to reflect the correct parent node(s)
    for (let nepDest in nep) {
      nep[nepDest].delete(dest);
      nep[nepDest].add(srcs[0]);
    }

    removeDuplicateEdges(srcNode);
    delete stateGraph[dest];
  }
}

/**
 * Removes duplicate edges from a node (duplicate only if every part of edge is the same)
 * @param node Object: node from which to remove duplicates
 */
function removeDuplicateEdges(node) {
  for (let i = 0; i < node.edges.length; i++) {
    for (let j = i+1; j < node.edges.length; j++) {
      let edge1 = node.edges[i];
      let edge2 = node.edges[j];
      if (JSON.stringify(edge1) === JSON.stringify(edge2)) {
        let idx = node.edges.indexOf(edge2);
        node.edges.splice(idx, 1);
      }
    }
  }
}

/**
 * Checks if source node has multiple edges to the destID and if any of them are non-epsilon
 * @param srcNode Object: src of destID
 * @param destID String: destination to check
 * @returns boolean: whether this is a zero-or-one
 */
function checkZeroOrOne(srcNode, destID) {
  let count = 0;
  let componentCount = 0;
  for (let edge of srcNode.edges) {
    if (edge.dest === destID) {
      count += 1;
      if (edge.component !== EPSILON) {
        componentCount += 1;
      }
    }
    if (count > 1 && componentCount >= 1) {
      return true;
    }
  }
  return false;
}

/**
 * Maps epsilon edge's src "parent" and destination "child".
 * @param stateGraph Current graph
 * @returns {Object} Map of each epsilon node's parents
 */
function getEpsilonMap(stateGraph) {
  let eMap = {};
  for (let srcNode in stateGraph) {
    if (stateGraph[srcNode].edges.length === 1) {
      let edge = stateGraph[srcNode].edges[0];
      if (edge.type === EPSILON) {
        if (stateGraph[srcNode].operator.includes(OR) &&
          (stateGraph[edge.dest].operator.includes(ONE_MORE) || stateGraph[edge.dest].operator.includes(ZERO_MORE))) {
          continue;
        }
        if (!(edge.dest in eMap)) {
          eMap[edge.dest] = new Set();
        }
        eMap[edge.dest].add(edge.src);
      }
    } else {
      for (let edge of stateGraph[srcNode].edges) {
        if (edge.type === EPSILON) {
          if (stateGraph[edge.dest].operator.includes(ONE_MORE) || stateGraph[edge.dest].operator.includes(ZERO_MORE)) {
            continue;
          }

          if (stateGraph[srcNode].operator.includes(OR) &&
            (stateGraph[edge.dest].operator.includes(ONE_MORE) || stateGraph[edge.dest].operator.includes(ZERO_MORE))) {
            continue;
          }
          if (!(edge.dest in eMap)) {
            eMap[edge.dest] = new Set();
          }
          eMap[edge.dest].add(edge.src);
        }
      }
    }
  }
  return eMap;
}

/**
 * Gets "parents" of epsilon edge's "child" node which are connected by non-epsilon edge.
 * @param stateGraph
 * @param eMap - mapping of epsilon edge child to epsilon edge parent
 */
function getNonEpsilonParents(stateGraph, eMap) {
  let nonEpParents = {};
  for (let srcNode in stateGraph) {
    for (let edge of stateGraph[srcNode].edges) {
      if (edge.dest in eMap && edge.type !== EPSILON) {
        if (!(edge.dest in nonEpParents)) {
          nonEpParents[edge.dest] = new Set();
        }
        nonEpParents[edge.dest].add(edge.src);
      }
    }
  }
  return nonEpParents;
}


module.exports = {
  enumeratePaths,
  generateRootNode,
  addAcceptNodes,
  handleOp,
  handleAtom,
  handleAnd,
  createEpsilonNode,
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
    pathStr += ' ' + path[i].text;
  }
  console.log(pathStr);
}
