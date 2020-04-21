const EPSILON = 'epsilon';  // Denotes an intermediary node
const ATOM = 'atom';  // Denotes a GOLDBAR atom
const ROOT = 'root';  // Denotes the unique root node
const ACCEPT = 'accept';    // Denotes an end node/a global leaf
const ONE_MORE = 'OneOrMore';
const ZERO_MORE = 'ZeroOrMore';

// constants for possible edge types in MERGE
const TENSOR = 'Tensor';
const ONE = 'One';
const TWO = 'Two';


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
            if (getAllIDs(inCommon).length !== 0 || Object.keys(inCommon).length !== 0) {
              let newSrc = [edge1.src, edge2.src];
              let newDest = [edge1.dest, edge2.dest];
              // addToFinalCategories also returns what the new text of this edge should be
              let newText = addToFinalCategories(finalCategories, inCommon, edge1.text, edge2.text);
              let newEdge = {
                src: newSrc,
                dest: newDest,
                component: inCommon,
                type: ATOM,
                label: TENSOR,
                text: newText,
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

  // push root and accepts onto tensorNodes
  tensorNodes.push(root);
  tensorNodes = tensorNodes.concat(accepts);
  tensorNodes = arrayOfUniqueArrays(tensorNodes);
  // infer linker edges between nodes in the tensor product
  inferTensorToTensor(tensorNodes, newGraph);

  // propagate first graph's unmatched edges to the new graph and infer edges from cartesian nodes to tensor nodes
  propagateUnmatchedEdges(graph1, newGraph, 0, 1, tensorNodes, cartesianOnly, ONE);
  cartesianOnly = arrayOfUniqueArrays(cartesianOnly);
  inferCartesianToTensor(cartesianOnly, tensorNodes, newGraph, ONE, 0);
  cartesianOnly = []; // clear so you only keep track of the most recently added cartesian-only nodes

  // propagate second graph's unmatched edges to the new graph and infer edges from new cartesian nodes to tensor nodes
  propagateUnmatchedEdges(graph2, newGraph, 1, 0, tensorNodes, cartesianOnly, TWO);
  cartesianOnly = arrayOfUniqueArrays(cartesianOnly);
  inferCartesianToTensor(cartesianOnly, tensorNodes, newGraph, TWO, 1);

}


/**
 * @param cat1 Array: first list of categories
 * @param cat2 Array: second list of categories
 * @returns {Object} all the ids that are in common between the two categories
 */
function compareCategories(cat1, cat2) {
  let inCommon = {};
  for (let role1 in cat1) {
    for (let id1 of cat1[role1]) {
      for (let role2 in cat2) {
        for (let id2 of cat2[role2]) {
          if (id1 === id2) {
            addToInCommon(inCommon, cat1, cat2);
            return inCommon;
          }
        }
      }
    }
  }

  return inCommon;
}


function addToInCommon(inCommon, cat1, cat2) {
  for (let role in cat1) {
    let ids = [];
    if (role in cat2) {
      ids = [...new Set(cat2[role].concat(cat1[role]))];
    } else {
      ids = cat1[role];
    }
    inCommon[role] = ids;
  }
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
      Object.assign(finalCategories[orderOne], inCommon);
      ret = orderOne;
    } else if (orderTwo in finalCategories) {
      Object.assign(finalCategories[orderTwo], inCommon);
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
    // if a node doesn't have any outgoing edges:
    if (node.edges.length === 0) {
      // if that node is also a root or it has any incoming edges, add edges
      if ((node.type === ROOT) || (hasIncomingEdge(node.id, graph))) {
        allNewEdges = allNewEdges.concat(createNewTensorEdges(tensorNodes, node.id, graph));
      }
    }
  }
  addEdges(allNewEdges, graph);
}

/**
 * Checks whether a node has any incoming edges
 * @param nodeId
 * @param graph
 * @return {boolean}
 */
function hasIncomingEdge(nodeId, graph) {
  for (let id in graph) {
    for (let edge of graph[id].edges) {
      if (JSON.stringify(edge.dest) === JSON.stringify(nodeId)) {
        return true;
      }
    }
  }
  return false;
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
    if (JSON.stringify(node.id) !== JSON.stringify(id)) {
      // if either the first parts (row) OR the second parts (column) of the id match:
      if ((node.id[0] === id[0]) || (node.id[1] === id[1])) {
        // if the node has no outgoing edges or is an accept node, create an edge
        if (node.edges.length > 0 || node.type === ACCEPT) {
          let newEdge = {
            src: id,
            dest: node.id,
            component: EPSILON,
            type: EPSILON,
            label: TENSOR,
            text: EPSILON,
          };
          if (!edgeExists(graph[id], newEdge)) {
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
    let srcInfo = [edge.src, edge.dest, edge.component, edge.label];
    let toCompare = [compareEdge.src, compareEdge.dest, compareEdge.component, compareEdge.label];
    if (JSON.stringify(srcInfo) === JSON.stringify(toCompare)) {
      return true;
    }
  }
  return false;
}

/**
 * Propagate any blank edges and edges that with parts that did not end up in the tensor product to the new graph
 * @param oldGraph
 * @param newGraph
 * @param idPos every id is an array; array[idPos] is the id from the old graph
 * @param notIDPos every id is an array; array[notIDPos] is the id from the other old graph
 * @param tensorNodes
 * @param cartesianOnly
 * @param edgeLabel
 */
function propagateUnmatchedEdges(oldGraph, newGraph, idPos, notIDPos, tensorNodes, cartesianOnly, edgeLabel) {
  for (let id in oldGraph) {
    let node = oldGraph[id];
    for (let edge of node.edges) {
      if (edge.component === EPSILON) {
        propagateHelper(newGraph, edge, idPos, notIDPos, cartesianOnly, tensorNodes, edgeLabel);
      } else { // if the component is not an EPSILON, check if it matched with any edge in the other graph while making the tensor product
        // only if the component ids didn't match anywhere should this edge be propagated
        if (mustPropagate(node.id, idPos, tensorNodes, newGraph, edge)) {
          propagateHelper(newGraph, edge, idPos, notIDPos, cartesianOnly, tensorNodes, edgeLabel);
        }
      }
    }
  }
}

/**
 * Checks whether a given edge must be propagated in the Cartesian product
 * @param id ID of src node
 * @param idPos position of id in newGraph id arrays
 * @param tensorNodes list of nodes in tensor product (pseudocode Z)
 * @param newGraph
 * @param edge edge in question
 * @return {boolean} whether the edge should be propagated
 */
function mustPropagate(id, idPos, tensorNodes, newGraph, edge) {
  for (let tensor of tensorNodes) {
    if (tensor[idPos] === id) {
      for (let tensorEdge of newGraph[tensor].edges) {
        if (tensorEdge.component !== EPSILON) {
          let inCommon = compareCategories(tensorEdge.component, edge.component);
          if (getAllIDs(inCommon).length !== 0 || Object.keys(inCommon).length !== 0) {
            return false;
          }
        }
      }
    }
  }
  return true;
}


/**
 * Helper function to create and add the propagated edge
 * @param newGraph
 * @param edge
 * @param idPos every id is an array; array[idPos] is the id from the old graph
 * @param notIDPos every id is an array; array[notIDPos] is the id from the other old graph
 * @param cartesianOnly
 * @param tensorNodes
 * @param edgeLabel
 */
function propagateHelper(newGraph, edge, idPos, notIDPos, cartesianOnly, tensorNodes, edgeLabel) {
  for (let newID in newGraph) {
    let newNode = newGraph[newID];
    if (newNode.id[idPos] === edge.src) {
      // the blanks must go to any node which is half made from the node we are looking at in the old graph
      let newDest = [0, 0];
      newDest[idPos] = edge.dest;
      newDest[notIDPos] = newNode.id[notIDPos];

      let newEdge;
      // if the node that is the destination of this edge doesn't have an operator, EPSILON, otherwise use the existing text and type
      if ((edge.component === EPSILON) && (newGraph[newNode.id].operator.length === 0) && (newGraph[newDest].operator.length === 0)) {
        newEdge = {
          src: newNode.id,
          dest: newDest,
          component: edge.component,
          type: EPSILON,
          label: edgeLabel,
          text: EPSILON,
        };
      } else {
        newEdge = {
          src: newNode.id,
          dest: newDest,
          component: edge.component,
          type: edge.type,
          label: edgeLabel,
          text: edge.text,
        };
      }

      if (!edgeExists(newNode, newEdge)) {
        newNode.edges.push(newEdge);
        // make sure cartesianOnly doesn't have any tensor nodes in it
        if (!isArrayInArray(newNode.id, tensorNodes)) {
          cartesianOnly.push(newNode.id);
        }
        if (!isArrayInArray(newDest, tensorNodes)) {
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
 * @param edgeLabel
 * @param idPos
 */
function inferCartesianToTensor(cartesianOnly, tensorNodes, graph, edgeLabel, idPos) {
  let allNewEdges = [];
  for (let id of cartesianOnly) {
    let node = graph[id];
    allNewEdges = allNewEdges.concat(createNewCartesianEdges(tensorNodes, node.id, graph, edgeLabel, idPos));
  }
  addEdges(allNewEdges, graph);
}


/**
 * Helper function to create edges from graph[id] to any node in nodeArr in the same row or column as id
 * @param nodeArr
 * @param id
 * @param graph
 * @param edgeLabel
 * @param idPos the part of id that we need to match
 */
function createNewCartesianEdges(nodeArr, id, graph, edgeLabel, idPos) {
  let newEdges = [];
  for (let nodeId of nodeArr) {
    let node = graph[nodeId];
    if (JSON.stringify(node.id) !== JSON.stringify(id)) {
      if (node.id[idPos] === id[idPos]) {
        let newEdge = {
          src: id,
          dest: node.id,
          component: EPSILON,
          type: EPSILON,
          label: edgeLabel,
          text: EPSILON,
        };
        if (!edgeExists(graph[id], newEdge)) {
          newEdges.push(newEdge);
        }
      }
    }
  }
  return newEdges;
}


/**
 * Extracts all the ids from every role in a category
 * @param category
 * @return {Array|any[]}
 */
function getAllIDs(category) {
  let ids = [];
  for (let role in category) {
    ids = [...new Set(ids.concat(category[role]))];
  }
  return ids;
}


/* FILTERING STEP FUNCTIONS */

/**
 * Removes paths (nodes and edges) that go from one Cartesian product to the other
 * without passing through a Tensor product portion of the graph
 * @param graph
 * @param root
 * @param accepts
 */
function removeNonPaths(graph, root, accepts) {
  // make all each node and edge's visited field false
  for (let id in graph) {
    graph[id].visited = false;
  }
  let rootDummy = {
    src: 'dummy',
    dest: root,
    component: EPSILON,
    type: EPSILON,
    label: TENSOR,
    text: EPSILON,
  };
  findForwardPaths(graph, rootDummy, accepts);
  removeNonVisited(graph);
}

/**
 * Removes any non-visited nodes, edges that are not marked 'keep', and nodes that have no edges
 * @param graph
 */
function removeNonVisited(graph) {
  for (let id in graph) {
    let node = graph[id];
    if (!node.visited) {
      delete graph[id];
      removeNodeFromEdges(graph, id);
    } else {
      for (let edge of node.edges) {
        if ((edge.keep === undefined) || (edge.keep === null)) {
          node.edges = node.edges.filter(e => JSON.stringify(e) !== JSON.stringify(edge));
        }
      }
      if ((node.type !== ACCEPT) && (node.edges.length === 0)) {
        delete graph[id];
        removeNodeFromEdges(graph, id);
      }
    }
  }
}


/**
 * Keeps track of all valid paths through graph and marks correct nodes/edges as 'keep'
 * (Adapted from https://www.geeksforgeeks.org/print-paths-given-source-destination-using-bfs/)
 * @param graph
 * @param dummy
 * @param accepts
 */
function findForwardPaths(graph, dummy, accepts) {
  let queue = [];
  let path = [];
  let nodesToAccept = {};

  // first path just starts with the dummy edge, put it in the queue
  path.push(dummy);
  queue.push(path);

  // continue to shift paths off the queue to see if they can continue
  while (queue.length > 0) {
    path = queue.shift();
    let last = path[path.length - 1];
    // if you hit an accept, you can keep all the edges in that path
    // also add all the nodes from that path to nodesToAccept
    if (accepts.includes(last.dest)) {
      addToDict(path, nodesToAccept);
      for (let e of path) {
        e.keep = true;
      }
    }

    // if you can reach an accept from last's dest, you don't have to keep going
    if (canReachAccept(last, nodesToAccept)) {
      for (let e of path) {
        e.keep = true;
      }
      continue;
    }

    // find all the valid next edges, if there are any, visit them
    let next = nextEdges(graph, last, graph[last.dest].edges, path);
    if (next.length !== 0) {
      for (let nextEdge of next) {
        // make sure the edge isn't in the path already
        // if (!edgeInPath(nextEdge, path)) {
          let newPath = [...path];
          newPath.push(nextEdge);
          queue.push(newPath);
        // }
      }
    }
    // after visiting all of this node's edges, this node has been visited
    graph[last.dest].visited = true;
  }
}


function edgeInPath(edge, path) {
  for (let e of path) {
    if (JSON.stringify(e) === JSON.stringify(edge)) {
      return true;
    }
  }
  return false;
}


/**
 * Returns true for empty cycles and for edges that
 * go back to a visited node which is not a cycle node
 * @param graph
 * @param nextEdge
 * @param path
 * @return {boolean}
 */
function createsFalseCycle(graph, nextEdge, path) {
  let last = path[path.length - 1];
  if (last.src === nextEdge.dest) {
    let cycleHead = graph[last.src];
    if (!cycleHead.operator.includes(ONE_MORE) && !cycleHead.operator.includes(ZERO_MORE)) {
      return true;
    } else if ((last.component === EPSILON) && (nextEdge.component === EPSILON)) {
      return true;
    }
  }
  return false;
}


/**
 * Returns a list of valid next edges that one can take from the current edge to form a valid path
 * @param graph
 * @param edge
 * @param edgeList
 * @param path
 * @return {Array|*}
 */
function nextEdges(graph, edge, edgeList, path) {
  // TENSOR edges can go to any edge next
  if (edge.label === TENSOR) {
    return edgeList;
  }

  let edges = [];
  for (let nextEdge of edgeList) {
    // other edges can only go to their own kind or to TENSOR edges
    if ((nextEdge.label === edge.label) || (nextEdge.label === TENSOR)) {
      if (!edgeInPath(nextEdge, path)) {
        if (!createsFalseCycle(graph, nextEdge, path)) {
          edges.push(nextEdge);
        }
      }
    }
  }
  return edges;
}


/**
 * Once you have a full path, add how you make that path from each node to the dictionary
 * @param path
 * @param nodesToAccept
 */
function addToDict(path, nodesToAccept) {
  for (let edge of path) {
    if (edge.src in nodesToAccept) {
      if (!nodesToAccept[edge.src].includes(edge.label)) {
        nodesToAccept[edge.src].push(edge.label);
      }
    } else {
      nodesToAccept[edge.src] = [edge.label];
    }
  }
}


/**
 * If you can reach an accept from this edge via a valid nextEdge, return true
 * @param edge
 * @param nodesToAccept
 * @return {boolean|*}
 */
function canReachAccept(edge, nodesToAccept) {
  if (edge.dest in nodesToAccept) {
    return ((nodesToAccept[edge.dest].includes(edge.label)) || (nodesToAccept[edge.dest].includes(TENSOR)));
  }
  return false;
}


/**
 * Removes all edges pointing to a deleted node
 * @param graph
 * @param deleted
 */
function removeNodeFromEdges(graph, deleted) {
  for (let id in graph) {
    let node = graph[id];
    for (let edge of node.edges) {
      if (edge.dest === deleted) {
        node.edges = node.edges.filter(e => JSON.stringify(e) !== JSON.stringify(edge));
      }
    }
  }
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
 * @param item
 * @param arr
 * @return {*|boolean}
 */
function isArrayInArray(item, arr){
  let itemAsString = JSON.stringify(item);

  return  arr.some(function(elem) {
    return JSON.stringify(elem) === itemAsString;
  });
}


module.exports = {
  mergeOperator,
  removeNonPaths
};
