if (typeof window === 'undefined') {
  uuidv4 = require('uuidv4');
}

// Global Constants
const EPSILON = 'o';  // Denotes an intermediary node
const ATOM = 'atom';  // Denotes a GOLDBAR atom
const ACCEPT = 'accept';    // Denotes an end node/a global leaf
const ROOT = 'root';  // Denotes the unique root node

/* * * * * * * * * * * */
/*   GRAPH GENERATION  */
/* * * * * * * * * * * */

/**
 * Generates graph based on parsed GOLDBAR object
 * @param parsedObject Parsed GOLDBAR object
 * @returns {{stateGraph: Object, paths: Array}}
 */
const graph = function (parsedObject) {
  const stateGraph = {};    // Stores currently generated edges
  const boundaryStack = []; // Stores connected nodes in an object. Leaf nodes are stored in object.leaves

  // Generate graph
  populateGraph(parsedObject, stateGraph, boundaryStack);
  addEndNodes(stateGraph, boundaryStack);

  // Generate global root of whole graph
  const root = generateRootNode(stateGraph, boundaryStack);

  // Generate all paths
  const paths = enumeratePaths(root, stateGraph);

  return {stateGraph: stateGraph, paths: paths};
}

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
 * Adds end nodes to all remaining leaf nodes
 * @param stateGraph Current graph
 * @param boundaryStack Boundary stack
 */
function addEndNodes(stateGraph, boundaryStack) {
  const length = boundaryStack[0].leaves.length;

  for (let i = 0; i < length; i++) {
    const atom = boundaryStack[0].leaves.pop();
    const acceptId = uuidv4();

    stateGraph[acceptId] = {text: ACCEPT, dataType: ACCEPT, edges:[]};
    stateGraph[atom].edges.push(acceptId);
  }
}

/**
 * Chooses root node. Boundary stack should only have one connected element remaining
 * @param stateGraph Current graph
 * @param boundaryStack Boundary stack
 * @returns {*} Root node
 */
function generateRootNode(stateGraph, boundaryStack) {
  if (boundaryStack.length === 1) {
    let root = boundaryStack[0].head;
    stateGraph[root].text = ROOT;
    stateGraph[root].dataType = ROOT;
    return root;
  }
  throw new Error['Error generating graph'];
}

/**
 * Add a connected component to the boundary stack
 * @param head The head of the component to add
 * @param children Array of head's children's IDs
 * @param boundaryStack The boundaryStack to add to
 */
function addToBoundaryStack(head, children, boundaryStack) {
  let obj = {head: head, leaves: children};
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
  stateGraph[parentId] = {text: EPSILON, dataType: EPSILON, edges:[]};

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
  const a = boundaryStack.pop();
  const b = boundaryStack.pop();

  // Add nodes to stateGraph
  stateGraph[parentId].edges.push(a.head);
  stateGraph[parentId].edges.push(b.head);

  // Gets all children of a and b to re-add to boundary stack
  const children = [];
  for (let i = 0; i < a.leaves.length; i++) {
    children.push(a.leaves.pop());
  }
  for (let i = 0; i < b.leaves.length; i++) {
    children.push(b.leaves.pop());
  }

  // Add or node to boundary stack
  addToBoundaryStack(parentId, children, boundaryStack);
}

/**
 * Handles and operator
 * @param stateGraph Current graph
 * @param boundaryStack Boundary stack
 * @param parentId The ID of the parent epsilon node
 */
function handleAnd(stateGraph, boundaryStack, parentId) {
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
  for (let i = 0; i < a.leaves.length; i++) {
    const leaf = a.leaves.pop();
    stateGraph[leaf].edges.push(parentId);
  }
  for (let i = 0; i < b.leaves.length; i++) {
    children.push(b.leaves.pop());
  }
  stateGraph[parentId].edges.push(b.head);
  addToBoundaryStack(a.head, children, boundaryStack);
}

/**
 * Handles zero-or-more operator
 * @param stateGraph Current graph
 * @param boundaryStack Boundary stack
 * @param parentId The ID of the parent epsilon node
 */
function handleZeroOrMore(stateGraph, boundaryStack, parentId) {
  const a = boundaryStack.pop();

  stateGraph[parentId].edges.push(a.head);

  const children = [];

  // Gets all children of a to re-add to boundary stack
  for (let i = 0; i < a.leaves.length; i++) {
    const leaf = a.leaves.pop();
    children.push(leaf); // children is not used after this assignment?
    stateGraph[leaf].edges.push(parentId);
  }

  addToBoundaryStack(parentId, [parentId], boundaryStack);
}

/**
 * Handles one-or-more operator
 * Generates the following graph: parent --> a.root -> leaves --> epsilon --> parent
 * @param stateGraph Current graph
 * @param boundaryStack Boundary stack
 * @param parentId The ID of the parent epsilon node
 */
function handleOneOrMore(stateGraph, boundaryStack, parentId) {
  const a = boundaryStack.pop();

  const epsilonId = uuidv4();
  stateGraph[epsilonId] = {text: EPSILON, dataType: EPSILON, edges:[]};
  stateGraph[parentId].edges.push(a.head);

  // Gets all children of a to re-add to boundary stack
  for (let i = 0; i < a.leaves.length; i++) {
    const leaf = a.leaves.pop();
    stateGraph[leaf].edges.push(epsilonId);
  }
  stateGraph[epsilonId].edges.push(parentId);
  addToBoundaryStack(parentId, [epsilonId], boundaryStack);
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

  stateGraph[epsilonId] = {text: EPSILON, dataType: EPSILON, edges: [atomId]};
  stateGraph[atomId] = {text: atom, dataType: ATOM, edges: []};

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
function enumeratePaths(root, stateGraph) {
  let visited = {};
  let epsilonMap = {}; // {nodeId:(set of parent IDs)}

  // Initialise root's neighbours as unvisited
  const rootEdges = stateGraph[root].edges;
  for (let i = 0; i < rootEdges.length; i++) {
    visited[rootEdges[i]] = false;
  }

  const allPaths = [];
  visitNodes(root, visited, stateGraph, [], allPaths, epsilonMap);
  collapseEpsilons(stateGraph, epsilonMap);
  return allPaths;
}

/**
 * Visits a node and calls functions to process node's children
 * @param nodeId Node to visit
 * @param visited Array of visited nodes
 * @param stateGraph Current graph
 * @param currentPath Current path being checked
 * @param allPaths Array of all final paths
 * @param epsilonMap Map of epsilon nodes
 */
function visitNodes(nodeId, visited, stateGraph, currentPath, allPaths, epsilonMap) {
  visited[nodeId] = true;
  const node = stateGraph[nodeId];

  // Check if node is the parent to any epsilons, then update epsilonMap
  for (let childId of node.edges){
    if (stateGraph[childId].dataType === EPSILON){
      if(!(childId in epsilonMap)){
        epsilonMap[childId] = new Set();
      }
      epsilonMap[childId].add(nodeId);
    }
  }

  currentPath.push({id: nodeId, data: node});
  processChildren(node.edges, visited, stateGraph, currentPath, allPaths, epsilonMap);

  currentPath.pop();
  visited[nodeId] = false;
}

/**
 * Visits children of a node and checks for complete paths
 * @param children Array of children's IDs to process
 * @param visited Array of visited nodes
 * @param stateGraph Current graph
 * @param currentPath Current path being checked
 * @param allPaths Array of all final paths
 * @param epsilonMap Map of epsilon nodes
 */
function processChildren(children, visited, stateGraph, currentPath, allPaths, epsilonMap) {
  for (let childId of children) {
    // If end of path is reached, add currentPath to allPaths
    if (stateGraph[childId].dataType === ACCEPT) {
      processPath(currentPath, allPaths);
      continue;
    }

    // If child is not visited, visit that child
    if (!visited[childId]) {
      visitNodes(childId, visited, stateGraph, currentPath, allPaths, epsilonMap);
      continue;
    }

    // If a child forms a cycle in currentPath, process its children
    if (checkCycle(childId, currentPath)) {
      let grandchildren = stateGraph[childId].edges;
      const unprocessedGrandchildren = getNodesNotInPath(grandchildren, currentPath);
      // TODO: Do they need to be processed or can I just call visitNodes?
      // visitNodes(child, visited, stateGraph, currentPath, allPaths, epsilonMap);
      processChildren(unprocessedGrandchildren, visited, stateGraph, currentPath, allPaths, epsilonMap)
    }
  }
}

/**
 * Adds a path to array of final paths. Does not save epsilon nodes
 * @param path Path to add
 * @param allPaths Array of final paths
 */
function processPath(path, allPaths) {
  const processedPath = [];
  for (let node of path) {
    if (node.data.dataType === EPSILON) {
      continue;
    }
    // Deep copy of node
    processedPath.push(JSON.parse(JSON.stringify(node)));
  }
  allPaths.push(processedPath);
}

/**
 * Checks if a node forms a cycle in a path
 * @param nodeId ID of node to check
 * @param currentPath Path in which to check for a cycle
 * @returns {boolean}
 */
function checkCycle(nodeId, currentPath) {
  for (let node of currentPath) {
    if (node.id === nodeId) {
      return true;
    }
  }
  return false;
}

/**
 * Finds nodes from a array of nodes that are not in a path
 * @param nodes Array of nodes
 * @param path Path to check array to
 * @returns {Array} Array of nodes that are not in path
 */
function getNodesNotInPath(nodes, path) {
  let notInPath = [];
  for (let nodeId of nodes) {
    let inList = false;
    for (let pathNode of path) {
      if (nodeId === pathNode.id) {
        inList = true;
        break;
      }
    }
    if (!inList) {
      notInPath.push(nodeId);
    }
  }
  return notInPath;
}

/**
 * Remove all unnecessary epsilon nodes (ones with exactly one parent) from graph
 * @param stateGraph Current graph
 * @param epsilonMap Map of epsilon nodes
 */
function collapseEpsilons(stateGraph, epsilonMap){
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
      // Give children to parent
      stateGraph[parentId].edges.push(child);
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

/**
 * Prints a path to the console
 * @param path The path to print
 */
function printPath(path) {
  let pathStr = 'Path: ';
  for (let i = 0; i < path.length; i++) {
    if (path[i].data.dataType !== EPSILON) {
      pathStr += ' ' + path[i].data.text;
    }
  }
  console.log(pathStr);
}
