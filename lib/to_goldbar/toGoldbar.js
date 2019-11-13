const graphDataOnEdges = require('../graphDataOnEdges');
const combineGraphs = require('../combineGraphs');
const util = require('util');
const fs = require('fs');
const exec = require("child_process").exec;
// const {PythonShell} = require('python-shell');
// const XMLHttpRequest = require("xmlhttprequest").XMLHttpRequest;



function toGoldbar(stateGraph) {

  let transition = getTransitionDict(stateGraph);
  let states = Object.keys(transition).toString();
  let transitionString = JSON.stringify(transition);
  let root = combineGraphs.findRoot(stateGraph);
  let accepts = combineGraphs.findAccepts(stateGraph);

  let data = "-states\n" + states + "\n-start\n" + root + "\n-accept\n" + accepts + "\n-transition\n" + transitionString;
  fs.writeFile('lib/to_goldbar/args.txt', data, (err) => {
    if (err) throw err;
  });

  // let xhr = new XMLHttpRequest();
  // xhr.open("GET", "process_dict.py", true);
  // xhr.responseType = "text";
  // xhr.onload = function(e) {
  //   console.log(e);
  //   console.log(xhr.response);
  // };
  // xhr.send();

  // PythonShell.run('process_dict.py', function (err, results) {
  //   console.log(results);
  // });

  // const pythonProcess = spawn('python',["./process_dict.py"]);
  // let result;
  // pythonProcess.stdout.on('data', (data) => {
  //   result = data;
  // });

  exec('python lib/to_goldbar/process_dict.py', (error, stdout, stderr) => {
    if (error) {
      console.error(`exec error: ${error}`);
      return;
    }
    console.log(`stdout: ${stdout}`);
    console.error(`stderr: ${stderr}`);
  });
}

/**
 * Returns a graph in the form of {"id1": {"id1":'how to get here from id1', "id2": 'how to gt here from id2', ...}, ...}
 * @param stateGraph
 * @returns Object: graph in the form described above
 */
function getTransitionDict(stateGraph) {
  let transitionDict = makeEmptyGraph(stateGraph);
  for (let id in stateGraph) {
    let node = stateGraph[id];
    let edges = node.edges;
    for (let edge of edges) {
      let src = edge.src;
      let component = edge.component;
      let path;
      if (component === graphDataOnEdges.EPSILON) {
        path = 'e';
      } else {
        path = component;
      }
      transitionDict[id][src] = path;
    }
  }
  return transitionDict;
}


/**
 * Creates empty graph in the form {"id1":{"id1":'_', "id2": '_', ...}, ...}
 * @param stateGraph
 * @returns Object: empty graph as described above
 */
function makeEmptyGraph(stateGraph) {
 let emptyGraph = {};
 for (let id in stateGraph) {
   let transition = {};
   for (let id2 in stateGraph) {
     transition[id2] = '_';
   }
   emptyGraph[id] = transition;
 }
 return emptyGraph;
}


module.exports = toGoldbar;
