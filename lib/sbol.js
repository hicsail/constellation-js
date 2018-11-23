if (typeof window === 'undefined') {
  SBOLDocument = require('sboljs');
  graph = require('./graph');
}

let sequenceConstraintCount = 1;
let orRegionCount = 1;
let cycleRegionCount = 1;
let atomMap = {}; // {atomText: componentDefinition, variants[]}
let DESIGN_NAME = '';

const VERSION = '1';
const DELIMITER = '/';
const TEMPLATE = 'combinatorial_template';
const COMBINATORIAL = '_combinatorial_derivation';
const SEQUENCE_CONSTRAINT = '_sequence_constraint';
const COMPONENT = '_component';
const VARIABLE = '_variable';
const ORREGION = 'or_unit';
const ORSUBREGION = '_or_subunit';
const CYCLEREGION = 'cyclical_unit';

const OPERATOR_URIS = {
  [graph.ZERO_SBOL]: 'http://sbols.org/v2#zeroOrMore',
  one: 'http://sbols.org/v2#one',
  [graph.ONE_MORE]: 'http://sbols.org/v2#oneOrMore'
};

const SEQUENCE_CONSTRAINT_URIS = {
  PRECEDE: 'http://sbols.org/v2#precedes',
  SAMEORIENTATION: 'http://sbols.org/v2#sameOrientationAs',
  OPPOSITEORIENTATION: 'http://sbols.org/v2#oppositeOrientationAs',
  DIFFERENT: 'http://sbols.org/v2#differentFrom'
};


/****************
 * HELPERS
 ****************/
function getRootId(stateGraph){
  for (let id in stateGraph) {
    if (stateGraph[id].type === graph.ROOT){
      return id;
    }
  }
}

/**
 * Collapses the stack when there is only one atom inside a MORE
 * @param stack
 */
function collapseStack(stack){
  if(stack.length > 2){
    for(let i=0; i<stack.length; i++){
      let moreKey = Object.keys(stack[i])[0];
      if (moreKey === graph.ONE_MORE || moreKey === graph.ZERO_SBOL){
        if (Object.keys(stack[i+1])[0] === graph.ATOM && Object.keys(stack[i+2])[0] === 'end'){
          stack[i][moreKey] = [stack[i+1].atom];
          stack.splice(i+1,1);
          stack.splice(i+1,1);
        }
      }
    }
  }
}

function addToStacks(doc, stacks, name, operator, variantDerivations, variants){
  if (!variants){
    variants = [];
    if (atomMap[name]){
      variants = atomMap[name].variants;
    }
  }

  const componentDefinition = makeComponentDefinition(doc, name);
  if (stacks.templates.length > 0){
    // if there's already a template on the stack, then add component to the template
    const lastTemplate = stacks.templates[stacks.templates.length-1].template;
    const component = makeComponent(doc, componentDefinition, lastTemplate.persistentIdentity);
    lastTemplate.addComponent(component);
    stacks.variantComponents.push(createVariantComponentObj(operator, component, variantDerivations, variants));
  }else{
    // else, this is a new componentDef for the root
    stacks.componentDefs.push(createComponentDefObj(operator, componentDefinition, variantDerivations, variants));
  }
}

function addComponentsAndRestraintsToTemplate(doc, templateCD, componentDefStack){
  const cv = makeCombinatorialDerivation(doc, templateCD);
  let subject;
  let object;

  for(let componentDefObj of componentDefStack){
    const component = makeComponent(doc, componentDefObj.componentDef, templateCD.persistentIdentity);
    const variableComponent = makeVariableComponent(doc, cv.persistentIdentity, component, componentDefObj.operator,
                                                    componentDefObj.variantDVs, componentDefObj.variants);
    templateCD.addComponent(component);
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

function createVariantComponentObj(operator, component, variantDVs, variants){
  return {
    operator: operator,
    component: component,
    variantDVs: variantDVs,
    variants: variants
  }
}

function createComponentDefObj(operator, componentDef, variantDVs, variants){
  return {
    operator: operator,
    componentDef: componentDef,
    variantDVs: variantDVs,
    variants: variants
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
function makeCombinatorialDerivation(doc, templateComponentDefinition){
  const displayId = templateComponentDefinition.displayId + COMBINATORIAL;
  const persistentId = templateComponentDefinition.persistentIdentity + DELIMITER + displayId;
  const combinatorialDerivation = doc.combinatorialDerivation(persistentId + DELIMITER + VERSION);
  combinatorialDerivation.template = templateComponentDefinition;
  combinatorialDerivation.displayId = displayId;
  combinatorialDerivation.persistentIdentity = persistentId;
  combinatorialDerivation.version = VERSION;

  return combinatorialDerivation;
}

/*
temporary function so that atoms/variants are consistent
TODO remove after we can fetch from SBH
*/
function makeAtomComponentDefinition(doc, name){
  const prefix = 'http://constellationcad.org/generic_definition/';
  const persistentId = prefix + name;
  const componentDefinition = doc.componentDefinition(persistentId + DELIMITER + VERSION);
  componentDefinition.displayId = name;
  componentDefinition.persistentIdentity = persistentId;
  componentDefinition.version = VERSION;
  const role = SBOLDocument.terms[name];
  if (role){
    componentDefinition.addRole(role);
  }
  componentDefinition.addType(SBOLDocument.terms.engineeredRegion);

  //add to atomMap
  atomMap[name] = {};
  atomMap[name].componentDefinition = componentDefinition;
  return componentDefinition;
}

function makeComponentDefinition(doc, name, makeTemplate, makeRoot){
  if(name in atomMap && !makeTemplate && !makeRoot){
    return atomMap[name].componentDefinition;
  }

  const PREFIX = 'http://constellationcad.org' + DELIMITER + DESIGN_NAME + DELIMITER;
  const ROOT_PREFIX = PREFIX + 'root_template' + DELIMITER;
  const TEMPLATE_PREFIX = PREFIX + TEMPLATE + DELIMITER;

  let displayId =  name;
  const prefix = makeRoot? ROOT_PREFIX: makeTemplate? TEMPLATE_PREFIX : PREFIX;
  const persistentId = prefix + displayId;
  const componentDefinition = doc.componentDefinition(persistentId + DELIMITER + VERSION);
  componentDefinition.displayId = displayId;
  componentDefinition.persistentIdentity = persistentId;
  componentDefinition.version = VERSION;
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

function makeComponent(doc, componentDefinition, templateId){
  const displayId = componentDefinition.displayId + COMPONENT;
  const persistentId =  templateId + DELIMITER + displayId;
  const atomComponent = doc.component(persistentId + DELIMITER + VERSION);
  atomComponent.displayId = displayId;
  atomComponent.persistentIdentity = persistentId;
  atomComponent.version = VERSION;
  atomComponent.definition = componentDefinition;
  return atomComponent;
}

function makeVariableComponent(doc, templateId, component, operator, variantDerivations, variants){
  let displayId = component.displayId + VARIABLE;
  const persistentId = templateId + DELIMITER + displayId;
  const variableComponent = doc.variableComponent(persistentId + DELIMITER + VERSION);
  variableComponent.displayId = displayId;
  variableComponent.persistentIdentity = persistentId;
  variableComponent.version = VERSION;
  variableComponent.variable = component;
  variableComponent.operator = OPERATOR_URIS[operator];

  if(variants){
    variants.forEach(function(vt) {
      variableComponent.addVariant(atomMap[vt].componentDefinition);
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
  let displayId = templateCD.displayId + SEQUENCE_CONSTRAINT + sequenceConstraintCount;
  const persistentId =  templateCD.persistentIdentity + DELIMITER + displayId;
  const sequenceConstraint = doc.sequenceConstraint(persistentId + DELIMITER + VERSION);
  sequenceConstraint.displayId = displayId;
  sequenceConstraint.persistentIdentity = persistentId;
  sequenceConstraint.version = VERSION;
  sequenceConstraint.subject = subject;
  sequenceConstraint.object = object;
  sequenceConstraint.restriction = SEQUENCE_CONSTRAINT_URIS.PRECEDE;
  sequenceConstraintCount += 1;

  return sequenceConstraint
}




/**
 * breadth width search of the state graph
 * to create a structure that is better for SBOL generation
 * @param stateGraph constellation graph for visualization
 * @param stack structure that SBOL is generated from
 * @param id the id to start the traverse from
 */
function makeStackFromStateGraph(stateGraph, stack, id){
  let endIds = []; //prevent redundant ends
  let queue = [];
  queue.push(id);
  stateGraph[id].visited = true;

  while (queue.length !== 0){
    let id = queue.shift();
    let lastEdge = '';
    stateGraph[id].operator.forEach(function (operation){
      if (operation === graph.OR){
        let orStack = [];
        stack.push({[operation]: orStack});
        // get all edges of the OR first
        stateGraph[id].edges.forEach(function (edge){
          let tempStack = [];
          lastEdge = traverseOr(stack, tempStack, stateGraph, edge, endIds);
          orStack.push(tempStack);
        });
      } else {
        stack.push({[operation]: id});
      }
    });

    if (lastEdge){ //from OR
      stateGraph[lastEdge].operator.forEach(function (operation){
        stack.push({[operation]: lastEdge});
      });
      id = lastEdge;
    }
    stateGraph[id].edges.forEach(function (edge){
      // the 'then' needs to be after the the previous operator ends
      let thenObj;
      if (stateGraph[edge].visited){
        if (stateGraph[edge].type !== graph.ATOM){
          if (Object.keys(stack[stack.length-1])[0] === graph.THEN){
            thenObj = stack.pop();
          }
          if (!endIds.includes(edge)){
            stack.push({end: edge});
            endIds.push(edge);
          }
          if (thenObj){
            stack.push(thenObj);
            thenObj = null;
          }
        }
      }
      else{
        if (stateGraph[edge].type !== graph.ACCEPT){
          queue.push(edge);
          stateGraph[edge].visited = true;
          if (stateGraph[edge].type === graph.ATOM){
            stack.push({atom: stateGraph[edge].text});
          }
        }
      }
    });
  }
}

/**
 * The OR operator must be done depth first
 * @param stack the original stack
 * @param tempStack the stack within the or
 * @param stateGraph
 * @param id the edge that the traverse starts from
 * @param endIds cycles create redundant ends for the stack, this prevents that
 * @param moreStartId for MORE operators within the OR
 * @returns {*}
 */
function traverseOr(stack, tempStack, stateGraph, id, endIds, moreStartId){
  let lastEdge;
  stateGraph[id].visited = true;

  if (stateGraph[id].operator.length === 1 &&
    (stateGraph[id].operator[0] === graph.ONE_MORE ||
      stateGraph[id].operator[0] === graph.ZERO_SBOL)){
    moreStartId = id;
  }

  if (stateGraph[id].type === graph.ATOM){
    tempStack.push({atom: stateGraph[id].text});
    for (let operation of stateGraph[id].operator){
      if (operation === graph.OR){
        let orStack = [];
        tempStack.push({[operation]: orStack});
        // get all edges of the OR first
        stateGraph[id].edges.forEach(function (edge){
          let tempStackX = [];
          lastEdge = traverseOr(tempStack, tempStackX, stateGraph, edge, endIds);
          orStack.push(tempStackX);
        });
      } else {
        tempStack.push({[operation]: id});
      }
    }
  }
  else{
    for (let operation of stateGraph[id].operator){
      if (operation === graph.THEN){
        stateGraph[id].visited = false; //reset
        return id; //a 'then' that's not on the atom is not part of the OR
      }
      if (operation === graph.OR){
        let orStack = [];
        tempStack.push({[operation]: orStack});
        // get all edges of the OR first
        stateGraph[id].edges.forEach(function (edge){
          let tempStackX = [];
          lastEdge = traverseOr(tempStack, tempStackX, stateGraph, edge, endIds);
          orStack.push(tempStackX);
        });
      }
      else {
        tempStack.push({[operation]: id});
      }
    }
  }

  if (lastEdge){ //from OR
    stateGraph[lastEdge].operator.forEach(function (operation){
      tempStack.push({[operation]: lastEdge});
    });
    id = lastEdge;
  }
  for (let edge of stateGraph[id].edges){
    if (stateGraph[edge].type === graph.ACCEPT){
      continue;
    }

    if (stateGraph[edge].visited){
      // if the MORE started within the OR, then end it on the tempStack
      // else end it on the original stack

      if (edge === moreStartId){
        if (!endIds.includes(edge)){
          tempStack.push({end: edge});
          endIds.push(edge);
        }
      }
      else if (stateGraph[edge].operator.includes(graph.ONE_MORE)
        || stateGraph[edge].operator.includes(graph.ZERO_SBOL)){
        if (!endIds.includes(edge)){
          stack.push({end: edge});
          endIds.push(edge);
        }
      }
      continue;
    }
    lastEdge = traverseOr(stack, tempStack, stateGraph, edge, endIds, moreStartId);
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
  console.log(JSON.stringify(stateStack, null, 2));

  stateStack.forEach(function(stackObj){
    const key = Object.keys(stackObj)[0];
    switch (key) {
      case graph.ATOM:
        addToStacks(doc, stacks, stackObj[key], 'one', null, null);
        break;
      case graph.OR:
        let orIdentity = ORREGION + orRegionCount;
        orRegionCount += 1;
        let variantDerivations = [];
        let orVariants = [];
        addToStacks(doc, stacks, orIdentity, 'one', variantDerivations, orVariants);

        let orSubRegionCount = 1;
        for (let orRegion of stackObj[key]){
          let orStack = [];
          makeSBOLFromStack(doc, orRegion, orStack);
          if (orStack.length === 1 && orStack[0].operator === 'one'){
            orVariants.push(...orStack[0].variants);
          } else {
            let orSubIdentity = orIdentity + ORSUBREGION + orSubRegionCount;
            orSubRegionCount += 1;
            const orTemplate = makeComponentDefinition(doc, orSubIdentity, true);
            const cv = addComponentsAndRestraintsToTemplate(doc, orTemplate, orStack);
            variantDerivations.push(cv);
          }
        }
        break;
      case graph.ONE_MORE: //fall through
      case graph.ZERO_SBOL:
        // only one atom within the -or-more operator
        if (Array.isArray(stackObj[key])){
          addToStacks(doc, stacks, stackObj[key][0], key, null, null);
        } else{
          let identity = CYCLEREGION + cycleRegionCount;
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

        // get length of components under the component and pop
        // the same number from the temp VariantComponent stack
        const lengthOfComponents = templateObj.template._components.length;
        for (let i=0; i< lengthOfComponents; i++){
          const vc = stacks.variantComponents.pop();
          const variableComponent = makeVariableComponent(doc, cv.persistentIdentity, vc.component, vc.operator, vc.variantDVs, vc.variants);
          cv.addVariableComponent(variableComponent);
        }
        break;
    }
  });
}


function generateCombinatorialSBOL(stateGraph, categories, designName){
  const doc = new SBOLDocument();
  DESIGN_NAME = designName;

  // traverse stateGraph and mark all as not visited
  //create ComponentDefinition for every atom and add to atomMap
  Object.keys(stateGraph).forEach(function(id){
    stateGraph[id].visited = false;
    let atomType = stateGraph[id].type;
    let atomText = stateGraph[id].text;
    if (atomType === graph.ATOM && !(atomText in atomMap)){
      makeAtomComponentDefinition(doc, atomText);
      categories[atomText].forEach(function(variant){
        makeAtomComponentDefinition(doc, variant);
        if (!atomMap[atomText].variants){
          atomMap[atomText].variants = [];
        }
        atomMap[atomText].variants.push(variant);
      });
    }
  });

  //create a stateStack from the stateGraph
  const rootId = getRootId(stateGraph);
  let stateStack = [];
  makeStackFromStateGraph(stateGraph, stateStack, rootId);
  console.log(JSON.stringify(stateStack, null, 2));

  //use stateStack to generate SBOL
  let componentDefStack = [];
  makeSBOLFromStack(doc, stateStack, componentDefStack);
  const rootTemplate = makeComponentDefinition(doc, designName, false, true);
  addComponentsAndRestraintsToTemplate(doc, rootTemplate, componentDefStack);

  //clean up
  sequenceConstraintCount = 1;
  orRegionCount = 1;
  cycleRegionCount = 1;
  for (let atom in atomMap) delete atomMap[atom];

  return doc.serializeXML();
}

let sbol = generateCombinatorialSBOL;

if (typeof window === 'undefined') {
  module.exports = sbol;
}
