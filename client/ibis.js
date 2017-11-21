
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
  var root = boundaryStack[0].root;
  var nodes = stateGraph.nodes;

  for (var i = 0; i < nodes.length; i++) {
    if (root.key == nodes[i].key) {
      return nodes[i];
    }
  }
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


  // var stateGraph = {"nodes": [], "edges": []}  
  var stateGraph = {};
  var boundaryStack = [];

  populateGraph(parsed, stateGraph, boundaryStack);
  // addAcceptNodes(stateGraph, boundaryStack);
  // // var rootNode = getRootNode(stateGraph, boundaryStack);
  // if (rootNode.text !== ACCEPT) {
  //   rootNode.text = "root"; 
  // } else {
  //   rootNode.text = rootNode.text + " root";
  // }
  displayDiagram(stateGraph);
}

function addAcceptNodes(stateGraph, boundaryStack) {
  var len = boundaryStack[0].leaves.length;

  for (var i = 0; i < len; i++) {
    var n = boundaryStack[0].leaves.pop();
    var id = uuidv4();
    stateGraph.nodes.push({key: id, text: ACCEPT});
    stateGraph.edges.push({from: n.key, to: id});
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


// function productMachine(r1, r2) {
//   var s1 = buildSubgraph(r1);

// }

// function buildSubgraph(root) {
//   var subNodes = [];

  
//   while(it.next()) {
//     var child = it.value;
//     console.log("CHILD", child);
//   }  
// }

function handleAnd(boundaryStack, stateGraph, parentId) {
  var a = boundaryStack.pop();
  var b = boundaryStack.pop();

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
    // handleAnd(boundaryStack, stateGraph, parentId);
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