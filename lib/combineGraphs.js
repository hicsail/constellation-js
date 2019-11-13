const graphDataOnEdges = require('./graphDataOnEdges');
const util = require('util');


/**
 * Combines graphs sequentially with specified method
 * @param combineMethod String specifying which method of AND or MERGE
 * @param stateGraphObj Object of stateGraphs to be combined
 * @param categories Object of each graph's categories
 * @returns Object of combined graph, its categories, and the new paths
 */
function combineGraphs(combineMethod, stateGraphObj, categories) {

  let combined;
  if (combineMethod === 'and') {
    combined = linearCall(handleAnd, stateGraphObj, categories);

  } else if (combineMethod === 'merge') {
    combined = linearCall(handleMerge, stateGraphObj, categories);

  } else {
    throw new Error('Invalid combine method');
  }

  // console.log(util.inspect(combined, {showHidden: false, depth: null}));

  let root = findRoot(combined.graph);
  let paths = graphDataOnEdges.enumeratePaths(root, combined.graph, 0);

  return {graph: combined.graph, categories: combined.categories, paths: paths};

}

/**
 * Calls whichever handler function on the graphs sequentially
 * @param handleFunc Function: the function to call on each item in the object
 * @param graphObj Object: the stateGraphs of all the submitted designs
 * @param categories Object: original list of categories per stateGraph
 * @return {{categories: Object, graph: Object}}
 */
function linearCall(handleFunc, graphObj, categories) {
  let firstIter = handleFunc(graphObj[0], graphObj[1], categories[0], categories[1]);
  let finalGraph = firstIter.graph;
  let finalCategories = firstIter.categories;
  for (let i = 2; i < Object.keys(graphObj).length; i++) {
    finalGraph = handleFunc(finalGraph, graphObj[i], categories, finalCategories);
  }
  return {graph: finalGraph, categories: finalCategories};
}


// function recursiveCall(handleFunc, graph1, graphObj, categories, i) {
//   if (Object.keys(graphObj).length === 0) {
//     return {graph: graph1, categories: categories};
//   } else {
//     graph1 = handleFunc(graph1, graphObj[i], categories, i-1, i);
//     // graphObj = graphObj.slice(1);
//     delete graphObj[i];
//     i += 1;
//     recursiveCall(handleFunc, graph1, graphObj, categories, i);
//   }
// }


/**
 * Called if combine method is AND; and's one pair of graphs
 * @param graph1 Object representing the left side of the and
 * @param graph2 Object representing the right side of the and
 * @param categories1 Object of first graph's categories
 * @param categories2 Object of second graph's categories
 * @returns Object: {categories: combined categories, graph: combined graph}
 */
function handleAnd(graph1, graph2, categories1, categories2) {
  console.log("handleAnd called");
  let finalCategories = {};
  let newGraph = cartesianNodes(graph1, graph2);
  for (let id in newGraph) {
    let node = newGraph[id];
    // get the ids from the two original graphs
    let id1 = node.id[0];
    let id2 = node.id[1];
    // compare all the edges of the first id to all the ones from the second id
    for (let edge1 of graph1[id1].edges) {
      if (edge1.component !== graphDataOnEdges.EPSILON) {
        for (let edge2 of graph2[id2].edges) {
          // if both edges had the same component and neither was an EPSILON, add to the new graph
          if (edge1.component === edge2.component) {
            let inCommon = compareCategories(categories1[edge1.component], categories2[edge2.component]);
            if (inCommon.length !== 0) {
              let newSrc = [edge1.src, edge2.src];
              let newDest = [edge1.dest, edge2.dest];
              let newEdge = {
                src: newSrc,
                dest: newDest,
                component: edge1.component,
                type: graphDataOnEdges.ATOM,
                text: edge1.component
              };
              node.edges.push(newEdge);
              finalCategories[edge1.component] = inCommon;
            }
          }
        }
      }
      // propagate each graph's blank edges across the new graph
      propagateBlanks(graph1, newGraph, 0, 1);
      propagateBlanks(graph2, newGraph, 1, 0);
    }
  }

  removeNonConnectedNodes(newGraph);

  return {graph: newGraph, categories: finalCategories};

}


/**
 * Called if combine method is MERGE; merges pairs of graphs sequentially
 * @param graph1 Object representing the left side of the merge
 * @param graph2 Object representing the right side of the merge
 * @param categories Object of each graph's categories
 * @param finalCategories Object: categories in the final combined graph
 * @returns Object: Merge of both graphs
 */
function handleMerge(graph1, graph2, categories, finalCategories) {
  console.log("handleMerge called");
}

/**
 * Returns a list of node-pairs that make up the
 * cartesian product of the nodes in the two graphs
 * @param graph1 Object: the first graph
 * @param graph2 Object: the second graph
 * @returns Object: graph with nodes labeled as node pairs of original graphs
 */
function cartesianNodes(graph1, graph2) {
  let nodes = {};
  for (let id1 in graph1) {
    let node1 = graph1[id1];
    for (let id2 in graph2) {
      let node2 = graph2[id2];
      let newID = [id1, id2];
      let type = '';
      let text = '';
      if (node1.type === graphDataOnEdges.ROOT && node2.type === graphDataOnEdges.ROOT) {
        type = graphDataOnEdges.ROOT;
        text = graphDataOnEdges.ROOT;

      } else if (node1.type === graphDataOnEdges.ACCEPT && node2.type === graphDataOnEdges.ACCEPT) {
        type = graphDataOnEdges.ACCEPT;
        text = graphDataOnEdges.ACCEPT;
      }
      let newNode = {
        id: newID,
        text: text,
        type: type,
        edges: [],
        operator: []
      };
      nodes[newID] = newNode;
    }
  }
  return nodes;
}

/**
 * @param cat1 Array: first list of categories
 * @param cat2 Array: second list of categories
 * @returns {Array} all the ids that are in common between the two categories
 */
function compareCategories(cat1, cat2) {
  // console.log(cat1);
  // console.log(cat2);
  let inCommon = [];
  for (let id1 of cat1) {
    for (let id2 of cat2) {
      if (id1 === id2) {
        inCommon.push(id1);
      }
    }
  }
  return inCommon;
}


function propagateBlanks(oldGraph, newGraph, idPos, notIDPos) {
  for (let id in oldGraph) {
    let node = oldGraph[id];
    for (let edge of node.edges) {
      if (edge.component === graphDataOnEdges.EPSILON) {
        for (let newID in newGraph) {
          let newNode = newGraph[newID];
          if (newNode.id[idPos] === edge.src) {
            let newEdge = {
              src: newNode.id,
              dest: [edge.dest, newNode.id[notIDPos]],
              component: graphDataOnEdges.EPSILON,
              type: graphDataOnEdges.EPSILON,
              text: graphDataOnEdges.EPSILON
            };
            newNode.edges.push(newEdge);
            //TODO: add the operator from node into the new node's operator arr
          }
        }
      }
    }
  }
}

function removeNonConnectedNodes(graph) {
  for (let id in graph) {
    let node  = graph[id];
    if (node.edges.length === 0 && node.type !== graphDataOnEdges.ACCEPT) {
      delete graph[id];
    }
  }
}


function findRoot(graph) {
  for (let id in graph) {
    let node = graph[id];
    if (node.type === graphDataOnEdges.ROOT) {
      return id;
    }
  }
}

function findAccepts(graph) {
  let accepts = [];
  for (let id in graph) {
    let node = graph[id];
    if (node.type === graphDataOnEdges.ACCEPT) {
      accepts.push(id);
    }
  }
  return accepts.toString();
}


module.exports = {
  combineGraphs,
  findRoot,
  findAccepts
};









