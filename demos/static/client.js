function displayDesigns(editors, designs) {
  editors.designsEditor.setValue(designs);
}

function addStyling(myDiagram, make) {

  var lineColor = 'rgb(200,200,200)';
  var rootColor = 'rgb(209,58,130)';
  var acceptColor = 'rgb(133,152,28)';

  var atomTemplate =
    make(go.Node,
      make(go.TextBlock,
      "Default Text", 
      {margin: 12, stroke: "white", font: "14px monospace"},

        new go.Binding("text", "text"))
    );

    var epsilonTemplate = 
      make(go.Node, "Auto",
        make(go.Shape, "Circle",
        {fill: 'white', strokeWidth: 1 ,stroke: "white", width: 10, height: 10},
          new go.Binding("fill", "color"))
        );

    var acceptTemplate = 
      make(go.Node, "Auto",
        make(go.Shape, "Circle",
        {fill: acceptColor, strokeWidth: 1 ,stroke: "white", width: 20, height: 20},
          new go.Binding("fill", "color"))
    );

    var rootTemplate = 
      make(go.Node, "Auto",
        make(go.Shape, "Circle",
        {fill: rootColor, strokeWidth: 1 ,stroke: "white", width: 20, height: 20},
          new go.Binding("fill", "color"))
    );

    var templateMap = new go.Map("string", go.Node);
    templateMap.add(graph.EPSILON, epsilonTemplate);
    templateMap.add(graph.ATOM, atomTemplate);
    templateMap.add(graph.ACCEPT, acceptTemplate);
    templateMap.add(graph.ROOT, rootTemplate);

    myDiagram.nodeTemplateMap = templateMap;
}

// Returns an empty Go Diagram object
function initializeStateGraph() {
  var make = go.GraphObject.make;
  myDiagram = make(go.Diagram, 'stateGraph', {
    initialContentAlignment: go.Spot.Center
  });

  addStyling(myDiagram, make);

  return myDiagram;
}


// Translates adjacency list to Go graph representation
function displayDiagram(stateGraph) {

  var nodes = [];
  var edges = [];

  for (id in stateGraph) {
    
    var text = stateGraph[id].text;
    var category = stateGraph[id].dataType;

    nodes.push({key: id, text: text, category: category});
    
    var nodeEdges = stateGraph[id].edges;
    for (var i = 0; i < nodeEdges.length; i++) {
      edges.push({from: id, to: nodeEdges[i]});
    }
  }

  myDiagram.model = new go.GraphLinksModel(nodes, edges);
}
