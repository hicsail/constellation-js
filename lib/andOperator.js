const constants = require('./constants');

function andOperator(newGraph, graph1, graph2, categories1, categories2, finalCategories, tolerance) {
  for (let id of newGraph.nodes) {
    let node = newGraph.get(id);
    // get the ids from the two original graphs
    let id1 = node.id[0];
    let id2 = node.id[1];
    // compare all the edges of the first id to all the ones from the second id
    for (let edge1 of graph1.getEdges(id1)) {
      if (edge1.component !== constants.EPSILON) {
        for (let edge2 of graph2.getEdges(id2)) {
          // if both edges had the same component and neither was an EPSILON, add to the new graph
          if ((edge2.component !== constants.EPSILON) && (edge1.orientation === edge2.orientation)) {
            let inCommon;
            if (categories1[edge1.text] === undefined) {
              throw new Error(edge1.text + ' not defined in first graph\'s categories.');
            }
            if (categories2[edge2.text] === undefined) {
              throw new Error(edge2.text + ' not defined in second graph\'s categories.');
            }
            // compare the categories in according to the correct tolerance level
            if (tolerance == 0) {
              inCommon = compareCategoriesZero(categories1[edge1.text], categories2[edge2.text]);
            } else if (tolerance == 1) {
              inCommon = compareCategoriesOne(categories1[edge1.text], categories2[edge2.text]);
            } else if (tolerance == 2) {
              inCommon = compareCategoriesTwo(categories1[edge1.text], categories2[edge2.text]);
            } else {
              throw new Error('Invalid tolerance level');
            }
            // compare functions will return empty ids and roles if there is no match
            if (getAllIDs(inCommon).length !== 0 || Object.keys(inCommon).length !== 0) {
              let newSrc = [edge1.src, edge2.src];
              let newDest = [edge1.dest, edge2.dest];
              // addToFinalCategories also returns what the new text of this edge should be
              let newText = addToFinalCategories(finalCategories, inCommon, edge1.text, edge2.text, tolerance);
              let newEdge = {
                src: newSrc,
                dest: newDest,
                component: inCommon,
                type: constants.ATOM,
                text: newText,
                orientation: edge1.orientation
              };
              node.edges.push(newEdge);
            }
          }
        }
      }
    }
  }

  // propagate each graph's blank edges across the new graph
  propagateBlanks(graph1, newGraph, 0, 1);
  propagateBlanks(graph2, newGraph, 1, 0);

}

/**
 * @param cat1 Array: first list of categories
 * @param cat2 Array: second list of categories
 * @returns {Object} all the ids that are in common between the two categories
 */
function compareCategoriesZero(cat1, cat2) {
  let inCommon = {};
  for (let role1 in cat1) {
    for (let id1 of cat1[role1]) {
      for (let role2 in cat2) {
        for (let id2 of cat2[role2]) {
          if (id1 === id2) {
            if (role1 === role2) {
              addToInCommon(inCommon, role1, id1);
            } else {
              addToInCommon(inCommon, role1, id1);
              addToInCommon(inCommon, role2, id1);
            }
          }
        }
      }
    }
  }

  return inCommon;
}

function addToInCommon(inCommon, role, id) {
  if (role in inCommon) {
    inCommon[role].push(id);
    inCommon[role] = [...new Set(inCommon[role])];
  } else {
    inCommon[role] = [id];
  }
}

/**
 * @param cat1 Array: first list of categories
 * @param cat2 Array: second list of categories
 * @returns {Object} all the ids that are in common between the two categories
 */
function compareCategoriesOne(cat1, cat2) {
  const cat1IDs = getAllIDs(cat1);
  const cat2IDs = getAllIDs(cat2);
  if (cat1IDs.length !== 0 && cat2IDs.length !== 0) {
    return compareCategoriesZero(cat1, cat2);
  }

  // find if the part has any roles in common, if none, return empty category
  let commonRoles = [];
  for (let role1 of Object.keys(cat1)) {
    for (let role2 of Object.keys(cat2)) {
      if (role1 === role2) {
        commonRoles.push(role1);
      }
    }
  }
  if (commonRoles.length === 0) {
    return {};
  }

  let inCommon = {};
  for (let role of commonRoles) {
    if (cat1[role].length === 0) {
      inCommon[role] = cat2[role];
    } else {
      inCommon[role] = cat1[role];
    }
  }

  if (getAllIDs(inCommon).length === 0) {
    return {};
  }

  return inCommon;
}

/**
 * @param cat1 Array: first list of categories
 * @param cat2 Array: second list of categories
 * @returns {Object} all the ids that are in common between the two categories
 */
function compareCategoriesTwo(cat1, cat2) {
  const cat1IDs = getAllIDs(cat1);
  const cat2IDs = getAllIDs(cat2);
  if (cat1IDs.length !== 0 && cat2IDs.length !== 0) {
    return compareCategoriesZero(cat1, cat2);

  } else if (cat1IDs.length === 0 && cat2IDs.length === 0) {
    // find if the part has any roles in common, if none, return empty category
    let commonRoles = [];
    for (let role1 of Object.keys(cat1)) {
      for (let role2 of Object.keys(cat2)) {
        if (role1 === role2) {
          commonRoles.push(role1);
        }
      }
    }
    if (commonRoles.length === 0) {
      return {};
    }
    let inCommon = {};
    for (let role of commonRoles) {
      inCommon[role] = [];
    }
    return inCommon;

  } else {
    return compareCategoriesOne(cat1, cat2);
  }
}


/**
 * Adds the common ids to either a new or existing category in the final categories
 * @param finalCategories
 * @param inCommon
 * @param text1 String: text from first edge
 * @param text2 String: text from second edge
 * @param tolerance String: tolerance level of AND
 * @return {string|*} text to use in resulting edge
 */
function addToFinalCategories(finalCategories, inCommon, text1, text2, tolerance) {
  let ret;
  if (text1 === text2) {
    finalCategories[text1] = inCommon;
    return text1;
  } else {
    // try the edges' text fields combined in both orders to see if it is already in finalCategories
    let orderOne = `${text1}_and${tolerance}_${text2}`; // (e.g. cds1_and0_cds2)
    let orderTwo = `${text2}_and${tolerance}_${text1}`;
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
 * Puts all the blank edges from one graph into the combined graph
 * @param oldGraph Object: graph from which to take blank edges
 * @param newGraph Object: graph in which to put blank edges
 * @param idPos int: position oldGraph id in id arrays of newGraph
 * @param notIDPos int: opposite position of idPos
 */
function propagateBlanks(oldGraph, newGraph, idPos, notIDPos) {
  for (let id of oldGraph.nodes) {
    let node = oldGraph.get(id);
    for (let edge of node.edges) {
      if (edge.component === constants.EPSILON) {
        for (let newID of newGraph.nodes) {
          let newNode = newGraph.get(newID);
          if (newNode.id[idPos] === edge.src) {
            // the blanks must go to any node which is half made from the node we are looking at in the old graph
            let newDest = [0, 0];
            newDest[idPos] = edge.dest;
            newDest[notIDPos] = newNode.id[notIDPos];

            // if the node that is the destination of this edge doesn't have an operator, EPSILON, otherwise use the existing text and type
            let newEdge;
            if ((newGraph.getOperators(newNode.id).length === 0) && (newGraph.getOperators(newDest).length === 0)){
              newEdge = {
                src: newNode.id,
                dest: newDest,
                component: constants.EPSILON,
                type: constants.EPSILON,
                text: constants.EPSILON,
                orientation: constants.NONE
              };
            } else {
              newEdge = {
                src: newNode.id,
                dest: newDest,
                component: constants.EPSILON,
                type: edge.type,
                text: edge.text,
                orientation: edge.orientation
              };
            }
            newNode.edges.push(newEdge);
          }
        }
      }
    }
  }
}


function removeNonPaths(graph) {
  let root = graph.root;
  let accepts = graph.accepts;
  let pMap = graph.pMap;
  // make all every node's visited field false
  for (let id of graph.nodes) {
    graph.get(id).visited = false;
  }
  // perform bfs to see which nodes can be reached from the root node
  let visitedForward = bfs(graph, root);
  let visitedBackward = [];

  // perform a reverse bfs to see which nodes can be reached from any of the accept nodes
  for (let a of accepts) {
    // make all every node's visited field false again
    for (let id of graph.nodes) {
      graph.get(id).visited = false;
    }
    visitedBackward = visitedBackward.concat(reverseBFS(graph, pMap, a));
  }
  // keep only the nodes that can be reached from both the root node and any of the accept nodes
  let keepIds = visitedForward.filter(id => visitedBackward.includes(id));
  if (keepIds.length !== 0) {
    keepIds.push(root);
    for (let a of accepts) {
      if (pMap[a]) {
        keepIds.push(a);
      }
    }
  }
  for (let id of graph.nodes) {
    if (!keepIds.includes(id)) {
      graph.removeNodeFromEdges(null, id);
      graph.removeNode(id);
    }
  }
}

function bfs(graph, root) {

  // Create a queue for BFS
  let queue = [];
  let visited = [];
  // Mark the source node as visited and enqueue it
  queue.push(root);
  let node = graph.get(root);
  node.visited = true;
  visited.push(root);

  while (queue.length > 0) {
    // Dequeue a node from queue
    root = queue.shift();
    node = graph.get(root);
    // Get all adjacent nodes of the dequeued node root. If an adjacent has not been visited,
    // then mark it visited and enqueue it
    for (let edge of node.edges) {
      let next = graph.get(edge.dest);
      if (!next.visited) {
        queue.push(next.id);
        next.visited = true;
        visited.push(next.id);
      }
    }
  }
  return visited;
}


function reverseBFS(graph, pMap, accept) {
  // Create a queue for BFS
  let queue = [];
  let visited = [];
  // Mark the source node as visited and enqueue it
  queue.push(accept);
  let node = graph.get(accept);
  if (!pMap[accept]) {
    return visited;
  }
  node.visited = true;
  visited.push(accept);

  while (queue.length > 0) {
    // Dequeue a node from queue
    accept = queue.shift();
    if (!pMap[accept]) {
      continue;
    }

    // Get all adjacent nodes of the dequeued node root. If an adjacent has not been visited,
    // then mark it visited and enqueue it
    for (let pid of Array.from(pMap[accept])) {
      let next = graph.get(pid);
      if (!next.visited) {
        if ((next.type === constants.ACCEPT) && (!pMap[pid])) {
          continue;
        }
        queue.push(pid);
        next.visited = true;
        visited.push(pid);
      }
    }
  }
  return visited;
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

module.exports = {
  andOperator,
  removeNonPaths
};
