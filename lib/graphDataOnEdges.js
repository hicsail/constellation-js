/*global uuidv4:true*/
handleOp = require('./handleOperators');
graphGOLDBAR = require('./graphGOLDBAR');
combineGraphs = require('./combineGraphs');
uuidv4 = require('uuidv4');

util = require('util');


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
    stateGraph[leafId].type = handleOp.ACCEPT;
    stateGraph[leafId].text = handleOp.ACCEPT;
  }
}

function createEpsilonNode(stateGraph) {
  const epsilonId = uuidv4();
  stateGraph[epsilonId] = {id: epsilonId, text: handleOp.EPSILON, type: handleOp.EPSILON, edges: [], operator: []};
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

  if (stateGraph[root].type === handleOp.ACCEPT) {
    stateGraph[root].text = handleOp.ROOT;
  } else {
    stateGraph[root].text = handleOp.ROOT;
    stateGraph[root].type = handleOp.ROOT;
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
 * Handles or operator
 * @param stateGraph Current graph
 * @param boundaryStack Boundary stack
 * @param populateArgs arguments to populateGraph from graphGOLDBAR
 */
function handleOr(stateGraph, boundaryStack, representation, populateArgs) {
  let parentId = createEpsilonNode(stateGraph);
  let leaves = [];
  let partialBoundaryStack = [];
  // find partial stateGraphs for each half of the And
  for (let i = 0; i < populateArgs.parsed.length; i++) {
    let partialBoundary = [];
    graphGOLDBAR.populateGraph(populateArgs.parsed[i], stateGraph, partialBoundary, representation, populateArgs.categories, populateArgs.maxCycles, populateArgs.andTolerance, populateArgs.mergeTolerance);
    partialBoundaryStack = partialBoundaryStack.concat(partialBoundary);
  }

  // console.log(partialBoundaryStack);
  while (partialBoundaryStack.length > 0) {
    let orObj = partialBoundaryStack.pop();
    stateGraph[parentId].edges.push({'src': parentId, 'dest': orObj.head, 'component': handleOp.EPSILON, 'type': handleOp.EPSILON, 'text': handleOp.EPSILON});
    for (let leaf of orObj.leaves) {
      leaves.push(leaf);
    }
  }

  stateGraph[parentId].operator.push(handleOp.OR);
  addToBoundaryStack(parentId, leaves, boundaryStack);
}

/**
 * Handles or operator when parsing SBOL
 * @param stateGraph Current graph
 * @param partialBoundary Boundary stack
 */
function handleOrSBOL(stateGraph, partialBoundary) {
  let parentId = createEpsilonNode(stateGraph);
  let children = [];

  // everything on the partial boundary stack is something to be OR-ed
  while (partialBoundary.length > 0) {
    let orPart = partialBoundary.pop();
    stateGraph[parentId].edges.push({'src': parentId, 'dest': orPart.head, 'component': handleOp.EPSILON, 'type': handleOp.EPSILON, 'text': handleOp.EPSILON});
    children.push(...orPart.leaves)
  }

  stateGraph[parentId].operator.push(handleOp.OR);
  addToBoundaryStack(parentId, children, partialBoundary);
}


/**
 * Handles and operator
 * @param stateGraph Current graph
 * @param boundaryStack Boundary stack
 * @param representation String: Which kind of graph to build
 * @param populateArgs Object: arguments to populateGraph (from graphGOLDBAR)
 */
function handleAnd(stateGraph, boundaryStack, representation, populateArgs) {
  let partialStateGraphs = {};
  let partialBoundaryStacks = [];
  let artificialCategories = {}; // repeat the categories for every partial graph (to work with existing combineGraphs)
  // find partial stateGraphs for each half of the And
  for (let i = 0; i < populateArgs.parsed.length; i++) {
    let partialGraph = {};
    let partialBoundary = [];
    graphGOLDBAR.populateGraph(populateArgs.parsed[i], partialGraph, partialBoundary, representation, populateArgs.categories, populateArgs.maxCycles, populateArgs.andTolerance, populateArgs.mergeTolerance);
    partialStateGraphs[i] = partialGraph;
    partialBoundaryStacks.push(partialBoundary);
    artificialCategories[i] = populateArgs.categories;
  }
  // add accept and root nodes to the partial graphs (to work with existing combineGraphs)
  for (let i = 0; i < Object.keys(partialStateGraphs).length; i++) {
    let partial = partialStateGraphs[i];
    addAcceptNodes(partial, partialBoundaryStacks[i]);
    generateRootNode(partial, partialBoundaryStacks[i]);
    collapseEpsilons(partial);
  }
  // combine the graphs and add them to the larger stateGraph of the whole expression
  let combined = combineGraphs.combineGraphs(combineGraphs.AND, partialStateGraphs, artificialCategories, populateArgs.andTolerance);

  if (JSON.stringify(combined.graph) === JSON.stringify({})) {
    return;
  }

  let combinedRoot = combineGraphs.findRoot(combined.graph);
  let combinedAccepts = combineGraphs.findAccepts(combined.graph);

  // remove root and accept labels since this is an intermediate graph
  removeLabelsFromAndGraph(combined.graph, combinedRoot, combinedAccepts);
  // add the combined graph information into stateGraph and boundaryStack
  Object.assign(stateGraph, combined.graph);
  addToBoundaryStack(combinedRoot, combinedAccepts, boundaryStack);

  // put the combined categories back into the original categories
  Object.assign(populateArgs.categories, combined.categories);
}

/**
 * Handles and operator
 * @param stateGraph Current graph
 * @param boundaryStack Boundary stack
 * @param representation String: Which kind of graph to build
 * @param populateArgs Object: arguments to populateGraph (from graphGOLDBAR)
 */
function handleMerge(stateGraph, boundaryStack, representation, populateArgs) {
  let partialStateGraphs = {};
  let partialBoundaryStacks = [];
  let artificialCategories = {}; // repeat the categories for every partial graph (to work with existing combineGraphs)
  // find partial stateGraphs for each half of the And
  for (let i = 0; i < populateArgs.parsed.length; i++) {
    let partialGraph = {};
    let partialBoundary = [];
    graphGOLDBAR.populateGraph(populateArgs.parsed[i], partialGraph, partialBoundary, representation, populateArgs.categories, populateArgs.maxCycles, populateArgs.andTolerance, populateArgs.mergeTolerance);
    partialStateGraphs[i] = partialGraph;
    partialBoundaryStacks.push(partialBoundary);
    artificialCategories[i] = populateArgs.categories;
  }
  // add accept and root nodes to the partial graphs (to work with existing combineGraphs)
  for (let i = 0; i < Object.keys(partialStateGraphs).length; i++) {
    let partial = partialStateGraphs[i];
    addAcceptNodes(partial, partialBoundaryStacks[i]);
    generateRootNode(partial, partialBoundaryStacks[i]);
    collapseEpsilons(partial);
  }
  // combine the graphs and add them to the larger stateGraph of the whole expression
  let combined = combineGraphs.combineGraphs(combineGraphs.MERGE, partialStateGraphs, artificialCategories, populateArgs.mergeTolerance);
  let combinedRoot = combineGraphs.findRoot(combined.graph);
  let combinedAccepts = combineGraphs.findAccepts(combined.graph);

  if (JSON.stringify(combined.graph) === JSON.stringify({})) {
    let epsID = createEpsilonNode(stateGraph);
    addToBoundaryStack(epsID, [], boundaryStack);
    return;
  }

  // remove root and accept labels since this is an intermediate graph
  removeLabelsFromAndGraph(combined.graph, combinedRoot, combinedAccepts);
  // add the combined graph information into stateGraph and boundaryStack
  Object.assign(stateGraph, combined.graph);
  addToBoundaryStack(combinedRoot, combinedAccepts, boundaryStack);

  // put the combined categories back into the original categories
  Object.assign(populateArgs.categories, combined.categories);
}

/**
 * Removes the 'root' and 'accept' labels from root and accept nodes in AND-ed graphs
 * @param graph
 * @param rootID
 * @param acceptIDs
 */
function removeLabelsFromAndGraph(graph, rootID, acceptIDs) {
  let rootNode = graph[rootID];
  rootNode.text = handleOp.EPSILON;
  rootNode.type = handleOp.EPSILON;

  for (let acceptID of acceptIDs) {
    let acceptNode = graph[acceptID];
    acceptNode.text = handleOp.EPSILON;
    acceptNode.type = handleOp.EPSILON;
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

  // if the head of 'a' is an OR, it will have multiple leaves, so you need an epsilon edge to connect 'a' and 'b'
  if (stateGraph[a.head].operator.includes(handleOp.OR)) {
    let lenA = a.leaves.length;
    for (let i = 0; i < lenA; i++) {
      const leaf = a.leaves.pop();
      stateGraph[leaf].edges.push({'src': leaf, 'dest': b.head, 'component': handleOp.EPSILON, 'type': handleOp.EPSILON, 'text': handleOp.EPSILON});
    }
    stateGraph[b.head].operator.push(handleOp.THEN);
  } else {
    // if head of 'a' is not an OR, then there will only be one leaf
    const leaf = a.leaves[0];
    for (let edge of stateGraph[b.head].edges) {
      edge.src = leaf;
      stateGraph[leaf].edges.push(edge);
    }
    stateGraph[leaf].operator.push(handleOp.THEN);
    stateGraph[leaf].operator = stateGraph[leaf].operator.concat(stateGraph[b.head].operator);
    removeNodeFromEdges(stateGraph, leaf, b.head);
    delete stateGraph[b.head];
  }

  // get all children of 'b' to add back to boundary stack
  const children = [];
  let lenB = b.leaves.length;
  for (let i = 0; i < lenB; i++) {
    children.push(b.leaves.pop());
  }
  addToBoundaryStack(a.head, children, boundaryStack);
}


/**
 * Removes all edges pointing to a deleted node
 * @param graph
 * @param newDest
 * @param deleted
 */
function removeNodeFromEdges(graph, newDest, deleted) {
  for (let id in graph) {
    let node = graph[id];
    for (let edge of node.edges) {
      if (edge.dest === deleted) {
        edge.dest = newDest;
      }
    }
  }
}

/**
 * Handles zero-or-more operator
 * Generates the following graph: parent -> a.head -> ... -> leaves -> parent
 * @param stateGraph Current graph
 * @param boundaryStack Boundary stack
 */

function handleZeroOrMore(stateGraph, boundaryStack) {
  const a = boundaryStack.pop();
  const tail = createEpsilonNode(stateGraph);

  stateGraph[a.head].edges.push({'src': a.head,
    'dest': tail,
    'component': handleOp.EPSILON,
    'type': handleOp.EPSILON,
    'text': handleOp.EPSILON});

  for (let leaf of a.leaves) {
    stateGraph[leaf].edges.push({'src': leaf,
      'dest': a.head,
      'component': handleOp.EPSILON,
      'type': handleOp.ZERO_MORE,
      'text': handleOp.OR_MORE });
  }

  stateGraph[a.head].operator.push(handleOp.ZERO_MORE);
  addToBoundaryStack(a.head, [tail], boundaryStack);
}

/**
 * Handles zero-or-one operator
 * @param stateGraph Current graph
 * @param boundaryStack Boundary stack
 */

function handleZeroOrOne(stateGraph, boundaryStack) {

  const a = boundaryStack.pop();

  for (let leaf of a.leaves) {
    stateGraph[a.head].edges.push({'src': a.head,
      'dest': leaf,
      'component': handleOp.EPSILON,
      'type': handleOp.ZERO_ONE,
      'text': 'ZERO'
    });
  }

  stateGraph[a.head].operator.push(handleOp.ZERO_ONE);
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
    stateGraph[leaf].edges.push({'src': leaf,
      'dest': a.head,
      'component': handleOp.EPSILON,
      'type': handleOp.ONE_MORE,
      'text': handleOp.OR_MORE
    });
  }

  stateGraph[a.head].operator.push(handleOp.ONE_MORE);
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
    stateGraph[leaf].edges.push({'src': leaf,
      'dest': a.head,
      'component': handleOp.EPSILON,
      'type': handleOp.ONE_MORE,
      'text': handleOp.OR_MORE
    });
  }

  stateGraph[a.head].operator.push(handleOp.ZERO_SBOL);
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
  stateGraph[epsilon0].edges.push({'src': epsilon0,
    'dest': epsilon1,
    'component': categories[atom[0]],
    'type': handleOp.ATOM,
    'text': atom[0]
  });
  addToBoundaryStack(epsilon0, [epsilon1], boundaryStack);
}


/* * * * * * * * * * * */
/*   GRAPH TRAVERSAL   */
/* * * * * * * * * * * */
/**
 * Generates all paths through the graph
 * @param root The root node
 * @param stateGraph Current graph
 * @param maxCycles number of times to repeat through an orMore
 * @returns {object} Array of paths through graph
 */
function enumeratePaths(root, stateGraph, maxCycles) {
  let visitedE = {};
  let visitedN = {};
  let allPaths = [];

  // collapse a copy and save the original for SBOL generation
  let collapsed = JSON.parse(JSON.stringify(stateGraph));
  collapseEpsilons(collapsed);
  root = combineGraphs.findRoot(collapsed);

  let dummyEdge = {'src': 'dummy',
    'dest': root,
    'component': handleOp.EPSILON,
    'type': handleOp.EPSILON,
    'text': handleOp.EPSILON
  };
  visitEdges(root, dummyEdge, visitedE, visitedN, stateGraph, [], allPaths, maxCycles);
  allPaths = removeDuplicatePaths(allPaths);

  for (let path of allPaths) {
    printPath(path);
  }

  return {graph: stateGraph, paths: allPaths, collapsed: collapsed};
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

  if (node.operator.includes(handleOp.ONE_MORE)) {
    if (visitedN[nodeId] > maxCycles) {
      return;
    }
  }

  // Don't let atoms exceed max cycle depth
  if (visitedE[edgeId] > maxCycles) {
    return;
  }

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

  if (node.type === handleOp.ACCEPT) {
    processPath(node, currentPath, allPaths);
  }

  // if you got to this node from a zero-or-more node, decrease the number of times you've visited this node
  if ((stateGraph[edgeUsed.src] !== undefined) &&(stateGraph[edgeUsed.src].operator.includes(handleOp.ZERO_MORE))) {
    visitedN[nodeId]--;
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
    if (edge.component === handleOp.EPSILON || node.type === handleOp.ROOT) {
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
// remove all epsilons that have no operators
// unless its parent is also its child
function collapseEpsilons(stateGraph){
  let pMap = getParents(stateGraph);

  for (let node in stateGraph) {
    // take action only if node is an epsilon and has no operators
    if (stateGraph[node].type === handleOp.EPSILON && !stateGraph[node].operator.length){
      collapseNode(stateGraph, pMap, node);
    }
  }
  removeDuplicatesEdges(stateGraph);
}

function collapseNode(stateGraph, pMap, node){
  // ensure only one child is ever transferred
  if(stateGraph[node].edges.length > 1){
    return;
  }

  const parentIds = Array.from(pMap[node]);
  const childId = stateGraph[node].edges[0].dest;

  for (let i = 0; i < parentIds.length; i++) {
    let pid = parentIds[i];

    //don't collapse a zero-or-one loop
    if (childId === pid){
      return;
    }

    // find and move the edge that has the atom
    if (stateGraph[node].edges[0].type === handleOp.ATOM){
      //transfer child edge to the parent
      let newEdge = stateGraph[node].edges[0];
      newEdge.src = pid;
      stateGraph[pid].edges.push(newEdge);
      stateGraph[pid].edges = stateGraph[pid].edges.filter(e => e.dest !== node); //delete the old edge
    } else {
      //else we'll just redirect the parent edge
      let atomEdges = stateGraph[pid].edges.filter(e => e.dest === node);
      atomEdges.forEach((e) => {
        e.dest = childId;
      }); // this still references the original object
    }

    //update parent map
    pMap[childId].add(pid);
    pMap[childId].delete(node);
  }

  // Remove epsilon from state graph
  delete stateGraph[node];
}

/**
 * Removes duplicate edges from nodes (no longer looks at edge label to determine duplicate)
 * @param graph
 */
function removeDuplicatesEdges(graph) {
  for (let id in graph) {
    removeDuplicatesFromNode(graph[id]);
  }
}

function removeDuplicatesFromNode(node) {
  for (let i = 0; i < node.edges.length; i++) {
    for (let j = i+1; j < node.edges.length; j++) {
      let edgeOneInfo = [node.edges[i].src, node.edges[i].dest, node.edges[i].component];
      let edgeTwoInfo = [node.edges[j].src, node.edges[j].dest, node.edges[j].component];
      if (JSON.stringify(edgeOneInfo) === JSON.stringify(edgeTwoInfo)) {
        node.edges.splice(j, 1);
      }
    }
  }
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
  enumeratePaths,
  generateRootNode,
  addAcceptNodes,
  createEpsilonNode,
  handleAtom,
  handleAnd,
  handleMerge,
  handleOr,
  handleOrSBOL,
  handleThen,
  handleZeroOrMore,
  handleZeroOrOne,
  handleOneOrMore,
  handleZeroOrMoreSbol
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

function pathString(path) {
  let pathStr = 'Path: ';
  for (let i = 0; i < path.length; i++) {
    pathStr += ' ' + path[i].text;
  }
  return pathStr;
}


function removeDuplicatePaths(allPaths) {
  let pathStrs = [];
  for (let path of allPaths) {
    pathStrs.push(pathString(path));
  }
  let unique = [];
  for (let i = 0; i < pathStrs.length; i++) {
    let add = true;
    for (let j = i+1; j < pathStrs.length; j++) {
      if (pathStrs[i] === pathStrs[j]) {
        add = false;
      }
    }
    if (add) {
      unique.push(allPaths[i])
    }
  }
  return unique;
}

