const THEME = "solarized light";

var specEditor = CodeMirror.fromTextArea(document.getElementById('langInput'), {
  lineNumbers: true,
});

var catEditor = CodeMirror.fromTextArea(document.getElementById('categories'), {
  lineNumbers: true,
});

specEditor.setOption("theme", THEME);

catEditor.setOption("theme", THEME);
catEditor.setValue('{"promoter": ["BBa_R0040", "BBa_J23100"],\n "rbs": ["BBa_B0032", "BBa_B0034"], \n"cds": ["BBa_E0040", "BBa_E1010"],\n"terminator": ["BBa_B0010"]}');


var myDiagram = null;

// Main function
$(document).ready(function() {
  $("#submitBtn").click(function(){
    if (myDiagram) {
      myDiagram.div = null;
    }
    
    myDiagram = initializeStateGraph();

    var specification = specEditor.getValue();
    var categories = catEditor.getValue();
    // var categories = '{"a":["a1","a2","a3"],"b":["b1","b2","b3"],"c":["c1"],"d":[]}';

    $.post('http://localhost:8082/postSpecs', {
      "specification": specification,
      "categories": categories,
      "number": "2.0",
      "name": "specificationname",
      "clientid": "userid" 
    }, function(data, status) {
      displayDiagram(data.stateGraph);
      displayDesigns(data.designs);
    });
  });
});

/* * * * * * * */
/*   DIAGRAM   */
/* * * * * * * */
const EPSILON = "o";
const ATOM = "atom";
const ACCEPT = "accept";
const ROOT = "root";  

function displayDesigns(designs) {
  console.log(designs);
}


function addStyling(myDiagram, make) {

  var lineColor = 'rgb(200,200,200)';

  var rootColor = 'orange';
  var acceptColor = 'rgb(126, 212, 118)';

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
        {fill: 'orange', strokeWidth: 1 ,stroke: "white", width: 20, height: 20},
          new go.Binding("fill", "color"))
    );


    
    var templateMap = new go.Map("string", go.Node);
    templateMap.add(EPSILON, epsilonTemplate);
    templateMap.add(ATOM, atomTemplate);
    templateMap.add(ACCEPT, acceptTemplate);
    templateMap.add(ROOT, rootTemplate);

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