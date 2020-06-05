const constants = require('./constants');
SbolGeneration = require('./sbol');

/**
 * Breadth width search of the state graph to create a structure that is better for SBOL generation
 * @param stateGraph Node-based graph representation of design space
 * @param stateStack Equivalent representation of the stateGraph to help with SBOL generation
 * @param id The id to start the traverse from
 */
function makeStackFromStateGraph(stateGraph, stateStack, id){
  let endIds = []; //prevent redundant ends
  let queue = [];
  queue.push(id);
  while (queue.length !== 0){
    let id = queue.shift();
    let node = stateGraph.get(id);

    if (node.visited) {
      if (node.type !== constants.ATOM
        && !endIds.includes(id)) {
        stateStack.push({end: id});
        endIds.push(id);
      }
      continue;
    }

    if (node.type === constants.ACCEPT) {
      continue;
    }
    if (node.type === constants.ATOM) {
      stateStack.push({atom: node.text});
    }

    // handle immediate cycles first (node 1 to node 2 and back)
    let immediateCycles = stateGraph.getEdges(id).filter(e => stateGraph.get(e).visited);
    for (let edgeID of immediateCycles) {
      if (!endIds.includes(edgeID)) {
        stateStack.push({end: edgeID});
        endIds.push(edgeID);
      }
    }

    let lastEdge = handleOperations(stateGraph, stateStack, id, endIds);
    node.visited = true;
    if (lastEdge){ //from OR
      id = lastEdge;
      handleOperations(stateGraph, stateStack, id, endIds);
    }
    queue.push(...stateGraph.getEdges(id));
  }
}

function handleOperations(stateGraph, stack, id, endIds){
  let lastEdge;
  for (let operation of stateGraph.getOperators(id)){
    if (operation === constants.OR){
      lastEdge = traverseOr(stateGraph, stack, id, endIds);
    } else {
      stack.push({[operation]: id});
    }
  }
  return lastEdge;
}

/**
 * The OR operator must be done depth first because you need to get to the end of the path
 * @param stateGraph Node-based graph representation of design space
 * @param stateStack Equivalent representation of the stateGraph to help with SBOL generation
 * @param id The id to start the traverse from
 * @param endIds List of IDs that mark the end of a path
 * @returns {*}
 */
function traverseOr(stateGraph, stateStack, id, endIds){
  let orStack = [];
  let lastEdge;
  stateStack.push({[constants.OR]: orStack});
  stateGraph.get(id).visited = true;
  stateGraph.getEdges(id).forEach(function (edge){
    let orSubStack = [];
    lastEdge = traverseOrEdges(stateGraph, stateStack, orSubStack, edge, endIds);
    if (orSubStack.length !== 0) {
      orStack.push(orSubStack);
    }
  });
  return lastEdge;
}

function traverseOrEdges(stateGraph, stack, subStack, id, endIds, moreStartId){
  let node = stateGraph.get(id);
  let ops = stateGraph.getOperators(id);

  if (node.visited && endIds.includes(id)){
    return null;
  }

  if (node.visited){
    // if the MORE started within the OR, then end it on this stack
    if (id === moreStartId){
      subStack.push({end: id});
      endIds.push(id);
    } // else end it on the original stack
    else if (ops.includes(constants.ONE_MORE)
      || ops.includes(constants.ZERO_MORE)
      || ops.includes(constants.ZERO_ONE)){
      stack.push({end: id});
      endIds.push(id);
    }
    return null;
  }

  if (node.type === constants.ACCEPT){
    return null;
  }
  if (node.type === constants.ATOM){
    subStack.push({atom: node.text});
  }

  if (ops.length === 1 &&
    (ops[0] === constants.ONE_MORE ||
      ops[0] === constants.ZERO_MORE ||
      ops[0] === constants.ZERO_ONE)){
    moreStartId = id;
  }

  let lastEdge;
  for (let operation of ops){
    if (node.type === constants.EPSILON
      && operation === constants.THEN){
      node.visited = false; //reset
      return id; //a 'then' that's not on the atom is not part of the OR
    }
    if (operation === constants.OR){
      lastEdge = traverseOr(stateGraph, subStack, id, endIds);
    } else {
      subStack.push({[operation]: id});
    }
  }

  node.visited = true;
  if (lastEdge){ //from OR
    id = lastEdge;
    handleOperations(stateGraph, subStack, id, endIds);
  }
  for (let edge of stateGraph.getEdges(id)){
    lastEdge = traverseOrEdges(stateGraph, stack, subStack, edge, endIds, moreStartId);
  }
  return lastEdge; //the last node of the OR chain
}

/**
 * Generates SBOL 2.2 representation of a design space using the combinatorial derivation extension
 * @param stateGraph Node-based graph representation of design space
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
    let currentNode = stateGraph.get(id);
    currentNode.visited = false;
    let atomType = currentNode.type;
    let atomText = currentNode.text;
    if (atomType === constants.ATOM && !(atomText in sbolDoc.atomMap)){
      /** @type {Collection} */
      let collection = sbolDoc.makeCollection(atomText);
      for (let role in categories[atomText]) {
        // if no IDs in a role, create member for the role instead (abstract)
        if (categories[atomText][role].length === 0) {
          collection.addMember(sbolDoc.makeAtomComponentDefinition(role, [role], true));
          if (!sbolDoc.atomMap[atomText]) {
            sbolDoc.atomMap[atomText] = {};
          }
          if (!sbolDoc.atomMap[atomText].collection){
            sbolDoc.atomMap[atomText].collections = [];
          }
          sbolDoc.atomMap[atomText].collections.push(collection);
          continue;
        }
        // if not abstract
        for (let id of categories[atomText][role]) {
          collection.addMember(sbolDoc.makeAtomComponentDefinition(id, [role]));
          if (!sbolDoc.atomMap[atomText]) {
            sbolDoc.atomMap[atomText] = {};
          }
          if (!sbolDoc.atomMap[atomText].collection){
            sbolDoc.atomMap[atomText].collections = [];
          }
          sbolDoc.atomMap[atomText].collections.push(collection);
        }
      }
    }
  });

  //create a stateStack from the stateGraph
  const rootId = stateGraph.root;
  let stateStack = [];
  makeStackFromStateGraph(stateGraph, stateStack, rootId);

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
