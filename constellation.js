var imparse = require('./libs/imparse');
var uuidv4 = require('./libs/uuidv4');

// Global Constants
const GRAMMER_DEF = [{"Seq":[{"Then":[["Exp"],".",["Seq"]]},{"":[["Exp"]]}]},{"Exp":[{"Or":[["Term"],"or",["Exp"]]},{"And":[["Term"],"and",["Exp"]]},{"":[["Term"]]}]},{"Term":[{"OneOrMore":["one-or-more",["Term"]]},{"ZeroOrMore":["zero-or-more",["Term"]]},{"":["{",["Seq"],"}"]},{"Atom":[{"RegExp":"([A-Za-z0-9]|-|_)+"}]}]}];

const EPSILON = "o";
const ATOM = "atom";
const ACCEPT = "accept";
const ROOT = "root";  

/* * * * * * * * * * */
/*   NODE HANDLING   */
/* * * * * * * * * * */

// Root of the graph should always be the root of the only remaining element in the boundary stack
function getRootNode(stateGraph, boundaryStack) {
  return boundaryStack[0].root;
}


// Adding accept nodes to every leaf remaining on boundary stack
function addAcceptNodes(stateGraph, boundaryStack) {
  var len = boundaryStack[0].leaves.length;

  for (var i = 0; i < len; i++) {
    var atom = boundaryStack[0].leaves.pop();
    var acceptId = uuidv4();
    
    stateGraph[acceptId] = {text: ACCEPT, dataType: ACCEPT, edges:[]};
    stateGraph[atom].edges.push(acceptId);    
  }
}

// New element on boundary stack
function addToBoundaryStack(root, children, boundaryStack) {
  var obj = {root: root, leaves: children};
  boundaryStack.push(obj);
}

/* * * * * * * * * * * */
/*   GRAPH TRAVERSAL   */
/* * * * * * * * * * * */

function enumeratePaths(root, stateGraph) {
  visited = {};

  var rootEdges = stateGraph[root].edges;

  for (var i = 0; i < rootEdges.length; i++) {
    visited[rootEdges[i]] = false;
  }
  var allPaths = [];
  visitNodes(root, visited, stateGraph, [], allPaths);
  return allPaths;
}

function populateGraph(parsed, stateGraph, boundaryStack) {

  if (parsed.Atom) {
    handleAtom(parsed.Atom, stateGraph, boundaryStack);
    return;
  }

  if (Array.isArray(parsed)) {
    for (var i = 0; i < parsed.length; i++) {
      populateGraph(parsed[i], stateGraph, boundaryStack);
    }
    return;
  }

  if (Object.keys(parsed).length > 0) {
    for (k in parsed) {
      var operation = k;
      populateGraph(parsed[k], stateGraph, boundaryStack)
      handleOp(operation, boundaryStack, stateGraph);
    }
  }
}


function printPath(path) {
  var pathStr = "Path: ";
  for (var i = 0; i < path.length; i++) {
    if (path[i].data.dataType !== EPSILON) {
      pathStr += " " + path[i].data.text;      
    }
  }
}

function processPath(path, allPaths) {

  var processedPath = [];
  for (var i = 0; i < path.length; i++) {
    if (path[i].data.dataType !== EPSILON) {
      // Deep copy of object
      processedPath.push(JSON.parse(JSON.stringify(path[i])));
    }
  }
  allPaths.push(processedPath);
}

function checkCycle(nodeId, currentPath) {
  for (var i = 0; i < currentPath.length; i++) {
    if (nodeId === currentPath[i].id) {
      return true;
    }
  }
  return false;
}

// returns all edges that are not yet in path
function getUnprocessedEdges(edges, path) {
  var unprocessed = [];
  for (var i = 0; i < edges.length; i++) {
    var inList = false;
    for (var j = 0; j < path.length; j++) {
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

function processChildren(children, visited, stateGraph, currentPath, allPaths) {
  for (var i = 0; i < children.length; i++) {
    var childId = children[i];

    if (stateGraph[childId].dataType === ACCEPT) {
      // printPath(currentPath);
      processPath(currentPath, allPaths);
    } else {
      if (!visited[childId]) {
        visitNodes(childId, visited, stateGraph, currentPath, allPaths);
      } else {
        if (checkCycle(childId, currentPath)) {
          // process other edges 
          childEdges = stateGraph[childId].edges;
          var unprocessed = getUnprocessedEdges(childEdges, currentPath);
          // TODO: do they need to be processed or can I just call visitNodes?
          processChildren(unprocessed, visited, stateGraph, currentPath, allPaths)
        }
      }  
    }
  }
}

function visitNodes(nodeId, visited, stateGraph, currentPath, allPaths) {
  visited[nodeId] = true;

  var node = stateGraph[nodeId];
  currentPath.push({id: nodeId, data: node});

  processChildren(node.edges, visited, stateGraph, currentPath, allPaths);

  currentPath.pop();
  visited[nodeId] = false;
}


/* * * * * * * * */
/*   OPERATORS   */
/* * * * * * * * */

function handleOp(op, boundaryStack, stateGraph) {
  // Parent must always be added to the graph
  var parentId = uuidv4();
  stateGraph[parentId] = {text: EPSILON, dataType: EPSILON, edges:[]};

  if (op === "Or") {
    handleOr(boundaryStack, stateGraph, parentId);
  }

  if (op === "And") {
    handleAnd(boundaryStack, stateGraph, parentId);
  }

  if (op === "Then") {
    handleThen(boundaryStack, stateGraph, parentId);
  }

  if (op === "ZeroOrMore") {
    handleZeroOrMore(boundaryStack, stateGraph, parentId);
  }

  if (op === "OneOrMore") {
    handleOneOrMore(boundaryStack, stateGraph, parentId);
  }
}

function handleOr(boundaryStack, stateGraph, parentId) {
  var a = boundaryStack.pop();
  var b = boundaryStack.pop();

  stateGraph[parentId].edges.push(a.root);
  stateGraph[parentId].edges.push(b.root);

  var children = [];
  var len = a.leaves.length;
  for (var i = 0; i < len; i++) {
    children.push(a.leaves.pop());
  }

  var len = b.leaves.length;
  for (var i = 0; i < len; i++) {
    children.push(b.leaves.pop());
  } 

  addToBoundaryStack(parentId, children, boundaryStack);
}


function handleAnd(boundaryStack, stateGraph, parentId) {
  console.log('AND not yet supported')
}


function handleThen(boundaryStack, stateGraph, parentId) {
  var b = boundaryStack.pop();
  var a = boundaryStack.pop();

  var len = a.leaves.length;
  var children = [];

  for (var i = 0; i < len; i++) {
    var leaf = a.leaves.pop();
    stateGraph[leaf].edges.push(parentId);
  }
  var len = b.leaves.length;
  for (var i = 0; i < len; i++) {
    children.push(b.leaves.pop());
  }
  
  stateGraph[parentId].edges.push(b.root);
  addToBoundaryStack(a.root, children, boundaryStack);
}

// Zero or more
function handleZeroOrMore(boundaryStack, stateGraph, parentId) {
  var a = boundaryStack.pop();
  
  var acceptId = uuidv4();
  stateGraph[acceptId] = {text: ACCEPT, dataType: ACCEPT, edges:[]};

  stateGraph[parentId].edges.push(acceptId);    
  stateGraph[parentId].edges.push(a.root);  

  var children = [];
  var len = a.leaves.length;

  for (var i = 0; i < len; i++) {
    var leaf = a.leaves.pop();
    children.push(leaf);
    stateGraph[leaf].edges.push(parentId);
  }

  addToBoundaryStack(parentId, [parentId], boundaryStack);
}

// parent --> a.root -> leaves --> accept --> parent
function handleOneOrMore(boundaryStack, stateGraph, parentId) {
  var a = boundaryStack.pop();

  var acceptId = uuidv4();
  stateGraph[acceptId] = {text: ACCEPT, dataType: ACCEPT, edges:[]};

  stateGraph[parentId].edges.push(a.root);
 
  var len = a.leaves.length;
  for (var i = 0; i < len; i++) {
    var leaf = a.leaves.pop();
    stateGraph[leaf].edges.push(acceptId);
  }
  stateGraph[acceptId].edges.push(parentId);
  addToBoundaryStack(parentId, [acceptId], boundaryStack);
}


function handleAtom(atom, stateGraph, boundaryStack) {
  var epsilonId = uuidv4();

  var atomId = uuidv4();

  stateGraph[epsilonId] = {text: EPSILON, dataType: EPSILON, edges: [atomId]};
  stateGraph[atomId] = {text: atom, dataType: ATOM, edges: []};


  addToBoundaryStack(epsilonId, [atomId], boundaryStack);
}

/* * * * * * * * * * * * */
/*   PARTS ENUMERATION   */
/* * * * * * * * * * * * */
function shuffleList(list) {
  var currIndex = list.length;
  
  while (0 !== currIndex) {

    var randIndex = Math.floor(Math.random() * currIndex);
    currIndex--;

    // And swap it with the current element.
    var temp = list[currIndex];
    list[currIndex] = list[randIndex];
    list[randIndex] = temp;
  }
  return list;
}



function cartesianProduct(setA, setB) {
  var newSet = [];
  for (var i = 0; i < setA.length; i++) {
    for (var j = 0; j < setB.length; j++) {
      var combo = setA[i].concat(setB[j]);
      newSet.push(combo);
    }
  }
  return newSet;
}

function getSelectNumDesigns(designs, numDesigns) {
  var shuffledList = shuffleList(designs);
  var selectedDesigns = [];

  var len = designs.length;

  while (len > 0 && numDesigns > 0) {
    selectedDesigns.push(shuffledList.pop());    
    len--;
    numDesigns--;
  }

  return selectedDesigns;
}

// TODO: check that ID exists as a key in collection
function combineParts(paths, collection, numDesigns) {
  if (!collection) {
    return null;
  }

  var designs = [];

  for (var i = 0; i < paths.length; i++) {
    var currPath = paths[i];

    if (currPath.length === 1) {
      var id = currPath[0].data.text;
      designs.push(collection[id]);
      continue;
    }

    var count = currPath.length-1;
    var index = 1;
    var currSet = collection[currPath[0].data.text];
    while (count > 0) {
      var collB = collection[currPath[index].data.text];
      currSet = cartesianProduct(currSet, collB);
      index++;
      count--;
    }

    designs.push(currSet);

  }

  var selectedDesigns = getSelectNumDesigns(designs[0], numDesigns);
  return selectedDesigns;
}

/* * * * * * */
/*    MAIN   */
/* * * * * * */
module.exports = function(langText, categories, numDesigns) {
  var stateGraph = {};
  var boundaryStack = [];

  var parsed = '';
  try {
    parsed = imparse.parse(GRAMMER_DEF, langText);

  } catch(err) {
    console.error("Parsing error!");
    return;
  }

  populateGraph(parsed, stateGraph, boundaryStack);
  addAcceptNodes(stateGraph, boundaryStack);

  var root = getRootNode(stateGraph, boundaryStack);
  stateGraph[root].text = ROOT;
  var paths = enumeratePaths(root, stateGraph);
  var designs = combineParts(paths, categories, numDesigns);

  return {stateGraph: stateGraph, designs: designs};
};

