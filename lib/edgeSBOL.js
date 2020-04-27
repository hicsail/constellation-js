const constants = require('./constants');
SBOLDocument = require('sboljs');

let sequenceConstraintCount = 1;
let orRegionCount = 1;
let cycleRegionCount = 1;
let atomMap = {}; // {atomText: componentDefinition, collections}
let DESIGN_NAME = '';


const OPERATOR_URIS = {
    [constants.ZERO_MORE]: 'http://sbols.org/v2#zeroOrMore',
    [constants.ONE]: 'http://sbols.org/v2#one',
    [constants.ONE_MORE]: 'http://sbols.org/v2#oneOrMore',
    [constants.ZERO_ONE]: 'http://sbols.org/v2#zeroOrOne',
};


/****************
 * HELPERS
 ****************/

/**
 * Collapses the stack when there is only one atom inside a MORE
 * @param stack
 */
function collapseStack(stack){
  for(let i=0; i<stack.length; i++){
    let key = Object.keys(stack[i])[0];
    if (key ===constants.THEN){
      stack.splice(i,1); //remove THENs
    }
  }
  if(stack.length > 2){
    for(let i=0; i<stack.length-2; i++){
      let key = Object.keys(stack[i])[0];
      if (key === constants.ONE_MORE || key === constants.ZERO_MORE || key === constants.ZERO_ONE){
        if (Object.keys(stack[i+1])[0] === constants.ATOM && Object.keys(stack[i+2])[0] === 'end'){
          stack[i][key] = [stack[i+1].atom];
          stack.splice(i+1,1);
          stack.splice(i+1,1);
        }
      }
    }
  }
}

function addToStacks(doc, stacks, name, operator, variantDerivations, collections){
  if (!collections){
    collections = [];
    if (atomMap[name]){
      collections = atomMap[name].collections;
    }
  }
  const componentDefinition = makeComponentDefinition(doc, name);
  if (stacks.templates.length > 0){
    // if there's already a template on the stack, then add component to the template
    const lastTemplate = stacks.templates[stacks.templates.length-1].template;
    const component = makeComponent(doc, componentDefinition, lastTemplate);
    lastTemplate.addComponent(component);
    stacks.variantComponents.push(createVariantComponentObj(operator, component, variantDerivations, collections));
  } else{
    // else, this is a new componentDef for the root
    stacks.componentDefs.push(createComponentDefObj(operator, componentDefinition, variantDerivations, collections));
  }
}

function addComponentsAndRestraintsToTemplate(doc, templateCD, stack, cv){
  if (!cv){
    cv = makeCombinatorialDerivation(doc, templateCD);
  }
  let subject;
  let object;

  for(let stackObj of stack){
    let component = stackObj.component;
    if(!component){
      component = makeComponent(doc, stackObj.componentDef, templateCD);
      templateCD.addComponent(component);
    }

    const variableComponent = makeVariableComponent(doc, cv.persistentIdentity, component, stackObj.operator,
      stackObj.variantDVs, stackObj.collections);
    cv.addVariableComponent(variableComponent);

    object = component;
    if (subject && object){
      const sequenceConstraint = makeSequenceConstraint(doc, templateCD, subject, object);
      templateCD.addSequenceConstraint(sequenceConstraint);
    }
    subject = object;
  }
  return cv;
}

function createVariantComponentObj(operator, component, variantDVs, collections){
  return {
    operator: operator,
    component: component,
    variantDVs: variantDVs,
    collections: collections
  }
}

function createComponentDefObj(operator, componentDef, variantDVs, collections){
  return {
    operator: operator,
    componentDef: componentDef,
    variantDVs: variantDVs,
    collections: collections
  }
}

function createTemplateObj(operator, template, combDV, id){
  return {
    operator: operator,
    template: template, //component definition
    combDV: combDV, //combinatorial derivation
    id: id
  }
}

/****************
 * SBOL HELPERS
 ****************/

/**
 *
 * @param doc {SBOLDocument}
 * @param name key in categories
 */
function makeCollection(doc, name){
  const persistentId = constants.CONSTELLATION_URL + constants.DELIMITER + name + constants.COLLECTION + constants.DELIMITER + name;
  const collection = doc.collection(persistentId + constants.DELIMITER + constants.VERSION);
  collection.displayId = name;
  collection.persistentIdentity = persistentId;
  collection.version = constants.VERSION;

  return collection;
}

function makeCombinatorialDerivation(doc, templateComponentDefinition){
  const displayId = templateComponentDefinition.displayId + constants.COMBINATORIAL;
  const persistentId = templateComponentDefinition.persistentIdentity + constants.DELIMITER + displayId;
  const combinatorialDerivation = doc.combinatorialDerivation(persistentId + constants.DELIMITER + constants.VERSION);
  combinatorialDerivation.template = templateComponentDefinition;
  combinatorialDerivation.displayId = displayId;
  combinatorialDerivation.persistentIdentity = persistentId;
  combinatorialDerivation.version = constants.VERSION;

  return combinatorialDerivation;
}

/*
temporary function so that atoms/variants are consistent
TODO remove after we can fetch from SBH
*/
function makeAtomComponentDefinition(doc, name, roles){
  /* code for using SBH URIs for persistentIDs instead of creating new ones:
  // let persistentId;
  // let match = name.match(/^[A-Za-z]\\w*$/);
  // if (match === name) {
  //   atomMap[name] = {};
  //   atomMap[name].componentDefinition = name;
  //   return name;
  // }
   */
  const prefix = constants.CONSTELLATION_URL + constants.DELIMITER + 'generic_definition/';
  const persistentId = prefix + name;
  const componentDefinition = doc.componentDefinition(persistentId + constants.DELIMITER + constants.VERSION);
  componentDefinition.displayId = name;
  componentDefinition.persistentIdentity = persistentId;
  componentDefinition.version = constants.VERSION;
  for (let role of roles) {
    const sbolROLE = SBOLDocument.terms[role]; //clarifies the potential function of the entity
    if (sbolROLE){
      componentDefinition.addRole(sbolROLE);
    } else {
      componentDefinition.addRole(SBOLDocument.terms.engineeredRegion);
    }
  }
  componentDefinition.addType(SBOLDocument.terms.dnaRegion); //specifies the category of biochemical or physical entity

  //add to atomMap
  atomMap[name] = {};
  atomMap[name].componentDefinition = componentDefinition;
  return componentDefinition;
}

function makeComponentDefinition(doc, name, makeTemplate, makeRoot){
  if(name in atomMap && !makeTemplate && !makeRoot){
    return atomMap[name].componentDefinition;
  }

  const PREFIX = constants.CONSTELLATION_URL + constants.DELIMITER + DESIGN_NAME + constants.DELIMITER;
  const ROOT_PREFIX = PREFIX + 'root_template' + constants.DELIMITER;
  const TEMPLATE_PREFIX = PREFIX + constants.TEMPLATE + constants.DELIMITER;

  let displayId =  name;
  const prefix = makeRoot? ROOT_PREFIX: makeTemplate? TEMPLATE_PREFIX : PREFIX;
  const persistentId = prefix + displayId;
  const componentDefinition = doc.componentDefinition(persistentId + constants.DELIMITER + constants.VERSION);
  componentDefinition.displayId = displayId;
  componentDefinition.persistentIdentity = persistentId;
  componentDefinition.version = constants.VERSION;
  const role = SBOLDocument.terms[name];
  if (role){
    componentDefinition.addRole(role);
  }
  componentDefinition.addType(SBOLDocument.terms.engineeredRegion);

  //add to atomMap
  if(!makeTemplate && !makeRoot){
    atomMap[name] = {};
    atomMap[name].componentDefinition = componentDefinition;
  }
  return componentDefinition;
}

function makeComponent(doc, componentDefinition, template){
  let num = 1;
  // make name unique if component is already in the template
  for (let comp of template.components){
    if (comp.definition.uri === componentDefinition.uri){
      num = Number.parseInt(comp.displayId[comp.displayId.length -1], 10) + 1;
    }
  }

  const displayId = componentDefinition.displayId + constants.COMPONENT + num;
  const persistentId =  template.persistentIdentity + constants.DELIMITER + displayId;
  const atomComponent = doc.component(persistentId + constants.DELIMITER + constants.VERSION);
  atomComponent.displayId = displayId;
  atomComponent.persistentIdentity = persistentId;
  atomComponent.version = constants.VERSION;
  atomComponent.definition = componentDefinition;
  return atomComponent;
}

function makeVariableComponent(doc, templateId, component, operator, variantDerivations, collections){
  let displayId = component.displayId + constants.VARIABLE;
  const persistentId = templateId + constants.DELIMITER + displayId;
  const variableComponent = doc.variableComponent(persistentId + constants.DELIMITER + constants.VERSION);
  variableComponent.displayId = displayId;
  variableComponent.persistentIdentity = persistentId;
  variableComponent.version = constants.VERSION;
  variableComponent.variable = component;
  variableComponent.operator = OPERATOR_URIS[operator];

  if(collections){
    collections.forEach(function(collection) {
      variableComponent.addVariantCollection(collection);
    });
  }

  if(variantDerivations){
    variantDerivations.forEach(function(vd) {
      variableComponent.addVariantDerivation(vd);
    });
  }

  return variableComponent;
}

function makeSequenceConstraint(doc, templateCD, subject, object){
  //subject precedes object
  let displayId = templateCD.displayId + constants.SEQUENCE_CONSTRAINT + sequenceConstraintCount;
  const persistentId =  templateCD.persistentIdentity + constants.DELIMITER + displayId;
  const sequenceConstraint = doc.sequenceConstraint(persistentId + constants.DELIMITER + constants.VERSION);
  sequenceConstraint.displayId = displayId;
  sequenceConstraint.persistentIdentity = persistentId;
  sequenceConstraint.version = constants.VERSION;
  sequenceConstraint.subject = subject;
  sequenceConstraint.object = object;
  sequenceConstraint.restriction = constants.SEQUENCE_CONSTRAINT_URIS.PRECEDE;
  sequenceConstraintCount += 1;

  return sequenceConstraint
}

/**
 * breadth width search of the state graph
 * to create a structure that is better for SBOL generation
 * @param stateGraph constellation graph for visualization
 * @param stateStack structure that SBOL is generated from
 * @param id the id to start the traverse from
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
 * The OR operator must be done depth first
 **/
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
 * Traverse the stack to make the SBOL
 * @param doc SBOL doc
 * @param stateStack custom stack generated from Constellation state graph
 * @param componentDefStack Component Definitions returned to one level above
 */
function makeSBOLFromStack(doc, stateStack, componentDefStack){
  let stacks = {};
  stacks.templates = [];
  stacks.variantComponents = [];
  stacks.componentDefs = componentDefStack;
  collapseStack(stateStack);

  stateStack.forEach(function(stackObj){
    const key = Object.keys(stackObj)[0];
    switch (key) {
      case constants.ATOM:
        addToStacks(doc, stacks, stackObj[key], 'one', null, null);
        break;
      case constants.OR:
        let orIdentity = constants.ORREGION + orRegionCount;
        orRegionCount += 1;
        let variantDerivations = [];
        let orCollections = [];
        addToStacks(doc, stacks, orIdentity, 'one', variantDerivations, orCollections);

        let orSubRegionCount = 1;
        for (let orRegion of stackObj[key]){
          let orStack = [];
          makeSBOLFromStack(doc, orRegion, orStack);
          if (orStack.length === 1 && orStack[0].operator === 'one'){
            orCollections.push(...orStack[0].collections);
          } else {
            let orSubIdentity = orIdentity + constants.ORSUBREGION + orSubRegionCount;
            orSubRegionCount += 1;
            const orTemplate = makeComponentDefinition(doc, orSubIdentity, true);
            const cv = addComponentsAndRestraintsToTemplate(doc, orTemplate, orStack);
            variantDerivations.push(cv);
          }
        }
        break;
      case constants.ONE_MORE: //fall through
      case constants.ZERO_MORE:
      case constants.ZERO_ONE:
        // only one atom within the -or-more operator
        if (Array.isArray(stackObj[key])){
          addToStacks(doc, stacks, stackObj[key][0], key, null, null);
        } else{
          let identity = constants.CYCLEREGION + cycleRegionCount;
          cycleRegionCount += 1;
          const templateCD = makeComponentDefinition(doc, identity, true);
          const cv = makeCombinatorialDerivation(doc, templateCD);
          addToStacks(doc, stacks, identity, key, [cv], null);
          stacks.templates.push(createTemplateObj(key, templateCD, cv, stackObj[key]));
        }
        break;
      case 'end':
        // remove the last template
        const index = stacks.templates.indexOf(template => template.id === stackObj[key]);
        const templateObj = stacks.templates.splice(index, 1)[0];
        const cv = templateObj.combDV;

        // get length of components under the CD and pop
        // the same number from the temp VariantComponent stack
        const lengthOfComponents = templateObj.template._components.length;
        let componentsStack = stacks.variantComponents.splice(stacks.variantComponents.length-lengthOfComponents, lengthOfComponents);
        addComponentsAndRestraintsToTemplate(doc, templateObj.template, componentsStack, cv);
        break;
    }
  });
}


function generateCombinatorialSBOL(stateGraph, categories, designName, numDesigns, maxCycles){
  const doc = new SBOLDocument();
  DESIGN_NAME = designName;

  // traverse stateGraph and mark all as not visited
  //create ComponentDefinition for every atom and add to atomMap
  stateGraph.nodes.forEach(function(id){
    stateGraph.get(id).visited = false;
    for (let edge of stateGraph.getEdges(id)) {
      let atomType = edge.type;
      let atomText = edge.text;
      if (atomType === constants.ATOM && !(atomText in atomMap)){
        /** @type {Collection} */
        let collection = makeCollection(doc, atomText);
        makeAtomComponentDefinition(doc, atomText, Object.keys(categories[atomText]));

        for (let role in categories[atomText]) {
          for (let id of categories[atomText][role]) {
            collection.addMember(makeAtomComponentDefinition(doc, id, [role]));
            if (!atomMap[atomText].collection){
              atomMap[atomText].collections = [];
            }
            atomMap[atomText].collections.push(collection);
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
  makeSBOLFromStack(doc, stateStack, componentDefStack);

  // Make root CD and CV
  const rootTemplate = makeComponentDefinition(doc, designName, false, true);
  const rootCV = addComponentsAndRestraintsToTemplate(doc, rootTemplate, componentDefStack);

  // add custom attributes to root CV
  // Github README should explain the custom attributes
  rootCV.addStringAnnotation(constants.CONSTELLATION_GIT + constants.DELIMITER + "numDesigns", numDesigns);
  rootCV.addStringAnnotation(constants.CONSTELLATION_GIT + constants.DELIMITER + "maxCycles", maxCycles);

  //clean up
  sequenceConstraintCount = 1;
  orRegionCount = 1;
  cycleRegionCount = 1;
  for (let atom in atomMap) delete atomMap[atom];

  return doc.serializeXML();
}

let sbol = generateCombinatorialSBOL;

module.exports = sbol;