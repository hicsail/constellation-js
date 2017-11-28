
const GRAMMER_DEF = [{"Seq":[{"Then":[["Exp"],"then",["Seq"]]},{"":[["Exp"]]}]},{"Exp":[{"Or":[["Term"],"or",["Exp"]]},{"And":[["Term"],"and",["Exp"]]},{"":[["Term"]]}]},{"Term":[{"OneOrMore":["one-or-more",["Term"]]},{"ZeroOrMore":["zero-or-more",["Term"]]},{"":["(",["Seq"],")"]},{"Atom":[{"RegExp":"([A-Za-z0-9]|-|_)+"}]}]}]

const EPSILON = "o";
const ATOM = "atom";
const ACCEPT = "accept";
  
function initializeStateGraph() {
  
  
    var g = go.GraphObject.make;
    myDiagram = g(go.Diagram, 'stateGraph', {
      initialContentAlignment: go.Spot.Center
    });
  
    return myDiagram;
  }
  
function getRootNode(stateGraph, boundaryStack) {
  return boundaryStack[0].root;
}

function addRoot(root, children, boundaryStack) {
  var obj = {root: root, leaves: children};
  boundaryStack.push(obj);
}

function addLeaf(leaf, boundaryStack) {
  var index = boundaryStack.length-1; 
  boundaryStack[index].leaves.push(leaf);
}

function displayDiagram(stateGraph) {
  var myDiagram = initializeStateGraph();

  var nodes = [];
  var edges = [];

  for (id in stateGraph) {
    
    var text = stateGraph[id].text;

    nodes.push({key: id, text: text});
    
    var nodeEdges = stateGraph[id].edges;
    for (var i = 0; i < nodeEdges.length; i++) {
      edges.push({from: id, to: nodeEdges[i]});
    }
  }

  myDiagram.model = new go.GraphLinksModel(nodes, edges);
  
  
}
function ibis(parsed) {

  var stateGraph = {};
  var boundaryStack = [];

  populateGraph(parsed, stateGraph, boundaryStack);
  addAcceptNodes(stateGraph, boundaryStack);
  var root = getRootNode(stateGraph, boundaryStack);
  stateGraph[root].text = "root";
  displayDiagram(stateGraph);
  var paths = traverseFromRoot(root, stateGraph);
  return paths;
}

function traverseFromRoot(root, stateGraph) {
  visited = {};

  var rootEdges = stateGraph[root].edges;

  for (var i = 0; i < rootEdges.length; i++) {
    visited[rootEdges[i]] = false;
  }
  var allPaths = [];
  visitNodes(root, visited, stateGraph, [], allPaths);
  return allPaths;

}


function addAcceptNodes(stateGraph, boundaryStack) {
  var len = boundaryStack[0].leaves.length;

  for (var i = 0; i < len; i++) {
    var atom = boundaryStack[0].leaves.pop();
    var acceptId = uuidv4();
    
    stateGraph[acceptId] = {text: ACCEPT, dataType: ACCEPT, edges:[]};
    stateGraph[atom].edges.push(acceptId);    
  }
}


function handleAtom(atom, stateGraph, boundaryStack) {
  var epsilonId = uuidv4();
  
  var atomId = uuidv4();

  stateGraph[epsilonId] = {text: EPSILON, dataType: EPSILON, edges: [atomId]};
  stateGraph[atomId] = {text: atom, dataType: ATOM, edges: []};


  addRoot(epsilonId, [atomId], boundaryStack);
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

function getRoot(boundaryStack) {
  boundaryStack.pop();
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

  addRoot(parentId, children, boundaryStack);
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
  addRoot(a.root, children, boundaryStack);
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

  addRoot(parentId, [parentId], boundaryStack);
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
  addRoot(parentId, [acceptId], boundaryStack);
}


function printDesign(path) {
  var pathStr = "Path: ";
  for (var i = 0; i < path.length; i++) {
    if (path[i].data.dataType !== EPSILON) {
      pathStr += " " + path[i].data.text;      
    }
  }
  console.log(pathStr);
}

function copyPath(path) {
  var copy = [];

  for (var i = 0; i < path.length; i++) {
    if (path[i].dataType !== EPSILON) {
      copy.push(path[i]);
    }
  }
  return copy;
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
      printDesign(currentPath);
      allPaths.push(currentPath);
    } else {
      if (!visited[childId]) {
        visitNodes(childId, visited, stateGraph, currentPath, allPaths);
      } else {
        if (checkCycle(childId, currentPath)) {
          // process other edges 
          childEdges = stateGraph[childId].edges;
          var unprocessed = getUnprocessedEdges(childEdges, currentPath);
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

function handleAnd(boundaryStack, stateGraph, parentId) {
  var a = boundaryStack.pop();
  var b = boundaryStack.pop();

  makeSubgraph(a.root, stateGraph)
  // getSubgraph(a, b, stateGraph);

  var andGraph = {};


  console.log('AND not yet supported')
}

// Process operation
function handleOp(op, boundaryStack, stateGraph) {

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