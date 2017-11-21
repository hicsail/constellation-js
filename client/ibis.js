
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


function ibis(parsed) {

  var myDiagram = initializeStateGraph();

  var stateGraph = {"nodes": [], "edges": []}  
  var boundaryStack = [];

  populateGraph(parsed, stateGraph, boundaryStack);
  addAcceptNodes(stateGraph, boundaryStack);
  var rootNode = getRootNode(stateGraph, boundaryStack);
  if (rootNode.text !== ACCEPT) {
    rootNode.text = "root"; 
  } else {
    rootNode.text = rootNode.text + " root";
  }
  myDiagram.model = new go.GraphLinksModel(stateGraph.nodes, stateGraph.edges);
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
  // add epsilon
  var epsilonId = uuidv4();
  var epsilonNode = {key: epsilonId, text: EPSILON, dataType: EPSILON};
  
  var atomId = uuidv4();
  var atomNode = {key: atomId, text: atom, dataType: ATOM};

  stateGraph.nodes.push(epsilonNode);
  stateGraph.nodes.push(atomNode);

  stateGraph.edges.push({from: epsilonId, to: atomId});

  addRoot(epsilonNode, [atomNode], boundaryStack);
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

function handleOr(boundaryStack, stateGraph, parentNode) {
  var a = boundaryStack.pop();
  var b = boundaryStack.pop();

  stateGraph.edges.push({from: parentNode.key, to: a.root.key});
  stateGraph.edges.push({from: parentNode.key, to: b.root.key});

  var children = [];
  var len = a.leaves.length;
  for (var i = 0; i < len; i++) {
    children.push(a.leaves.pop());
  }

  var len = b.leaves.length;
  for (var i = 0; i < len; i++) {
    children.push(b.leaves.pop());
  } 

  addRoot(parentNode, children, boundaryStack);
}

function handleThen(boundaryStack, stateGraph, parentNode) {
  var b = boundaryStack.pop();
  var a = boundaryStack.pop();

  var len = a.leaves.length;
  var children = [];

  for (var i = 0; i < len; i++) {
    var leaf = a.leaves.pop();
    stateGraph.edges.push({from: leaf.key, to: parentNode.key});
  }
  var len = b.leaves.length;
  for (var i = 0; i < len; i++) {
    children.push(b.leaves.pop());
  }

  stateGraph.edges.push({from: parentNode.key, to: b.root.key});
  addRoot(a.root, children, boundaryStack);
}

// Zero or more
function handleZeroOrMore(boundaryStack, stateGraph, parentNode) {
  var a = boundaryStack.pop();

  parentNode.text = ACCEPT;
  parentNode.dataType = ACCEPT;

  stateGraph.edges.push({from: parentNode.key, to: a.root.key});

  var children = [];
  var len = a.leaves.length;

  for (var i = 0; i < len; i++) {
    var leaf = a.leaves.pop();
    children.push(leaf);
    stateGraph.edges.push({from: leaf.key, to: parentNode.key});
  }

  addRoot(parentNode, [parentNode], boundaryStack);
}

// parent --> a.root -> leaves --> accept --> parent
function handleOneOrMore(boundaryStack, stateGraph, parentNode) {
  var a = boundaryStack.pop();

  stateGraph.edges.push({from: parentNode.key, to: a.root.key});

  var acceptKey = uuidv4();
  var acceptNode = {key: acceptKey, text: EPSILON, dataType: EPSILON};
  stateGraph.nodes.push(acceptNode);

  var len = a.leaves.length;
  for (var i = 0; i < len; i++) {
    var leaf = a.leaves.pop();
    stateGraph.edges.push({from: leaf.key, to: acceptNode.key});
  }
  stateGraph.edges.push({from: acceptNode.key, to: parentNode.key});

  addRoot(parentNode, [acceptNode], boundaryStack);
  

}


// function productMachine(r1, r2) {
//   var s1 = buildSubgraph(r1);

// }

function buildSubgraph(root) {
  var subNodes = [];

  console.log(go);
  
  while(it.next()) {
    var child = it.value;
    console.log("CHILD", child);
  }


  // find edge corresponding to root, then go to next node

  
}

function handleAnd(boundaryStack, stateGraph, parentNode) {
  var a = boundaryStack.pop();
  var b = boundaryStack.pop();

  buildSubgraph(a)



}

// Process operation
function handleOp(op, boundaryStack, stateGraph) {

  var parentId = uuidv4();
  var parentNode = {key: parentId, text: EPSILON, dataType: EPSILON};
  stateGraph.nodes.push(parentNode);

  if (op === "Or") {
    handleOr(boundaryStack, stateGraph, parentNode);
  }

  if (op === "And") {
    handleAnd(boundaryStack, stateGraph, parentNode);
  }

  if (op === "Then") {
    handleThen(boundaryStack, stateGraph, parentNode);
  }

  if (op === "ZeroOrMore") {
    handleZeroOrMore(boundaryStack, stateGraph, parentNode);
  }

  if (op === "OneOrMore") {
    handleOneOrMore(boundaryStack, stateGraph, parentNode);
  }
}