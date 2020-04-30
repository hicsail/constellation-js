const constants = require('./constants');
SbolGeneration = require('./sbol');

/**
 * Breadth width search of the state graph to create a structure that is better for SBOL generation
 * @param stateGraph Edge-based graph representation of design space
 * @param stateStack Equivalent representation of the stateGraph to help with SBOL generation
 * @param id The id to start the traverse from
 * @param edgeUsed the edge used to get to stateGraph[id] (edgeUsed.dest should be id)
 */
function makeStackFromStateGraph(stateGraph, stateStack, id, edgeUsed){
  let endIds = []; //prevent redundant ends
  let queue = [];
  let edgeQueue = [];
  queue.push(id);
  edgeQueue.push(edgeUsed);
  while (queue.length !== 0){
    let id = queue.shift();
    let node = stateGraph.get(id);
    let edgeUsed = edgeQueue.shift();
    // if node has been visited and we got here using a non-Atom, push to endIds
    if (node.visited){
      let ops = stateGraph.getOperators(id);
      if (edgeUsed.type === constants.ATOM) {
        stateStack.push({atom: edgeUsed.text});
      }
      if (ops.includes(constants.ZERO_MORE) || ops.includes(constants.ONE_MORE)) {
        if (!endIds.includes(id)) {
          stateStack.push({end: id});
          endIds.push(id);
        } else if (ops.filter(op => op === constants.ONE_MORE || op === constants.ZERO_MORE).length > 1) {
          stateStack.push({end: id});
          endIds.push(id);
        }
      }
      continue;
    }
    // if we used an atom to get to stateGraph[id], push atom to stack
    if (edgeUsed.type === constants.ATOM){
      stateStack.push({atom: edgeUsed.text});
    }

    // handle immediate cycles first (node 1 to node 2 and back)
    let immediateCycles = stateGraph.getEdges(id).filter(e => e.dest === edgeUsed.src);
    if (immediateCycles.length > 0) {
      for (let edge of immediateCycles) {
        if (edge.component === constants.ATOM) {
          stateStack.push({atom: edge.text});
        }
        if (stateStack[stateStack.length - 1].end !== edge.dest) {
          stateStack.push({end: edge.dest});
          endIds.push(edge.dest);
        }
      }
    }

    // handle the operations at this node (OR is only non-null case for lastEdge)
    let lastEdge = handleOperations(stateGraph, stateStack, id, endIds, edgeUsed);
    node.visited = true;
    if (lastEdge){ //from OR
      id = lastEdge;
      handleOperations(stateGraph, stateStack, id, endIds, edgeUsed);
      stateGraph.get(id).visited = true;
    }
    // push destinations of stateGraph[id]'s edges
    let nonCycles = stateGraph.getEdges(id).filter(e => e.dest !== edgeUsed.src);
    let dests = [];
    let nextEdges = [];
    for (let edge of nonCycles) {
      dests.push(edge.dest);
      nextEdges.push(edge);
    }
    queue.push(...dests);
    edgeQueue.push(...nextEdges); // push edges
  }
}

function handleOperations(stateGraph, stack, id, endIds, edgeUsed) {
  let lastEdge;
  let ops = stateGraph.getOperators(id);
  // handle THENs first
  if (ops.includes(constants.THEN)) {
    stack.push({[constants.THEN]: id});
  }
  // then handle anything except for ORs
  for (let operation of ops) {
    if (operation !== constants.OR && operation !== constants.THEN) {
      stack.push({[operation]: id});
    }
  }
  // then handle ORs
  for (let operation of ops) {
    if (operation === constants.OR) {
      let temp = traverseOr(stateGraph, stack, id, endIds, edgeUsed);
      if (temp !== undefined && temp !== null) {
        lastEdge = temp;
      }
    }
  }
  return lastEdge;
}

/**
 * The OR operator must be done depth first because you need to get to the end of the path
 * @param stateGraph Edge-based graph representation of design space
 * @param stateStack Equivalent representation of the stateGraph to help with SBOL generation
 * @param id The id to start the traverse from
 * @param endIds List of IDs that mark the end of a path
 * @param edgeUsed the edge used to get to stateGraph[id] (edgeUsed.dest should be id)
 * @returns {*}
 */
function traverseOr(stateGraph, stateStack, id, endIds, edgeUsed) {
  let orStack = [];
  let lastEdge;
  stateStack.push({[constants.OR]: orStack});
  stateGraph.get(id).visited = true;
  let nonCycles = stateGraph.getEdges(id).filter(e => e.dest !== edgeUsed.src);
  nonCycles.forEach(function (edge) {
    let orSubStack = [];
    let temp = traverseOrEdges(stateGraph, stateStack, orSubStack, edge.dest, edge, endIds, edgeUsed);
    if (temp !== undefined && temp !== null) {
      lastEdge = temp;
    }
    if (orSubStack.length !== 0) {
      orStack.push(orSubStack);
    }
  });
  return lastEdge;
}

function traverseOrEdges(stateGraph, stack, subStack, id, edgeUsed, endIds, prevEdgeUsed, moreStartId) {
  let ops = stateGraph.getOperators(id);
  if (stateGraph.get(id).visited) {
    // if the MORE started within the OR, then end it on this stack
    if (id === moreStartId) {
      subStack.push({end: id});
      endIds.push(id);
    } // else end it on the original stack
    else if (ops.includes(constants.ONE_MORE)
      || ops.includes(constants.ZERO_MORE)
      || ops.includes(constants.ZERO_ONE)) {
      if (stack[stack.length - 1].end !== id) {
        stack.push({end: id});
        if (!endIds.includes(id)) {
          endIds.push(id);
        }
      }

    } else if (edgeUsed.type === constants.ATOM) { // in case of zero-or-one
      subStack.push({atom: edgeUsed.text});
    }
    return null;
  }

  if (edgeUsed.type === constants.ATOM) {
    subStack.push({atom: edgeUsed.text});
  }

  if (ops.length === 1 &&
    (ops[0] === constants.ONE_MORE ||
      ops[0] === constants.ZERO_MORE ||
      ops[0] === constants.ZERO_ONE)) {
    moreStartId = id;
  }

  if (edgeUsed.type === constants.EPSILON && ops.includes(constants.THEN)) {
    stateGraph.get(id).visited = false; //reset
    return id; //a 'then' that's not on the atom is not part of the OR
  }

  let lastEdge;
  for (let operation of ops) {
    if (operation === constants.OR){
      lastEdge = traverseOr(stateGraph, subStack, id, endIds, prevEdgeUsed);
    } else {
      subStack.push({[operation]: id});
    }
  }

  stateGraph.get(id).visited = true;
  if (lastEdge) { //from OR
    id = lastEdge;
    handleOperations(stateGraph, subStack, id, endIds, prevEdgeUsed);
  }
  for (let edge of stateGraph.getEdges(id)) {
    lastEdge = traverseOrEdges(stateGraph, stack, subStack, edge.dest, edge, endIds, prevEdgeUsed, moreStartId);
  }
  return lastEdge; //the last node of the OR chain
}

/**
 * Generates SBOL 2.2 representation of a design space using the combinatorial derivation extension
 * @param stateGraph Edge-based graph representation of design space
 * @param categories Categories of biological parts provided by the user
 * @param designName Name of the design space
 * @param numDesigns Maximum number of designs to be enumerated
 * @param maxCycles Max number of iterations through cycles
 * @returns {string} SBOL XML document
 */
function generateCombinatorialSBOL(stateGraph, categories, designName, numDesigns, maxCycles){
  let sbolDoc = new SbolGeneration(designName);

  // traverse stateGraph and mark all as not visited
  //create ComponentDefinition for every atom and add to atomMap
  stateGraph.nodes.forEach(function(id){
    stateGraph.get(id).visited = false;
    for (let edge of stateGraph.getEdges(id)) {
      let atomType = edge.type;
      let atomText = edge.text;
      if (atomType === constants.ATOM && !(atomText in sbolDoc.atomMap)){
        /** @type {Collection} */
        let collection = sbolDoc.makeCollection(atomText);
        sbolDoc.makeAtomComponentDefinition(atomText, Object.keys(categories[atomText]));

        // if no IDs in a role, create member for the role instead
        for (let role in categories[atomText]) {
          if (categories[atomText][role].length === 0) {
            collection.addMember(sbolDoc.makeAtomComponentDefinition(role, [role]));
            if (!sbolDoc.atomMap[atomText].collection){
              sbolDoc.atomMap[atomText].collections = [];
            }
            sbolDoc.atomMap[atomText].collections.push(collection);
            continue;
          }
          for (let id of categories[atomText][role]) {
            collection.addMember(sbolDoc.makeAtomComponentDefinition(id, [role]));
            if (!sbolDoc.atomMap[atomText].collection){
              sbolDoc.atomMap[atomText].collections = [];
            }
            sbolDoc.atomMap[atomText].collections.push(collection);
          }
        }
      }
    }

  });

  //create a stateStack from the stateGraph
  const rootId = stateGraph.root;
  let dummyEdge = {'src': 'dummy',
    'dest': rootId,
    'component': constants.EPSILON,
    'type': constants.EPSILON,
    'text': constants.EPSILON
  };
  let stateStack = [];
  makeStackFromStateGraph(stateGraph, stateStack, rootId, dummyEdge);
  //use stateStack to generate SBOL
  let componentDefStack = [];
  sbolDoc.makeSBOLFromStack(stateStack, componentDefStack);

  // Make root CD and CV
  const rootTemplate = sbolDoc.makeComponentDefinition(designName, false, true);
  const rootCV = sbolDoc.addComponentsAndRestraintsToTemplate(rootTemplate, componentDefStack);

  // add custom attributes to root CV
  // Github README should explain the custom attributes
  rootCV.addStringAnnotation(constants.CONSTELLATION_GIT + constants.DELIMITER + "numDesigns", numDesigns);
  rootCV.addStringAnnotation(constants.CONSTELLATION_GIT + constants.DELIMITER + "maxCycles", maxCycles);

  //clean up
  sbolDoc.sequenceConstraintCount = 1;
  sbolDoc.orRegionCount = 1;
  sbolDoc.cycleRegionCount = 1;
  for (let atom in sbolDoc.atomMap) delete sbolDoc.atomMap[atom];

  return sbolDoc.doc.serializeXML();
}

let sbol = generateCombinatorialSBOL;

module.exports = sbol;
