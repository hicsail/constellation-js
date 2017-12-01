// Global Constants
const GRAMMER_DEF = [{"Seq":[{"Then":[["Exp"],"then",["Seq"]]},{"":[["Exp"]]}]},{"Exp":[{"Or":[["Term"],"or",["Exp"]]},{"And":[["Term"],"and",["Exp"]]},{"":[["Term"]]}]},{"Term":[{"OneOrMore":["one-or-more",["Term"]]},{"ZeroOrMore":["zero-or-more",["Term"]]},{"":["(",["Seq"],")"]},{"Atom":[{"RegExp":"([A-Za-z0-9]|-|_)+"}]}]}]

const EPSILON = "o";
const ATOM = "atom";
const ACCEPT = "accept";
  
const testCollection = {"a": ["a1", "a2", "a3", "a4"], "b": ["b1", "b2", "b3", "b4"], "c": ["c1", "c2", "c3", "c4"], "d": ["d1", "d2", "d3", "d4"]};


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
  // console.log("allpaths", allPaths)
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

  console.log(pathStr);
}

function processPath(path, allPaths) {

  var processedPath = [];
  for (var i = 0; i < path.length; i++) {
    if (path[i].data.dataType !== EPSILON) {
      var obj = JSON.parse(JSON.stringify(path[i]));
      console.log('obj', obj)
      processedPath.push[obj];
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
      console.log('currentpath', allPaths);
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
function combineParts(paths, collection, numDesigns) {
  if (collection.length <= 0) {
    collection = testCollection;
  }
  var designs = [];

  for (var i = 0; i < paths.length; i++) {
    var curr_path = paths[i];
    // console.log(curr_path);
    for (atom in curr_path) {
      // console.log(collection[atom]);
    }
  }
}

/* * * * * * */
/*    MAIN   */
/* * * * * * */
function ibis(langText, numDesigns) {

  var stateGraph = {};
  var boundaryStack = [];

  var parsed = '';
  try {
    parsed = imparse.parse(GRAMMER_DEF, langText);
  } catch(err) {
    alert("Parsing error!");
    return;
  }

  populateGraph(parsed, stateGraph, boundaryStack);
  addAcceptNodes(stateGraph, boundaryStack);

  var root = getRootNode(stateGraph, boundaryStack);
  var paths = enumeratePaths(root, stateGraph);
  var designs = combineParts(paths, [], numDesigns);

  return {stateGraph: stateGraph, designs: designs};
  }