/*global uuidv4:true*/

handleOp = require('./handleOperators');
graphGOLDBAR = require('./graphGOLDBAR');
uuidv4 = require('uuidv4');
const util = require('util');

/* * * * * * * * * * */
/*   NODE HANDLING   */
/* * * * * * * * * * */

/**
 * Adds accept nodes to all remaining leaf nodes
 * @param stateGraph Current graph
 * @param boundaryStack Boundary stack
 */
function addAcceptNodes(stateGraph, boundaryStack) {
  const length = boundaryStack[0].leaves.length;
  for (let i = 0; i < length; i++) {
    const atom = boundaryStack[0].leaves.pop();
    const acceptId = uuidv4();

    stateGraph[acceptId] = {id: acceptId,
      text: handleOp.ACCEPT,
      type: handleOp.ACCEPT,
      component: handleOp.EPSILON,
      edges:[],
      operator: []
    };
    stateGraph[atom].edges.push(acceptId);
  }
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
  stateGraph[root].text = handleOp.ROOT;
  stateGraph[root].type = handleOp.ROOT;
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
 * Handles or operator
 * @param stateGraph Current graph
 * @param boundaryStack Boundary stack
 * @param parentId The ID of the parent epsilon node
 */
function handleOr(stateGraph, boundaryStack, parentId) {
  let a = boundaryStack.pop();
  let b = boundaryStack.pop();

  stateGraph[parentId].edges.push(a.head);
  stateGraph[parentId].edges.push(b.head);

  let children = [];

  let len = a.leaves.length;
  for(let i = 0; i < len; i++) {
    children.push(a.leaves.pop());
  }
  len = b.leaves.length;
  for(let i = 0; i < len; i++) {
    children.push(b.leaves.pop());
  }

  stateGraph[parentId].operator.push(handleOp.OR);
  addToBoundaryStack(parentId, children, boundaryStack);
}

/**
 * Handles then operator
 * @param stateGraph Current graph
 * @param boundaryStack Boundary stack
 * @param parentId The ID of the parent epsilon node
 */
function handleThen(stateGraph, boundaryStack, parentId) {
  const b = boundaryStack.pop();
  const a = boundaryStack.pop();
  // Gets all children of a and b to re-add to boundary stack
  const children = [];
  let len = a.leaves.length;
  for (let i = 0; i < len; i++) {
    const leaf = a.leaves.pop();
    stateGraph[leaf].edges.push(parentId);
  }
  len = b.leaves.length;
  for (let i = 0; i < len; i++) {
    children.push(b.leaves.pop());
  }
  stateGraph[parentId].edges.push(b.head);
  stateGraph[parentId].operator.push(handleOp.THEN);
  addToBoundaryStack(a.head, children, boundaryStack);
}

/**
 * Handles zero-or-more operator
 * Generates the following graph: parent -> a.head -> ... -> leaves -> parent
 * @param stateGraph Current graph
 * @param boundaryStack Boundary stack
 * @param parentId The ID of the parent epsilon node
 */
function handleZeroOrMore(stateGraph, boundaryStack, parentId) {
  const a = boundaryStack.pop();
  stateGraph[parentId].edges.push(a.head);
  const len = a.leaves.length;

  // Add edges from leaves of a to parent
  for (let i = 0; i < len; i++) {
    const leaf = a.leaves.pop();
    stateGraph[leaf].edges.push(parentId);
  }

  stateGraph[parentId].operator.push(handleOp.ZERO_MORE);
  addToBoundaryStack(parentId, [parentId], boundaryStack);
}

/**
 * Handles zero-or-one operator
 * @param stateGraph Current graph
 * @param boundaryStack Boundary stack
 * @param parentId The ID of the parent epsilon node
 */
function handleZeroOrOne(stateGraph, boundaryStack, parentId) {
  const a = boundaryStack.pop();
  const epsilonId = uuidv4();

  // first append a to parent
  // a == ep --> atom
  stateGraph[parentId].edges.push(a.head);

  // then make an epsilon node
  stateGraph[epsilonId] = {id: epsilonId,
    text: handleOp.EPSILON,
    type: handleOp.EPSILON,
    component: handleOp.ZERO_ONE,
    edges: [],
    operator: []
  };
  // point a's leaves to epsilon node
  for (let i = 0; i < a.leaves.length; i++ ) {
    stateGraph[a.leaves[i]].edges.push(epsilonId);
  }
  // point parent to epsilon node
  stateGraph[parentId].operator.push(handleOp.ZERO_ONE);
  stateGraph[parentId].edges.push(epsilonId);
  // add parent and epsilon node to boundary stack
  addToBoundaryStack(parentId, [epsilonId], boundaryStack);
}

/**
 * Handles one-or-more operator
 * Generates the following graph: parent -> a.head -> ... -> leaves -> epsilon -> a.head
 * @param stateGraph Current graph
 * @param boundaryStack Boundary stack
 * @param parentId The ID of the parent epsilon node
 */
function handleOneOrMore(stateGraph, boundaryStack, parentId) {
  const a = boundaryStack.pop();

  // if operating on a zero-or-more(...), ignore. otherwise, redundant edges are added.
  if (a.leaves.includes(a.head)) {
    addToBoundaryStack(a.head, a.leaves, boundaryStack);
    delete stateGraph[parentId];
    return;
  }
  stateGraph[parentId].edges.push(a.head);

  // Add edges from leaves of a to epsilon
  let tempLeaves = []; // TODO try to not need tempLeaves

  let len = a.leaves.length;
  for (let i = 0; i < len; i++) {
    const leaf = a.leaves.pop();
    tempLeaves.push(leaf);
    stateGraph[leaf].edges.push(a.head);
  }

  stateGraph[a.head].operator.unshift(handleOp.ONE_MORE);
  // stateGraph[parentId].operator.push(ONE_MORE);
  addToBoundaryStack(parentId, tempLeaves, boundaryStack);
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
  stateGraph[epsilonId] = {id: epsilonId,
    text: handleOp.EPSILON,
    type: handleOp.EPSILON,
    component: handleOp.ZERO_SBOL,
    edges:[],
    operator: []
  };
  stateGraph[parentId].edges.push(a.head);

  // Add edges from leaves of a to epsilon
  let tempLeaves = []; // TODO try to not need tempLeaves

  let len = a.leaves.length;
  for (let i = 0; i < len; i++) {
    const leaf = a.leaves.pop();
    tempLeaves.push(leaf);
    stateGraph[leaf].edges.push(epsilonId);
  }

  stateGraph[parentId].operator.push(handleOp.ZERO_SBOL);
  stateGraph[epsilonId].edges.push(parentId);
  addToBoundaryStack(parentId, tempLeaves, boundaryStack);
}

function handleZeroOrOneSbol(stateGraph, boundaryStack, parentId) {
  const a = boundaryStack.pop();

  const epsilonId = uuidv4();
  stateGraph[epsilonId] = {id: epsilonId,
    text: handleOp.EPSILON,
    type: handleOp.EPSILON,
    component: handleOp.EPSILON,
    edges:[],
    operator: []
  };
  stateGraph[parentId].edges.push(a.head);

  // Add edges from leaves of a to epsilon
  let tempLeaves = []; // TODO try to not need tempLeaves

  let len = a.leaves.length;
  for (let i = 0; i < len; i++) {
    const leaf = a.leaves.pop();
    tempLeaves.push(leaf);
    stateGraph[leaf].edges.push(epsilonId);
  }

  stateGraph[parentId].operator.push(handleOp.ZERO_ONE_SBOL);
  stateGraph[epsilonId].edges.push(parentId);
  addToBoundaryStack(parentId, tempLeaves, boundaryStack);
}

/**
 * Adds a single atom to the graph
 * @param atom Atom to add
 * @param stateGraph Current graph
 * @param boundaryStack Boundary stack
 * @param categories Categories
 */
function handleAtom(atom, stateGraph, boundaryStack, categories) {
  const epsilonId = uuidv4();
  const atomId = uuidv4();

  stateGraph[epsilonId] = {id: epsilonId,
    text: handleOp.EPSILON,
    type: handleOp.EPSILON,
    component: handleOp.EPSILON,
    edges: [atomId],
    operator: []
  };
  stateGraph[atomId] = {id: atomId,
    text: atom[0],
    type: handleOp.ATOM,
    component: categories[atom[0]],
    edges: [],
    operator: []};

  addToBoundaryStack(epsilonId, [atomId], boundaryStack);
}


/* * * * * * * * * * * */
/*   GRAPH TRAVERSAL   */
/* * * * * * * * * * * */
/**
 * Generates all paths through the graph
 * @param root The root node
 * @param stateGraph Current graph
 * @returns {object} Array of paths through graph
 */
function enumeratePaths(root, stateGraph, maxCycles) {
  let visited = {};
  let allPaths = [];

  collapseEpsilons(stateGraph, getEpsilonParents(stateGraph));

  visitNodes(root, visited, stateGraph, [], allPaths, maxCycles);
  return {graph: stateGraph, paths: allPaths};
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

  let numCycles = node.operator.filter(value => -1 !== [handleOp.ONE_MORE].indexOf(value));
  if (numCycles.length !== 0) {
    if (visited[nodeId] > maxCycles) {
      return;
    }
  }

  // Don't let atoms exceed max cycle depth
  if (visited[nodeId] > maxCycles && stateGraph[nodeId].type === handleOp.ATOM) {
    return;
  }
  // Allow epsilon nodes to exceed max cycle depth + 1, in case an atom is stuck in a cycle within a cycle
  if (visited[nodeId] > maxCycles + 1) {
    return;
  }
  // Handle ends of paths
  if (node.type === handleOp.ACCEPT) {
    processPath(currentPath, allPaths);
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
    if (node.type === handleOp.EPSILON || node.type === handleOp.ROOT) {
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
 * Remove all epsilon nodes with exactly one parent from graph
 * @param stateGraph Current graph
 * @param epsilonMap Map of epsilon nodes
 */
function collapseEpsilons(stateGraph, epsilonMap) {
  for (let epsilonId in epsilonMap){
    const parentIds = Array.from(epsilonMap[epsilonId]);
    // Check if epsilon has more than one parent
    if (parentIds.length !== 1) {
      continue;
    }
    // Transfer children to parent
    const parent = stateGraph[parentIds[0]];
    const epsilon = stateGraph[epsilonId];
    for (let child of epsilon.edges) {
      // Replace child's parent
      if (child in epsilonMap) {
        const index = Array.from(epsilonMap[child]).indexOf(epsilonId);
        if (index > -1) {
          epsilonMap[child].delete(epsilonId);
          epsilonMap[child].add(parentIds[0]);
        }
      }
      parent.edges.push(child);
      if (epsilon.operator !== undefined ) {
        const last = parent.operator.length - 1;
        // Do not add duplicate ORs or ZeroOrOnes
        for (var i = 0; i < epsilon.operator.length; i++) {
          if (epsilon.operator[0] === handleOp.ZERO_ONE && parent.operator[last] === handleOp.ZERO_ONE) {
            continue;
          }
          if (parent.operator[last] !== handleOp.OR || epsilon.operator[0] !== handleOp.OR) {
            parent.operator.push(epsilon.operator[i]);
          }
        }
      }
    }
    // Remove epsilon from parent's edge
    const edgeIndex = parent.edges.indexOf(epsilonId);
    if (edgeIndex > -1) {
      parent.edges.splice(edgeIndex, 1);
    }
    // Remove epsilon from state graph
    delete stateGraph[epsilonId];
  }
}

/**
 * Gets each epsilon node's parents
 * @param stateGraph Current graph
 * @returns {Object} Map of each epsilon node's parents
 */
function getEpsilonParents(stateGraph) {
  let epsilonMap = {};

  for (let nodeId in stateGraph) {
    // Check if node is the parent to any epsilons, then update epsilonMap
    for (let childId of stateGraph[nodeId].edges){
      if (stateGraph[childId].type === handleOp.EPSILON){
        if(!(childId in epsilonMap)){
          epsilonMap[childId] = new Set();
        }
        epsilonMap[childId].add(nodeId);
      }
    }
  }

  return epsilonMap;
}

module.exports = {
  enumeratePaths,
  getEpsilonParents,
  collapseEpsilons,
  generateRootNode,
  addAcceptNodes,
  handleAtom,
  handleOr,
  handleThen,
  handleZeroOrMore,
  handleZeroOrOne,
  handleOneOrMore,
  handleZeroOrMoreSbol,
  handleZeroOrOneSbol
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
    pathStr += ' ' + path[i].id;
  }
  console.log(pathStr);
}
