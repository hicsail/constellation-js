const handleOp = require('../handleOperators');
const combineGraphs = require('../combineGraphs');
const {PythonShell} = require('python-shell');

async function toGoldbar(stateGraph) {

  // reformat all python inputs (must be quoted in single quotes and inner quotes must use double quotes)
  let transition = getTransitionDict(stateGraph);
  let states = Object.keys(transition);
  let root = combineGraphs.findRoot(stateGraph);
  let accepts = combineGraphs.findAccepts(stateGraph);

  return python(states, root, accepts, transition);
}

/**
 * Calls the python script that returns GOLDBAR
 * @return {Promise<*>}
 */
async function python(states, root, accepts, transition) {

  return new Promise((resolve, reject) => {
    let args = {
      states: states,
      root: root,
      accepts: accepts,
      transition: transition
    };

    let goldbar;
    let pyshell = new PythonShell('lib/to_goldbar/start_with_dict.py', {mode: 'json'});
    pyshell.send(args);
    pyshell.on('message', function (message) {
      // received a message sent from the Python script (a simple "print" statement)
      goldbar = message['goldbar'];
      console.log(goldbar);
    });

// end the input stream and allow the process to exit
    pyshell.end(function (err) {
      if (err) throw err;
      resolve(goldbar);
    });
  });
}


/**
 * Returns a graph in the form of {"id1": {"id1":'how to get here from id1', "id2": 'how to get here from id1', ...}, ...}
 * @param stateGraph
 * @returns Object: graph in the form described above
 */
function getTransitionDict(stateGraph) {
  let transitionDict = makeEmptyGraph(stateGraph);
  for (let id in stateGraph) {
    let node = stateGraph[id];
    let edges = node.edges;
    for (let edge of edges) {
      let dest = edge.dest;
      let text = edge.text;
      let path;
      if (edge.component === handleOp.EPSILON) {
        path = 'e';
      } else {
        path = text;
      }
      if (transitionDict[id][dest] !== '_') {
        transitionDict[id][dest] += ', ' + path;
      } else {
        transitionDict[id][dest] = path;
      }
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
