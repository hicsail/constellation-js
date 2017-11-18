
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
    
  function getRootNode(stateGraph, subGraph) {
    var root = subGraph[0].root;
    var nodes = stateGraph.nodes;
  
    for (var i = 0; i < nodes.length; i++) {
      if (root.key == nodes[i].key) {
        return nodes[i];
      }
    }
  }
  
  function addRoot(root, children, subGraph) {
    var obj = {root: root, leaves: children};
    subGraph.push(obj);
  }

  function addLeaf(leaf, subGraph) {
    var index = subGraph.length-1; 
    subGraph[index].leaves.push(leaf);
  }


  function ibis(parsed) {
  
    var myDiagram = initializeStateGraph();
  
    var stateGraph = {"nodes": [], "edges": []}  
    var subGraph = [];
  
    populateGraph(parsed, stateGraph, subGraph);
    addAcceptNodes(stateGraph, subGraph);
    var rootNode = getRootNode(stateGraph, subGraph);
    if (rootNode.text !== ACCEPT) {
      rootNode.text = "root"; 
    } else {
      rootNode.text = rootNode.text + " root";
    }
    myDiagram.model = new go.GraphLinksModel(stateGraph.nodes, stateGraph.edges);
  }
  
  function addAcceptNodes(stateGraph, subGraph) {
    var len = subGraph[0].leaves.length;

    for (var i = 0; i < len; i++) {
      var n = subGraph[0].leaves.pop();
      var id = uuidv4();
      stateGraph.nodes.push({key: id, text: ACCEPT});
      stateGraph.edges.push({from: n.key, to: id});
    }
  }


  function handleAtom(atom, stateGraph, subGraph) {
    // add epsilon
    var epsilonId = uuidv4();
    var epsilonNode = {key: epsilonId, text: EPSILON, dataType: EPSILON};
    
    var atomId = uuidv4();
    var atomNode = {key: atomId, text: atom, dataType: ATOM};

    stateGraph.nodes.push(epsilonNode);
    stateGraph.nodes.push(atomNode);

    stateGraph.edges.push({from: epsilonId, to: atomId});

    addRoot(epsilonNode, [atomNode], subGraph);
  }
  
  function populateGraph(parsed, stateGraph, subGraph) {
  
    if (parsed.Atom) {
      handleAtom(parsed.Atom, stateGraph, subGraph);
      return;
    }
  
    if (Array.isArray(parsed)) {
      for (var i = 0; i < parsed.length; i++) {
        populateGraph(parsed[i], stateGraph, subGraph);
      }
      return;
    }
  
    if (Object.keys(parsed).length > 0) {
      for (k in parsed) {
        var operation = k;
        populateGraph(parsed[k], stateGraph, subGraph)
        handleOp(operation, subGraph, stateGraph);
      }
    }
  }

  function getRoot(subGraph) {
    subGraph.pop();
  }

  function handleOr(subGraph, stateGraph, parentNode) {
    var a = subGraph.pop();
    var b = subGraph.pop();

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

    addRoot(parentNode, children, subGraph);
  }
  
  function handleThen(subGraph, stateGraph, parentNode) {
    var b = subGraph.pop();
    var a = subGraph.pop();

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
    addRoot(a.root, children, subGraph);
  }
  
  // Zero or more
  function handleZeroOrMore(subGraph, stateGraph, parentNode) {
    var a = subGraph.pop();

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

    addRoot(parentNode, [parentNode], subGraph);
  }

  // parent --> a.root -> leaves --> accept --> parent
  function handleOneOrMore(subGraph, stateGraph, parentNode) {
    var a = subGraph.pop();

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

    addRoot(parentNode, [acceptNode], subGraph);
    

  }
  
  // Process operation
  function handleOp(op, subGraph, stateGraph) {

    var parentId = uuidv4();
    var parentNode = {key: parentId, text: EPSILON, dataType: EPSILON};
    stateGraph.nodes.push(parentNode);
  
    if (op === "Or") {
      handleOr(subGraph, stateGraph, parentNode)
    }
  
    if (op === "Then") {
      handleThen(subGraph, stateGraph, parentNode);
    }

    if (op === "ZeroOrMore") {
      handleZeroOrMore(subGraph, stateGraph, parentNode);
    }

    if (op === "OneOrMore") {
      handleOneOrMore(subGraph, stateGraph, parentNode);
    }
  }