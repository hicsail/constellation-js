// const EPSILON = "o";
// const ATOM = "atom";
// const ACCEPT = "accept";
// const ROOT = "root";  


// const THEME = "solarized light";

// console.log(document.getElementById('langInput'))

// var specEditor = CodeMirror.fromTextArea(document.getElementById('langInput'), {
//     lineNumbers: true,
// });

// specEditor.setOption("theme", THEME);


// var myDiagram = null;

// $(document).ready(function() {
//     $("#submitBtn").click(function(){
//     if (myDiagram) {
//         myDiagram.div = null;
//     }
    
//     myDiagram = initializeStateGraph();
//     console.log('hello')

//     var specification = specEditor.getValue();

//     var categories = '{"promoter": ["BBa_R0040", "BBa_J23100"], "rbs": ["BBa_B0032", "BBa_B0034"], "cds": ["BBa_E0040", "BBa_E1010"], "terminator": ["BBa_B0010"]}';
//     // var categories = '{"a":["a1","a2","a3"],"b":["b1","b2","b3"],"c":["c1"],"d":[]}';

//     $.post('http://localhost:8082/postSpecs', {
//         "specification": specification,
//         "categories": categories,
//         "number": "2.0",
//         "name": "specificationname",
//         "clientid": "userid" 
//     }, function(data, status) {
//         displayDiagram(data.stateGraph);
//     });
//     });
// });



// function addStyling(myDiagram, make) {

//   var lineColor = 'rgb(200,200,200)';

//   var rootColor = 'orange';
//   var acceptColor = 'rgb(126, 212, 118)';

//   var atomTemplate =
//     make(go.Node,
//       make(go.TextBlock,
//       "Default Text", 
//       {margin: 12, stroke: "white", font: "14px monospace"},

//         new go.Binding("text", "text"))
//     );

//     var epsilonTemplate = 
//       make(go.Node, "Auto",
//         make(go.Shape, "Circle",
//         {fill: 'white', strokeWidth: 1 ,stroke: "white", width: 10, height: 10},
//           new go.Binding("fill", "color"))
//         );

//     var acceptTemplate = 
//       make(go.Node, "Auto",
//         make(go.Shape, "Circle",
//         {fill: acceptColor, strokeWidth: 1 ,stroke: "white", width: 20, height: 20},
//           new go.Binding("fill", "color"))
//     );


//     var rootTemplate = 
//       make(go.Node, "Auto",
//         make(go.Shape, "Circle",
//         {fill: 'orange', strokeWidth: 1 ,stroke: "white", width: 20, height: 20},
//           new go.Binding("fill", "color"))
//     );


    
//     var templateMap = new go.Map("string", go.Node);
//     templateMap.add(EPSILON, epsilonTemplate);
//     templateMap.add(ATOM, atomTemplate);
//     templateMap.add(ACCEPT, acceptTemplate);
//     templateMap.add(ROOT, rootTemplate);
//     // templateMap.add(epsilonTemplate);

//     // myDiagram.nodeTemplate = epsilonTemplate;
//     myDiagram.nodeTemplateMap = templateMap;

//     // myDiagram.linkTemplate = 
//     // make(go.Link, 
//     //   make(go.Shape, {strokeWidth: 2, stroke: lineColor}));


// }

// // Returns an empty Go Diagram object
// function initializeStateGraph() {
//   var make = go.GraphObject.make;
//   myDiagram = make(go.Diagram, 'stateGraph', {
//     initialContentAlignment: go.Spot.Center
//   });


  
//   addStyling(myDiagram, make);

    

//   // myDiagram.linkTemplate = 
//   //   make(go.Link,)

//   return myDiagram;
// }


// // Translates adjacency list to Go graph representation
// function displayDiagram(stateGraph) {
 

//   var nodes = [];
//   var edges = [];

//   for (id in stateGraph) {
    
//     var text = stateGraph[id].text;
//     var category = stateGraph[id].dataType;

//     nodes.push({key: id, text: text, category: category});
    
//     var nodeEdges = stateGraph[id].edges;
//     for (var i = 0; i < nodeEdges.length; i++) {
//       edges.push({from: id, to: nodeEdges[i]});
//     }
//   }

//   myDiagram.model = new go.GraphLinksModel(nodes, edges);
// }