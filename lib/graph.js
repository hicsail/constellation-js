'use strict';

let uuidv4 = require('uuidv4');

// Global Constants
const EPSILON = 'o';
const ATOM = 'atom';
const ACCEPT = 'accept';
const ROOT = 'root';

/* * * * * * * * * * */
/*   NODE HANDLING   */
/* * * * * * * * * * */

// Root of the graph should always be the root of the only remaining element in the boundary stack
function getRootNode(stateGraph, boundaryStack) {
  return boundaryStack[0].root;
}

// Adding accept nodes to every leaf remaining on boundary stack
function addAcceptNodes(stateGraph, boundaryStack) {
  const len = boundaryStack[0].leaves.length;

  for (let i = 0; i < len; i++) {
    const atom = boundaryStack[0].leaves.pop();
    const acceptId = uuidv4();

    stateGraph[acceptId] = {text: ACCEPT, dataType: ACCEPT, edges:[]};
    stateGraph[atom].edges.push(acceptId);
  }
}

// New element on boundary stack
function addToBoundaryStack(root, children, boundaryStack) {
  const obj = {root: root, leaves: children};
  boundaryStack.push(obj);
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

function populateGraph(parsed, stateGraph, boundaryStack) {

  if (parsed.Atom) {
    handleAtom(parsed.Atom, stateGraph, boundaryStack);
    return;
  }

  if (Array.isArray(parsed)) {
    for (let i = 0; i < parsed.length; i++) {
      populateGraph(parsed[i], stateGraph, boundaryStack);
    }
    return;
  }

  if (Object.keys(parsed).length > 0) {
    for (let k in parsed) {
      const operation = k;
      populateGraph(parsed[k], stateGraph, boundaryStack);
      handleOp(operation, boundaryStack, stateGraph);
    }
  }
}

function printPath(path) {
  let pathStr = 'Path: ';
  for (let i = 0; i < path.length; i++) {
    if (path[i].data.dataType !== EPSILON) {
      pathStr += ' ' + path[i].data.text;
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

function processChildren(children, visited, stateGraph, currentPath, allPaths, epsilonMap) {
  for (let i = 0; i < children.length; i++) {
    const childId = children[i];

    if (stateGraph[childId].dataType === ACCEPT) {
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


/* * * * * * * * */
/*   OPERATORS   */
/* * * * * * * * */

function handleOp(op, boundaryStack, stateGraph) {
  // Parent must always be added to the graph
  const parentId = uuidv4();
  stateGraph[parentId] = {text: EPSILON, dataType: EPSILON, edges:[]};

  if (op === 'Or') {
    handleOr(boundaryStack, stateGraph, parentId);
  }
  if (op === 'And') {
    handleAnd(boundaryStack, stateGraph, parentId);
  }
  if (op === 'Then') {
    handleThen(boundaryStack, stateGraph, parentId);
  }
  if (op === 'ZeroOrMore') {
    handleZeroOrMore(boundaryStack, stateGraph, parentId);
  }
  if (op === 'OneOrMore') {
    handleOneOrMore(boundaryStack, stateGraph, parentId);
  }
}

function handleOr(boundaryStack, stateGraph, parentId) {
  const a = boundaryStack.pop();
  const b = boundaryStack.pop();

  stateGraph[parentId].edges.push(a.root);
  stateGraph[parentId].edges.push(b.root);

  const children = [];
  for (let i = 0; i < a.leaves.length; i++) {
    children.push(a.leaves.pop());
  }
  for (let i = 0; i < b.leaves.length; i++) {
    children.push(b.leaves.pop());
  }

  addToBoundaryStack(parentId, children, boundaryStack);
}

function handleAnd(boundaryStack, stateGraph, parentId) {
  console.log('AND not yet supported')
}

function handleThen(boundaryStack, stateGraph, parentId) {
  const b = boundaryStack.pop();
  const a = boundaryStack.pop();

  const children = [];

  for (let i = 0; i < a.leaves.length; i++) {
    const leaf = a.leaves.pop();
    stateGraph[leaf].edges.push(parentId);
  }
  for (let i = 0; i < b.leaves.length; i++) {
    children.push(b.leaves.pop());
  }

  stateGraph[parentId].edges.push(b.root);
  addToBoundaryStack(a.root, children, boundaryStack);
}

// Zero or more
function handleZeroOrMore(boundaryStack, stateGraph, parentId) {
  const a = boundaryStack.pop();

  stateGraph[parentId].edges.push(a.root);

  const children = [];

  for (let i = 0; i < a.leaves.length; i++) {
    const leaf = a.leaves.pop();
    children.push(leaf); // children is not used after this assignment?
    stateGraph[leaf].edges.push(parentId);
  }

  addToBoundaryStack(parentId, [parentId], boundaryStack);
}

// parent --> a.root -> leaves --> epsilon --> parent
function handleOneOrMore(boundaryStack, stateGraph, parentId) {
  const a = boundaryStack.pop();

  const epsilonId = uuidv4();
  stateGraph[epsilonId] = {text: EPSILON, dataType: EPSILON, edges:[]};

  stateGraph[parentId].edges.push(a.root);

  for (let i = 0; i < a.leaves.length; i++) {
    const leaf = a.leaves.pop();
    stateGraph[leaf].edges.push(epsilonId);
  }
  stateGraph[epsilonId].edges.push(parentId);
  addToBoundaryStack(parentId, [epsilonId], boundaryStack);
}

function handleAtom(atom, stateGraph, boundaryStack) {
  const epsilonId = uuidv4();
  const atomId = uuidv4();

  stateGraph[epsilonId] = {text: EPSILON, dataType: EPSILON, edges: [atomId]};
  stateGraph[atomId] = {text: atom, dataType: ATOM, edges: []};

  addToBoundaryStack(epsilonId, [atomId], boundaryStack);
}

const graph = function (parsed) {
  const stateGraph = {};
  const boundaryStack = [];

  // stategraph.populate(parsed, boundaryStack);
  populateGraph(parsed, stateGraph, boundaryStack);
  addAcceptNodes(stateGraph, boundaryStack);

  const root = getRootNode(stateGraph, boundaryStack);
  stateGraph[root].text = ROOT;
  stateGraph[root].dataType = ROOT;

  const paths = enumeratePaths(root, stateGraph);

  return {stateGraph: stateGraph, paths: paths};
};

// Ensure constants are accessible externally.
graph.EPSILON = EPSILON;
graph.ATOM = ATOM;
graph.ACCEPT = ACCEPT;
graph.ROOT = ROOT;

if (typeof window === 'undefined') {
  module.exports = graph;
}
