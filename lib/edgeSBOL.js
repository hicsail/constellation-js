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
  let pMap = stateGraph.pMap;
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
        if (edgeUsed.orientation === constants.INLINE) {
          stateStack.push({[constants.ATOM]: edgeUsed.text, orientation: constants.INLINE_URI});
        } else {
          stateStack.push({[constants.ATOM]: edgeUsed.text, orientation: constants.REV_COMP_URI});
        }
      }
      if (ops.includes(constants.ZERO_MORE) || ops.includes(constants.ONE_MORE)) {
        if (!endIds.includes(id)) {
          stateStack.push({end: id});
          endIds.push(id);
        } else if (!enoughEnds(id, endIds, ops, [constants.ONE_MORE, constants.ZERO_MORE])) {
          stateStack.push({end: id});
          endIds.push(id);
        }
      }
      // check for zero-or-one end (need to check parent's operators)
      if (id in pMap) {
        let ZOParent = parentWithOp(stateGraph, Array.from(pMap[id]), constants.ZERO_ONE);
        if (ZOParent !== null) {
          if (!enoughEnds(ZOParent, endIds, stateGraph.getOperators(ZOParent), [constants.ZERO_ONE])) {
          // if (!endIds.includes(ZOParent)) {
            stateStack.push({end: ZOParent});
            endIds.push(ZOParent);
          }
        }
      }
      continue;
    }
    // if we used an atom to get to stateGraph[id], push atom to stack
    if (edgeUsed.type === constants.ATOM){
      if (edgeUsed.orientation === constants.INLINE) {
        stateStack.push({[constants.ATOM]: edgeUsed.text, orientation: constants.INLINE_URI});
      } else {
        stateStack.push({[constants.ATOM]: edgeUsed.text, orientation: constants.REV_COMP_URI});
      }
    }

    // handle immediate cycles first (node 1 to node 2 and back)
    let immediateCycles = stateGraph.getEdges(id).filter(e => e.dest === edgeUsed.src);
    if (immediateCycles.length > 0) {
      for (let edge of immediateCycles) {
        if (edge.type === constants.ATOM) {
          if (edge.orientation === constants.INLINE) {
            stateStack.push({[constants.ATOM]: edge.text, orientation: constants.INLINE_URI});
          } else {
            stateStack.push({[constants.ATOM]: edge.text, orientation: constants.REV_COMP_URI});
          }
        }
        if (stateStack[stateStack.length - 1].end !== edge.dest) {
          stateStack.push({end: edge.dest});
          endIds.push(edge.dest);
        }
      }
    }

    // handle the operations at this node (OR is only non-null case for lastEdge)
    let lastEdge = handleOperations(stateGraph, stateStack, id, endIds, edgeUsed, pMap);
    node.visited = true;
    if (lastEdge){ //from OR
      id = lastEdge;
      handleOperations(stateGraph, stateStack, id, endIds, edgeUsed, pMap);
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

/**
 * Checks to make sure that there are enough 'end' entries for the number of cycle operators on a node
 * @param id
 * @param endIds
 * @param ops
 * @param opSearchArr
 * @return {boolean}
 */
function enoughEnds(id, endIds, ops, opSearchArr) {
  let numEnds = ops.filter(op => opSearchArr.includes(op)).length;
  let numFound = endIds.filter(i => i === id).length;
  return numEnds === numFound;
}

/**
 * Iterate through operators and add to stack (unless Or)
 * @param stateGraph
 * @param stack
 * @param id
 * @param endIds
 * @param edgeUsed
 * @param pMap
 * @return {*}
 */
function handleOperations(stateGraph, stack, id, endIds, edgeUsed, pMap) {
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
      let temp = traverseOr(stateGraph, stack, id, endIds, edgeUsed, pMap);
      if (temp !== undefined && temp !== null) {
        lastEdge = temp;
      }
    }
  }
  return lastEdge;
}

/**
 * Checks parent nodes to see if any of them have the operator you're looking for
 * (used ofr zero-or-one)
 * @param stateGraph
 * @param parentArr
 * @param op
 * @return {null}
 */
function parentWithOp(stateGraph, parentArr, op) {
  for (let p of parentArr) {
    let parentOps = stateGraph.getOperators(p);
    if (parentOps.includes(op)) {
      return p;
    }
  }
  return null;
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
function traverseOr(stateGraph, stateStack, id, endIds, edgeUsed, pMap) {
  let orStack = [];
  let lastEdge;
  stateStack.push({[constants.OR]: orStack});
  stateGraph.get(id).visited = true;
  let nonCycles = stateGraph.getEdges(id).filter(e => e.dest !== edgeUsed.src);
  nonCycles.forEach(function (edge) {
    let orSubStack = [];
    let temp = traverseOrEdges(stateGraph, stateStack, orSubStack, edge.dest, edge, endIds, edgeUsed, pMap);
    if (temp !== undefined && temp !== null) {
      lastEdge = temp;
    }
    if (orSubStack.length !== 0) {
      orStack.push(orSubStack);
    }
  });
  return lastEdge;
}

function traverseOrEdges(stateGraph, stack, subStack, id, edgeUsed, endIds, prevEdgeUsed, pMap, moreStartId, ZOStart, ZOEnd) {
  let ops = stateGraph.getOperators(id);
  if (stateGraph.get(id).visited) {
    // if the MORE started within the OR, then end it on this stack
    if (id === moreStartId) {
      subStack.push({end: id});
      endIds.push(id);
    } // else end it on the original stack
    else if (ops.includes(constants.ONE_MORE)
      || ops.includes(constants.ZERO_MORE)) {
      if (stack[stack.length - 1].end !== id) {
        stack.push({end: id});
        if (!endIds.includes(id)) {
          endIds.push(id);
        }
      }
    } else if (edgeUsed.type === constants.ATOM) { // in case of zero-or-one
      subStack.push({[constants.ATOM]: edgeUsed.text, orientation: constants.orientation});
    }
    return null;
  }

  if (edgeUsed.type === constants.ATOM) {
    if (edgeUsed.orientation === constants.INLINE) {
      subStack.push({[constants.ATOM]: edgeUsed.text, orientation: constants.INLINE_URI});
    } else {
      subStack.push({[constants.ATOM]: edgeUsed.text, orientation: constants.REV_COMP_URI});
    }
  }

  if (id === ZOEnd) {
    subStack.push({end: ZOStart});
    endIds.push(ZOStart);
  }

  if (ops.length === 1 &&
    (ops[0] === constants.ONE_MORE ||
      ops[0] === constants.ZERO_MORE)) {
    moreStartId = id;
  }

  if (ops.includes(constants.ZERO_ONE)) {
    let epsEdges = stateGraph.getEdges(id).filter(e => e.component === constants.EPSILON);
    if (epsEdges.length === 1) {
      ZOEnd = epsEdges[0].dest;
      ZOStart = id;
    }
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
    handleOperations(stateGraph, subStack, id, endIds, prevEdgeUsed, pMap);
  }
  for (let edge of stateGraph.getEdges(id)) {
    lastEdge = traverseOrEdges(stateGraph, stack, subStack, edge.dest, edge, endIds, prevEdgeUsed, pMap, moreStartId, ZOStart, ZOEnd);
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
        // add atom to atomMap
        if (!sbolDoc.atomMap[atomText]) {
          sbolDoc.atomMap[atomText] = {};
        }
        /** @type {Collection} */
        let collection = sbolDoc.makeCollection(atomText);
        // if no IDs in a role, create member for the role instead
        for (let role in categories[atomText]) {
          // if abstract part
          if (categories[atomText][role].length === 0) {
            let abstractCD = sbolDoc.makeAtomComponentDefinition(role, [role], true);
            collection.addMember(abstractCD);
            if (!sbolDoc.atomMap[atomText].collections){
              sbolDoc.atomMap[atomText].collections = [];
            }
            sbolDoc.atomMap[atomText].abstract = true;
            // for abstract parts, store the CD in the atom map to reference later
            sbolDoc.atomMap[atomText].compDef = abstractCD;
            continue;
          }
          // if not abstract part
          for (let id of categories[atomText][role]) {
            collection.addMember(sbolDoc.makeAtomComponentDefinition(id, [role]));
            if (!sbolDoc.atomMap[atomText].collections){
              sbolDoc.atomMap[atomText].collections = [];
            }
          }
          sbolDoc.atomMap[atomText].abstract = false;
        }
        sbolDoc.atomMap[atomText].collections.push(collection);
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
  const rootTemplate = sbolDoc.makeComponentDefinition(designName, [], false, true);
  const rootCV = sbolDoc.addComponentsAndRestraintsToTemplate(rootTemplate, componentDefStack, null, designName, true);

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
