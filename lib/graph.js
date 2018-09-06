/*global uuidv4:true*/

if (typeof window === 'undefined') {
  uuidv4 = require('uuidv4');
}

// Global Constants
const EPSILON = 'epsilon';  // Denotes an intermediary node
const ATOM = 'atom';  // Denotes a GOLDBAR atom
const ACCEPT = 'accept';    // Denotes an end node/a global leaf
const ROOT = 'root';  // Denotes the unique root node

const OR = 'or';
const THEN = 'then';
const ONE_MORE = "one-or-more";
const ZERO_MORE = "zero-or-more";

/* * * * * * * * * * * */
/*   GRAPH GENERATION  */
/* * * * * * * * * * * */

/**
 * Generates graph based on parsed GOLDBAR object
 * @param parsedObject Parsed GOLDBAR object
 * @returns {{stateGraph: Object, paths: Array}}
 */
const graph = function (parsedObject, maxCycles) {
  if (maxCycles > 10) {
    throw new Error('Cycle depth is too high');
  }

  const stateGraph = {};    // Stores currently generated edges
  const boundaryStack = []; // Stores connected nodes in an object. Leaf nodes are stored in object.leaves

  // Generate graph
  populateGraph(parsedObject, stateGraph, boundaryStack);
  addAcceptNodes(stateGraph, boundaryStack);

  // Get root of whole graph
  const root = generateRootNode(stateGraph, boundaryStack);

  // Generate all paths
  const paths = enumeratePaths(root, stateGraph, maxCycles);

  return {stateGraph, paths};
};

/**
 * Receives object from parsed GOLDBAR specification and recursively builds a graph
 * @param parsed The parsed GOLDBAR object
 * @param stateGraph Current graph
 * @param boundaryStack Boundary stack
 */
function populateGraph(parsed, stateGraph, boundaryStack) {
  // Handle if input is an atom
  if (parsed.Atom) {
    handleAtom(parsed.Atom, stateGraph, boundaryStack);
    return;
  }

  // Handle if input is an or
  if (Array.isArray(parsed)) {
    for (let i = 0; i < parsed.length; i++) {
      populateGraph(parsed[i], stateGraph, boundaryStack);
    }
    return;
  }

  // Handle if input contains other or nested operations
  if (Object.keys(parsed).length > 0) {
    for (let operation in parsed) {
      populateGraph(parsed[operation], stateGraph, boundaryStack);
      handleOp(operation, stateGraph, boundaryStack);
    }
  }
}

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

    stateGraph[acceptId] = {id: acceptId, text: ACCEPT, type: ACCEPT, edges:[]};
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
    throw new Error['Error generating graph'];
  }
  let root = boundaryStack[0].head;
  stateGraph[root].text = ROOT;
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
  // Parent must always be added to the graph
  const parentId = uuidv4();
  stateGraph[parentId] = {id: parentId, text: EPSILON, type: EPSILON, edges:[]};

  if (op === 'Or') {
    handleOr(stateGraph, boundaryStack, parentId);
  }
  if (op === 'And') {
    handleAnd(stateGraph, boundaryStack, parentId);
  }
  if (op === 'Then') {
    handleThen(stateGraph, boundaryStack, parentId);
  }
  if (op === 'ZeroOrMore') {
    handleZeroOrMore(stateGraph, boundaryStack, parentId);
  }
  if (op === 'OneOrMore') {
    handleOneOrMore(stateGraph, boundaryStack, parentId);
  }
}

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

  stateGraph[parentId].operator = [OR];
  addToBoundaryStack(parentId, children, boundaryStack);
}

/**
 * Handles and operator
 * @param stateGraph Current graph
 * @param boundaryStack Boundary stack
 * @param parentId The ID of the parent epsilon node
 */
function handleAnd(stateGraph, boundaryStack, parentId) { // eslint-disable-line no-unused-vars
  throw new Error('AND not yet supported');
  // TODO implement and
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
  stateGraph[parentId].operator = [THEN];
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

  // Add edges from leaves of a to parent
  for (let i = 0; i < a.leaves.length; i++) {
    const leaf = a.leaves.pop();
    stateGraph[leaf].edges.push(parentId);
  }

  stateGraph[parentId].operator = [ZERO_MORE];
  addToBoundaryStack(parentId, [parentId], boundaryStack);
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

  const epsilonId = uuidv4();
  stateGraph[epsilonId] = {id: epsilonId, text: EPSILON, type: EPSILON, edges:[]};
  stateGraph[parentId].edges.push(a.head);

  // Add edges from leaves of a to epsilon
  let tempLeaves = []; // TODO try to not need tempLeaves

  let len = a.leaves.length;
  for (let i = 0; i < len; i++) {
    const leaf = a.leaves.pop();
    tempLeaves.push(leaf);
    stateGraph[leaf].edges.push(epsilonId);
  }

  stateGraph[parentId].operator = [ONE_MORE];
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
  const epsilonId = uuidv4();
  const atomId = uuidv4();

  stateGraph[epsilonId] = {id: epsilonId, text: EPSILON, type: EPSILON, edges: [atomId]};
  stateGraph[atomId] = {id: atomId, text: atom[0], type: ATOM, edges: []};

  addToBoundaryStack(epsilonId, [atomId], boundaryStack);
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

  let epsilonMap = getEpsilonParents(stateGraph);
  collapseEpsilons(stateGraph, epsilonMap);

  visitNodes(root, visited, stateGraph, [], allPaths, maxCycles);
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
 * Remove all epsilon nodes with exactly one parent from graph
 * @param stateGraph Current graph
 * @param epsilonMap Map of epsilon nodes
 */
function collapseEpsilons(stateGraph, epsilonMap) {
  for (let epsilonId in epsilonMap){
    let parentIds = Array.from(epsilonMap[epsilonId]);
    // Check if epsilon has more than one parent
    if (parentIds.length !== 1) {
      continue;
    }
    // Transfer children to parent
    const parentId = parentIds[0];
    const children = stateGraph[epsilonId].edges;
    for (let child of children) {
      // Replace child's parent
      if (child in epsilonMap) {
        const index = Array.from(epsilonMap[child]).indexOf(epsilonId);
        if (index > -1) {
          epsilonMap[child].delete(epsilonId);
          epsilonMap[child].add(parentId);
        }
      }
      stateGraph[parentId].edges.push(child);  
      if (stateGraph[epsilonId].operator !== undefined ) {
        const last = stateGraph[parentId].operator.length - 1;
        // Do not add duplicate ORs
        for (var i = 0; i < stateGraph[epsilonId].operator.length; i++) {
          if (stateGraph[parentId].operator[last] !== OR || (stateGraph[epsilonId].operator[0] !== OR)) {
            stateGraph[parentId].operator.push(stateGraph[epsilonId].operator[i]);    
          }
        }
      }
    }
    // Remove epsilon from parent's edge
    const edgeIndex = stateGraph[parentId].edges.indexOf(epsilonId);
    if (edgeIndex > -1) {
      stateGraph[parentId].edges.splice(edgeIndex, 1);
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
      if (stateGraph[childId].type === EPSILON){
        if(!(childId in epsilonMap)){
          epsilonMap[childId] = new Set();
        }
        epsilonMap[childId].add(nodeId);
      }
    }
  }

  return epsilonMap;
}

// Ensure constants are accessible externally.
graph.EPSILON = EPSILON;
graph.ATOM = ATOM;
graph.ACCEPT = ACCEPT;
graph.ROOT = ROOT;

if (typeof window === 'undefined') {
  module.exports = graph;
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
