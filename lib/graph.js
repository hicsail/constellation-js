'use strict';

const uuidv4 = require('uuidv4');

// Global Constants
const EPSILON = 'o';  // Denotes an intermediary node
const ATOM = 'atom';  // Denotes a GOLDBAR atom
const END = 'end';    // Denotes an end node/a global leaf
const ROOT = 'root';  // Denotes the unique root node

/* * * * * * * * * * * */
/*   GRAPH GENERATION  */
/* * * * * * * * * * * */

/**
 * Generates graph based on parsed GOLDBAR object
 * @param parsedObject
 * @returns {{stateGraph: Object, paths: Array}}
 */
function graph(parsedObject) {
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
 * @param stateGraph The current graph
 * @param boundaryStack The boundary stack
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
 * @param stateGraph The current graph
 * @param boundaryStack The boundary stack
 */
function addEndNodes(stateGraph, boundaryStack) {
  const len = boundaryStack[0].leaves.length;

  for (let i = 0; i < len; i++) {
    const atom = boundaryStack[0].leaves.pop();
    const acceptId = uuidv4();

    stateGraph[acceptId] = {text: END, dataType: END, edges:[]};
    stateGraph[atom].edges.push(acceptId);
  }
}

/**
 * Chooses root node. Boundary stack should only have one connected element remaining
 * @param stateGraph The current graph
 * @param boundaryStack The boundary stack
 * @returns {*}
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
 * Add a single element to boundary stack
 * @param root The root of the connected graph to add
 * @param children Array of root's children
 * @param boundaryStack The boundaryStack to add to
 */
function addToBoundaryStack(root, children, boundaryStack) {
  const obj = {head: root, leaves: children};
  boundaryStack.push(obj);
}

/* * * * * * * * */
/*   OPERATORS   */
/* * * * * * * * */

/**
 * Handles operators and calls appropriate functions
 * @param op Operator
 * @param stateGraph The current graph
 * @param boundaryStack The boundary stack
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
 * @param stateGraph The current graph
 * @param boundaryStack The boundary stack
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
 * @param stateGraph The current graph
 * @param boundaryStack The boundary stack
 * @param parentId The ID of the parent epsilon node
 */
function handleAnd(stateGraph, boundaryStack, parentId) {
  console.log('AND not yet supported')
  // TODO implement and
}

/**
 * Handles then operator
 * @param stateGraph The current graph
 * @param boundaryStack The boundary stack
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
 * @param stateGraph The current graph
 * @param boundaryStack The boundary stack
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
 * @param stateGraph The current graph
 * @param boundaryStack The boundary stack
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
 * @param atom The atom to add
 * @param stateGraph The current graph
 * @param boundaryStack The boundary stack
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

function enumeratePaths(root, stateGraph) {
  let visited = {};
  let epsilonMap = {}; //{nodeId:(set of parent IDs)}

  const rootEdges = stateGraph[root].edges;
  for (let i = 0; i < rootEdges.length; i++) {
    visited[rootEdges[i]] = false;
  }

  const allPaths = [];
  visitNodes(root, visited, stateGraph, [], allPaths, epsilonMap);
  collapseEpsilons(stateGraph, epsilonMap);
  return allPaths;
}

function visitNodes(nodeId, visited, stateGraph, currentPath, allPaths, epsilonMap) {
  visited[nodeId] = true;
  const node = stateGraph[nodeId];

  // store parent for every epsilon
  for (let i =0; i < node.edges.length; i++){
    const edgeId = node.edges[i];
    if (stateGraph[edgeId].dataType === EPSILON){
      if(!(edgeId in epsilonMap)){
        epsilonMap[edgeId] = new Set();
      }
      epsilonMap[edgeId].add(nodeId);
    }
  }

  currentPath.push({id: nodeId, data: node});
  processChildren(node.edges, visited, stateGraph, currentPath, allPaths, epsilonMap);

  currentPath.pop();
  visited[nodeId] = false;
}

//collapse epsilons with one parent
function collapseEpsilons(stateGraph, epsilonMap){
  for (let epsilonId in epsilonMap){
    if (epsilonMap.hasOwnProperty(epsilonId)) {
      let parentIds = Array.from(epsilonMap[epsilonId]);
      // If epsilon has one parent, tranfer children to parent
      if (parentIds.length === 1){
        const parentId = parentIds[0];
        const transferChildren = stateGraph[epsilonId].edges;
        const transferChildrenLen = transferChildren.length;
        for (let i = 0; i < transferChildrenLen; i++){
          const transferChild = transferChildren.pop();
          //Replace parentId in epsilonMap
          if (transferChild in epsilonMap){
            const index = Array.from(epsilonMap[transferChild]).indexOf(epsilonId);
            if (index > -1) {
              epsilonMap[transferChild].delete(epsilonId);
              epsilonMap[transferChild].add(parentId);
            }
          }
          //give children to parent
          stateGraph[parentId].edges.push(transferChild);
        }
        //remove epsilon from parent's edge
        const eIndex = stateGraph[parentId].edges.indexOf(epsilonId);
        if (eIndex > -1) {
          stateGraph[parentId].edges.splice(eIndex, 1);
        }
        //remove epsilon from stategraph
        delete stateGraph[epsilonId];
      }
    }
  }
}

function processChildren(children, visited, stateGraph, currentPath, allPaths, epsilonMap) {
  for (let i = 0; i < children.length; i++) {
    const childId = children[i];

    if (stateGraph[childId].dataType === END) {
      processPath(currentPath, allPaths);
    } else {
      if (!visited[childId]) {
        visitNodes(childId, visited, stateGraph, currentPath, allPaths, epsilonMap);
      } else {
        if (checkCycle(childId, currentPath)) {
          // process other edges
          let childEdges = stateGraph[childId].edges;
          const unprocessed = getUnprocessedEdges(childEdges, currentPath);
          // TODO: do they need to be processed or can I just call visitNodes?
          processChildren(unprocessed, visited, stateGraph, currentPath, allPaths, epsilonMap)
        }
      }
    }
  }
}

function processPath(path, allPaths) {

  const processedPath = [];
  for (let i = 0; i < path.length; i++) {
    if (path[i].data.dataType !== EPSILON) {
      // Deep copy of object
      processedPath.push(JSON.parse(JSON.stringify(path[i])));
    }
  }
  allPaths.push(processedPath);
}

function checkCycle(nodeId, currentPath) {
  for (let i = 0; i < currentPath.length; i++) {
    if (nodeId === currentPath[i].id) {
      return true;
    }
  }
  return false;
}

// returns all edges that are not yet in path
function getUnprocessedEdges(edges, path) {
  const unprocessed = [];
  for (let i = 0; i < edges.length; i++) {
    let inList = false;
    for (let j = 0; j < path.length; j++) {
      if (edges[i] === path[j].id) {
        inList = true;
        break;
      }
    }
    if (!inList) {
      unprocessed.push(edges[i]);
    }
  }
  return unprocessed;
}

// Ensure constants are accessible externally.
graph.EPSILON = EPSILON;
graph.ATOM = ATOM;
graph.ACCEPT = END;
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
  console.log(pathstr);
}
