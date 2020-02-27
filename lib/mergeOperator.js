const EPSILON = 'epsilon';  // Denotes an intermediary node
const ATOM = 'atom';  // Denotes a GOLDBAR atom
const ROOT = 'root';  // Denotes the unique root node
const ACCEPT = 'accept';    // Denotes an end node/a global leaf


function mergeOperator(newGraph, graph1, graph2, categories1, categories2, finalCategories, tolerance) {
  let tensorNodes = [];
  let cartesianOnly = [];
  let root;
  let accepts = [];
  for (let id in newGraph) {
    let node = newGraph[id];
    if (node.text === ROOT) {
      root = node.id;
    }
    if (node.type === ACCEPT) {
      accepts.push(node.id);
    }
    // get the ids from the two original graphs
    let id1 = node.id[0];
    let id2 = node.id[1];
    // compare all the edges of the first id to all the ones from the second id
    for (let edge1 of graph1[id1].edges) {
      if (edge1.component !== EPSILON) {
        for (let edge2 of graph2[id2].edges) {
          // if both edges had the same component and neither was an EPSILON, add to the new graph
          if (edge2.component !== EPSILON) {
            // compare the categories
            let inCommon = compareCategories(categories1[edge1.text], categories2[edge2.text]);
            // compare function will return empty ids and roles if there is no match
            if (inCommon.ids.length !== 0 || inCommon.roles.length !== 0) {
              let newSrc = [edge1.src, edge2.src];
              let newDest = [edge1.dest, edge2.dest];
              // addToFinalCategories also returns what the new text of this edge should be
              let newText = addToFinalCategories(finalCategories, inCommon, edge1.text, edge2.text);
              let newEdge = {
                src: newSrc,
                dest: newDest,
                component: inCommon,
                type: ATOM,
                text: newText,
                propagated: false
              };
              node.edges.push(newEdge);
              tensorNodes.push(node.id);
              tensorNodes.push(newDest);
            }
          }
        }
      }
    }
  }

  tensorNodes = arrayOfUniqueArrays(tensorNodes);
  // infer linker edges between nodes in the tensor product
  inferTensorToTensor(tensorNodes, newGraph);

  // propagate first graph's unmatched edges to the new graph and infer edges from cartesian nodes to tensor nodes
  propagateUnmatchedEdges(graph1, newGraph, 0, 1, tensorNodes, cartesianOnly);
  cartesianOnly = arrayOfUniqueArrays(cartesianOnly);
  inferCartesianToTensor(cartesianOnly, tensorNodes, newGraph);
  cartesianOnly = []; // clear so you only keep track of the most recently added cartesian-only nodes

  // propagate second graph's unmatched edges to the new graph and infer edges from new cartesian nodes to tensor nodes
  propagateUnmatchedEdges(graph2, newGraph, 1, 0, tensorNodes, cartesianOnly);
  cartesianOnly = arrayOfUniqueArrays(cartesianOnly);
  inferCartesianToTensor(cartesianOnly, tensorNodes, newGraph);

}


/**
 * Returns the ids and roles in the combined category
 * @param cat1
 * @param cat2
 * @return {{roles: Array, ids: Array}|{roles: any[], ids: Array}}
 */
function compareCategories(cat1, cat2) {
  let commonIds = [];
  for (let id1 of cat1.ids) {
    for (let id2 of cat2.ids) {
      if (id1 === id2) {
        commonIds = [...new Set(commonIds.concat(cat1.ids))];
        commonIds = [...new Set(commonIds.concat(cat2.ids))];
        break;
      }
    }
  }
  if (commonIds.length === 0) {
    return {ids: [], roles: []};
  }


  let inCommon = {
    ids: commonIds,
    roles: [...new Set(cat1.roles.concat(cat2.roles))]
  };
  return inCommon;
}


/**
 * Adds the common ids to either a new or existing category in the final categories
 * @param finalCategories
 * @param inCommon
 * @param text1 String: text from first edge
 * @param text2 String: text from second edge
 * @return {string|*} text to use in resulting edge
 */
function addToFinalCategories(finalCategories, inCommon, text1, text2) {
  let ret;
  if (text1 === text2) {
    finalCategories[text1] = inCommon;
    return text1;
  } else {
    // try the edges' text fields combined in both orders to see if it is already in finalCategories
    let orderOne = text1 + '_' + text2;
    let orderTwo = text2 + '_' + text1;
    if (orderOne in finalCategories) {
      finalCategories[orderOne].ids.concat(inCommon.ids);
      finalCategories[orderOne].roles.concat(inCommon.roles);
      ret = orderOne;
    } else if (orderTwo in finalCategories) {
      finalCategories[orderTwo].ids.concat(inCommon.ids);
      finalCategories[orderTwo].roles.concat(inCommon.roles);
      ret = orderTwo;
    } else { // if not, make a new entry for this edge
      finalCategories[orderOne] = inCommon;
      ret = orderOne;
    }
  }
  return ret;
}


/**
 * Infers linker edges between nodes in the tensor product
 * @param tensorNodes
 * @param graph
 */
function inferTensorToTensor(tensorNodes, graph) {
  let allNewEdges = [];
  for (let id of tensorNodes) {
    let node = graph[id];
    if ((node.edges.length === 0) && (node.text !== ACCEPT)) {
      allNewEdges = allNewEdges.concat(createNewTensorEdges(tensorNodes, node.id, graph));
    }
  }
  addEdges(allNewEdges, graph);
}

/**
 * Helper function to create edges from graph[id] to any node in nodeArr in the same row or column as id
 * @param nodeArr
 * @param id
 * @param graph
 */
function createNewTensorEdges(nodeArr, id, graph) {
  let newEdges = [];
  for (let nodeId of nodeArr) {
    let node = graph[nodeId];
    if (node.id !== id) {
      if ((node.id[0] === id[0]) || (node.id[1] === id[1])) {
        if (node.edges.length > 0 || node.type === ACCEPT) {
          let srcNode = graph[id];
          let newEdge = {
            src: id,
            dest: node.id,
            component: EPSILON,
            type: EPSILON,
            text: EPSILON,
            propagated: false
          };
          if (createsEmptyCycle(newEdge, node)) {
            continue;
          }
          if (!edgeExists(srcNode, newEdge)) {
            newEdges.push(newEdge);
          }
        }
      }
    }
  }
  return newEdges;
}

/**
 * Add all edges in edgeArr to graph
 * @param edgeArr
 * @param graph
 */
function addEdges(edgeArr, graph) {
  for (let edge of edgeArr) {
    let node = graph[edge.src];
    node.edges.push(edge);
  }
}


/**
 * Returns true if edgeSourceNode contains an edge that is the duplicate of compareEdge
 * @param edgeSourceNode Source node of potential edge to be added
 * @param compareEdge Potential edge to be added
 * @return {boolean}
 */
function edgeExists(edgeSourceNode, compareEdge) {
  for (let edge of edgeSourceNode.edges) {
    let srcInfo = [edge.src, edge.dest, edge.component];
    let toCompare = [compareEdge.src, compareEdge.dest, compareEdge.component];
    if (JSON.stringify(srcInfo) === JSON.stringify(toCompare)) {
      return true;
    }
  }
  return false;
}


/**
 * Returns true if adding newEdge to the graph creates an EPSILON cycle with edgeDestNode
 * @param newEdge Potential edge to be added
 * @param edgeDestNode Destination node of the new edge
 * @return {boolean}
 */
function createsEmptyCycle(newEdge, edgeDestNode) {
  let edgeIndex;
  for (let edge of edgeDestNode.edges) {
    if (JSON.stringify(edge.dest) === JSON.stringify(newEdge.src)) {
      if (edge.component === EPSILON && newEdge.component === EPSILON) {
        // propagated edges trump inferred edges, always keep the propagated edge
        if (edge.propagated && !newEdge.propagated) {
          return true;
        } else if (newEdge.propagated && !edge.propagated) {
          edgeIndex = edgeDestNode.edges.indexOf(edge);
        } else {
          return true;
        }
      }
    }
  }
  // if there was a non-propagated edge to delete, delete it and then return false
  if (edgeIndex !== undefined) {
    edgeDestNode.edges.splice(edgeIndex, 1);
  }
  return false;
}


/**
 * Propagate any blank edges and edges that with parts that did not end up in the tensor product to the new graph
 * @param oldGraph
 * @param newGraph
 * @param idPos
 * @param notIDPos
 * @param tensorNodes
 * @param cartesianOnly
 */
function propagateUnmatchedEdges(oldGraph, newGraph, idPos, notIDPos, tensorNodes, cartesianOnly) {
  for (let id in oldGraph) {
    let node = oldGraph[id];
    for (let edge of node.edges) {
      if (edge.component === EPSILON) {
        propagateHelper(newGraph, edge, idPos, notIDPos, edge.component, cartesianOnly, tensorNodes);
      } else { // if the component is not an EPSILON, check if it matched with any edge in the other graph while making the tensor product
        let mustPropagate = true;
        for (let tensor of tensorNodes) {
          if (tensor[idPos] === id) {
            for (let tensorEdge of newGraph[tensor].edges) {
              if (tensorEdge.component !== EPSILON) {
                let inCommon = compareCategories(tensorEdge.component, edge.component);
                if (inCommon.ids.length !== 0 || inCommon.roles.length !== 0) {
                  mustPropagate = false;
                  break;
                }
              }
            }
          }
        }
        // only if the component ids didn't match anywhere should this edge be propagated
        if (mustPropagate) {
          propagateHelper(newGraph, edge, idPos, notIDPos, edge.component, cartesianOnly, tensorNodes);
        }
      }
    }
  }
}


/**
 * Helper function to create and add the propagated edge
 * @param newGraph
 * @param edge
 * @param idPos
 * @param notIDPos
 * @param component
 * @param cartesianOnly
 * @param tensorNodes
 */
function propagateHelper(newGraph, edge, idPos, notIDPos, component, cartesianOnly, tensorNodes) {
  for (let newID in newGraph) {
    let newNode = newGraph[newID];
    if (newNode.id[idPos] === edge.src) {
      // the blanks must go to any node which is half made from the node we are looking at in the old graph
      let newDest = [0, 0];
      newDest[idPos] = edge.dest;
      newDest[notIDPos] = newNode.id[notIDPos];

      if (isArrayInArray(tensorNodes, newNode.id) && isArrayInArray(tensorNodes, newDest)) {
        continue;
      }

      let newEdge;
      if (component === EPSILON) {
        // if the node that is the destination of this edge doesn't have an operator, EPSILON, otherwise use the existing text and type
        if (newGraph[newDest].operator.length === 0){
          newEdge = {
            src: newNode.id,
            dest: newDest,
            component: component,
            type: EPSILON,
            text: EPSILON,
            propagated: true
          };
        } else {
          newEdge = {
            src: newNode.id,
            dest: newDest,
            component: component,
            type: edge.type,
            text: edge.text,
            propagated: true
          };
        }
      } else { // if the edge is not an EPSILON, use the existing component
        newEdge = {
          src: newNode.id,
          dest: newDest,
          component: component,
          type: edge.type,
          text: edge.text,
          propagated: true
        };
      }
      if (!createsEmptyCycle(newEdge, newGraph[newDest]) && !edgeExists(newNode, newEdge)) {
        newNode.edges.push(newEdge);
        if (!isArrayInArray(tensorNodes, newNode.id)) {
          cartesianOnly.push(newNode.id);
        }
        if (!isArrayInArray(tensorNodes, newDest)) {
          cartesianOnly.push(newDest);
        }
      }
    }
  }
}


/**
 * Infers linker edges from nodes only in the cartesian product of graphs to nodes in the tensor product
 * @param cartesianOnly
 * @param tensorNodes
 * @param graph
 */
function inferCartesianToTensor(cartesianOnly, tensorNodes, graph) {
  let allNewEdges = [];
  for (let id of cartesianOnly) {
    let node = graph[id];
    allNewEdges = allNewEdges.concat(createNewCartesianEdges(tensorNodes, node.id, graph));
  }
  addEdges(allNewEdges, graph);
}


/**
 * Helper function to create edges from graph[id] to any node in nodeArr in the same row or column as id
 * @param nodeArr
 * @param id
 * @param graph
 */
function createNewCartesianEdges(nodeArr, id, graph) {
  let newEdges = [];
  for (let nodeId of nodeArr) {
    let node = graph[nodeId];
    if (node.id !== id) {
      if ((node.id[0] === id[0]) || (node.id[1] === id[1])) {
        let srcNode = graph[id];
        let newEdge = {
          src: id,
          dest: node.id,
          component: EPSILON,
          type: EPSILON,
          text: EPSILON,
          propagated: false
        };
        if (createsEmptyCycle(newEdge, node)) {
          continue;
        }
        if (!edgeExists(srcNode, newEdge)) {
          newEdges.push(newEdge);
        }
      }
    }
  }
  return newEdges;
}



/* 2D ARRAY HELPERS */

/**
 * Creates a unique 2D array out of twoDArray
 * @param twoDArray
 * @return {*}
 */
function arrayOfUniqueArrays(twoDArray) {
  twoDArray = twoDArray.map(ar=>JSON.stringify(ar))
    .filter((itm, idx, arr) => arr.indexOf(itm) === idx)
    .map(str=>JSON.parse(str));
  return twoDArray;
}


// https://stackoverflow.com/questions/41661287/how-to-check-if-an-array-contains-another-array
/**
 * The .includes method for 2D arrays
 * @param arr
 * @param item
 * @return {*|boolean}
 */
function isArrayInArray(arr, item){
  let itemAsString = JSON.stringify(item);

  return  arr.some(function(elem) {
    return JSON.stringify(elem) === itemAsString;
  });
}


module.exports = mergeOperator;
