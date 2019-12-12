const handleOp = require('../handleOperators');
const combineGraphs = require('../combineGraphs');
const util = require('util');
const exec = util.promisify(require('child_process').exec);


async function toGoldbar(stateGraph) {

  // reformat all python inputs (must be quoted in single quotes and inner quotes must use double quotes)
  let transition = getTransitionDict(stateGraph);
  let states = stringFormatArray(Object.keys(transition));
  let transitionString = stringFormatObject(transition);
  let root = `'${combineGraphs.findRoot(stateGraph)}'`;
  let accepts = stringFormatArray(combineGraphs.findAccepts(stateGraph));

  return python(states, root, accepts, transitionString);
}

/**
 * Calls the python script that returns GOLDBAR
 * @return {Promise<*>}
 */
async function python(states, root, accepts, transitionString) {
  const cmd = `python3 lib/to_goldbar/start_with_dict.py ${states} ${root} ${accepts} ${transitionString}`;
  const { stdout, stderr } = await exec(cmd);

  if (stderr) {
    console.error(`error: ${stderr}`);
  }
  return stdout;
}

/**
 * Formats an array so that it can be used as an input for the python script
 * @param array Array
 * @return {string}
 */
function stringFormatArray(array) {
  let string = `'["${array[0]}"`;
  for (let i = 1; i < array.length; i++) {
    let key = array[i];
    string += `, "${key}"`;
  }
  string += "]'";
  return string;
}

/**
 * Formats an object so that it can be used as an input for the python script
 * @param object Object
 * @return {string}
 */
function stringFormatObject(object) {
  let string = `'{`;
  for (let key of Object.keys(object)) {
    let obj = object[key];
    string += `"${key}" : {`;
    for (let value of Object.keys(obj)) {
      string += `"${value}":"${obj[value]}", `;
    }
    string = string.slice(0, -2);
    string += `}, `;
  }
  string = string.slice(0, -2);
  string += `}'`;
  return string;

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
