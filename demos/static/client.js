function displayDesigns(editors, designs) {
  editors.designsEditor.setValue(designs);
}

function addStyling(myDiagram, make) {

  const rootColor = 'rgb(209,58,130)';
  const acceptColor = 'rgb(133,152,28)';

  const atomTemplate =
    make(go.Node,
      make(go.TextBlock,
        'Default Text',
        {margin: 12, stroke: 'white', font: '14px monospace'},

        new go.Binding('text', 'text'))
    );

  const epsilonTemplate =
    make(go.Node, 'Auto',
      make(go.Shape, 'Circle',
        {fill: 'white', strokeWidth: 1, stroke: 'white', width: 10, height: 10},
        new go.Binding('fill', 'color'))
    );

  const acceptTemplate =
    make(go.Node, 'Auto',
      make(go.Shape, 'Circle',
        {fill: acceptColor, strokeWidth: 1, stroke: 'white', width: 20, height: 20},
        new go.Binding('fill', 'color'))
    );

  const rootTemplate =
    make(go.Node, 'Auto',
      make(go.Shape, 'Circle',
        {fill: rootColor, strokeWidth: 1, stroke: 'white', width: 20, height: 20},
        new go.Binding('fill', 'color'))
    );

  const templateMap = new go.Map('string', go.Node);
  templateMap.add(graph.EPSILON, epsilonTemplate);
  templateMap.add(graph.ATOM, atomTemplate);
  templateMap.add(graph.ACCEPT, acceptTemplate);
  templateMap.add(graph.ROOT, rootTemplate);

  myDiagram.nodeTemplateMap = templateMap;
}

// Returns an empty Go Diagram object
function initializeStateGraph() {
  const make = go.GraphObject.make;
  let myDiagram = make(go.Diagram, 'stateGraph', {
    initialContentAlignment: go.Spot.Center
  });

  addStyling(myDiagram, make);

  return myDiagram;
}


// Translates adjacency list to Go graph representation
function displayDiagram(stateGraph) {

  const nodes = [];
  const edges = [];

  for (let id in stateGraph) {

    const text = stateGraph[id].text;
    const category = stateGraph[id].dataType;

    nodes.push({key: id, text: text, category: category});

    const nodeEdges = stateGraph[id].edges;
    for (let i = 0; i < nodeEdges.length; i++) {
      edges.push({from: id, to: nodeEdges[i]});
    }
  }

  return new go.GraphLinksModel(nodes, edges);
}

function generateD3Diagram() {
  let nodes;
  let links;

}
