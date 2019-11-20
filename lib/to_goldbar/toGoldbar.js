const graphDataOnEdges = require('../graphDataOnEdges');
const combineGraphs = require('../combineGraphs');
const util = require('util');
const fs = require('fs');
const exec = util.promisify(require('child_process').exec);


async function toGoldbar(stateGraph) {

  let transition = getTransitionDict(stateGraph);
  let states = '';
    for (let key of Object.keys(transition)) {
      states += key + ' ';
    }

  let transitionString = JSON.stringify(transition);
  let root = combineGraphs.findRoot(stateGraph);
  let accepts = combineGraphs.findAccepts(stateGraph);

  let data = "-states\n" + states + "\n-start\n" + root + "\n-accept\n" + accepts + "\n-transition\n" + transitionString;
  fs.writeFile('lib/to_goldbar/args.txt', data, (err) => {
    if (err) throw err;
  });

  return python();
}

/**
 * Calls the python script that returns GOLDBAR
 * @return {Promise<*>}
 */
async function python() {
  const { stdout, stderr } = await exec('python3 lib/to_goldbar/start_with_dict.py');

  if (stderr) {
    console.error(`error: ${stderr}`);
  }
  return stdout;
}

/**
 * Returns a graph in the form of {"id1": {"id1":'how to get here from id1', "id2": 'how to gt here from id1', ...}, ...}
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
      if (edge.component === graphDataOnEdges.EPSILON) {
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
