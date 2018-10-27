if (typeof window === 'undefined') {
  SBOLDocument = require('sboljs');
  graph = require('./graph');
}

let sequenceConstraintCount = 1;
let orRegionCount = 1;
let cycleRegionCount = 1;
let atomMap = {}; // {atomText: componentDefinition, variants[]}

const VERSION = '1';
const DELIMITER = '/';
const PREFIX = 'http://constellationcad.org/design_name/';
const ROOT_PREFIX = PREFIX + 'root_template' + DELIMITER;
const TEMPLATE = 'combinatorial_template';
const TEMPLATE_PREFIX = PREFIX + TEMPLATE + DELIMITER;
const COMBINATORIAL = 'combinatorial_derivation';
const SEQUENCE_CONSTRAINT = 'sequence_constraint';
const COMPONENT = '_component';
const VARIABLE = '_variable';
const ORREGION = 'ORunit';
const ORSUBREGION = 'ORsubunit';
const CYCLEREGION = 'CYCLICALunit';

const OPERATOR_URIS = {
  'zero-or-one': 'http://sbols.org/v2#zeroOrOne',
  'zero-or-more': 'http://sbols.org/v2#zeroOrMore',
  'one': 'http://sbols.org/v2#one',
  'one-or-more': 'http://sbols.org/v2#oneOrMore'
};
const SEQUENCE_CONSTRAINT_URIS = {
  'PRECEDE': 'http://sbols.org/v2#precedes',
  'SAMEORIENTATION': 'http://sbols.org/v2#sameOrientationAs',
  'OPPOSITEORIENTATION': 'http://sbols.org/v2#oppositeOrientationAs',
  'DIFFERENT': 'http://sbols.org/v2#differentFrom'
};


function getRootId(stateGraph){
  for (let id in stateGraph) {
    if (stateGraph[id].type === graph.ROOT){
      return id;
    }
  }
}

function makeCombinatorialDerivation(doc, templateComponentDefinition){
  const displayId = templateComponentDefinition.displayId + DELIMITER + COMBINATORIAL;
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
TODO fetch from SBH
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

function makeComponent(doc, componentDefinition, templateId, name){
  const displayId = name + COMPONENT;
  const persistentId =  templateId + DELIMITER + displayId;
  const atomComponent = doc.component(persistentId + DELIMITER + VERSION);
  atomComponent.displayId = displayId;
  atomComponent.persistentIdentity = persistentId;
  atomComponent.version = VERSION;
  atomComponent.definition = componentDefinition;
  return atomComponent;
}

function makeVariableComponent(doc, component, operator, variantDerivations){
  let displayId = component.displayId + VARIABLE;
  const variableComponent = doc.variableComponent(TEMPLATE_PREFIX + displayId + DELIMITER + VERSION);
  variableComponent.displayId = displayId;
  variableComponent.persistentIdentity = TEMPLATE_PREFIX + displayId;
  variableComponent.version = VERSION;
  variableComponent.variable = component;
  variableComponent.operator = OPERATOR_URIS[operator];

  let variants = atomMap[component.displayId.split('_')[0]].variants;
  if (variants){
    variants.forEach(function(variant){
      variableComponent.addVariant(atomMap[variant].componentDefinition);
    });
  }

  if(variantDerivations){
    variantDerivations.forEach(function(vd) {
      variableComponent.addVariantDerivation(vd);
    });
  }

  return variableComponent;
}

function makeSequenceConstraint(doc, templateId, subject, object){
  //subject precedes object
  let displayId = SEQUENCE_CONSTRAINT + sequenceConstraintCount;
  const persistentId =  templateId + DELIMITER + displayId;
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


/*
Every OR region is composed of
1) Template ComponentDefinition
   a) Components - references every part's component definition
2) CombinatorialDerivation - references #1
   a) VariableComponent - references #1a
 */
function handleOr(doc, stateGraph, id){
  let orSubRegionCount = 1;
  let combDerivations = [];
  stateGraph[id].edges.forEach(function(edge){
    let templateComponents = [];

    // 1) Template ComponentDefinition
    let identity = ORSUBREGION + orSubRegionCount;
    orSubRegionCount++;
    const templateComponentDefinition = makeComponentDefinition(doc, identity, false);
    //2) CombinatorialDerivation
    const combinatorialDerivation = makeCombinatorialDerivation(doc, templateComponentDefinition);
    combDerivations.push(combinatorialDerivation);

    let nextEdge = edge;
    let operator = 'one';
    do {
      if (stateGraph[nextEdge].type === graph.ATOM){
        stateGraph[nextEdge].visited = true;
        // 1a) Components
        let atomText = stateGraph[nextEdge].text;
        const componentDefinition = atomMap[atomText].componentDefinition;
        const atomComponent = makeComponent(doc, componentDefinition, templateComponentDefinition.persistentIdentity, atomText);
        templateComponentDefinition.addComponent(atomComponent);

        // 2a) VariableComponent
        const variableComponent = makeVariableComponent(doc, atomComponent, operator);
        combinatorialDerivation.addVariableComponent(variableComponent);
      }

      if (stateGraph[nextEdge].operator > 0){
        stateGraph[nextEdge].visited = true;
        templateComponents.push(handleOperations(doc, stateGraph, templateComponentDefinition, id, stateGraph[nextEdge].operator));
      }else{
        nextEdge = null;
      }
      addComponentsToTemplate(doc, stateGraph, templateComponentDefinition, templateComponents);
    }while(nextEdge);
  });

  return combDerivations;
}


function addComponentsToTemplate(doc, stateGraph, templateComponentDefinition, templateComponents){
  //{op: 'or', component: orComponent};
  //{op: 'then', subject: subject};
  let thenFlag = false;
  for (let i=0; i<templateComponents.length;i++){
    let componentObj = templateComponents[i];
    templateComponentDefinition.addComponent(componentObj.component);
    // add sequence constraints
    if (componentObj.op === 'then'){
      if (i === templateComponents.length - 1){
        thenFlag = true;
      }else{
        let subject = componentObj.component;
        let object = templateComponents[i+1].component;
        let sequenceConstraint = makeSequenceConstraint(doc, templateComponentDefinition.persistentIdentity, subject, object);
        templateComponentDefinition.addSequenceConstraint(sequenceConstraint);
      }
    }
  }

  return thenFlag; //if this is true, it means there is a "then" on the last atom of the cycle region
}

function addVariableComponentsToCV(doc, templateComponentDefinition, templateComponents){
  const combinatorialDerivation = makeCombinatorialDerivation(doc, templateComponentDefinition);
  templateComponents.forEach(function (rootComponent){
    let operator = 'one';
    if (rootComponent.op === 'one-or-more' || rootComponent.op === 'zero-or-more'){
      operator = rootComponent.op;
    }
    if (rootComponent.op === 'then' && rootComponent.operator){
      operator = rootComponent.operator;
    }
    const variableComponent = makeVariableComponent(doc, rootComponent.component, operator);
    combinatorialDerivation.addVariableComponent(variableComponent);
  });
}

// breadth width search
function populateStack(stateGraph, stack, id){
  let endIds = []; //prevent redundant ends
  let queue = [];
  queue.push(id);
  stateGraph[id].visited = true;

  while (queue.length !== 0){
    let id = queue.shift();
    //let value = stateGraph[id].text; //replace with id
    let value = id;
    let lastEdge = '';
    stateGraph[id].operator.forEach(function (operation){
      if (operation === 'or'){
        let orStack = [];
        stack.push({[operation]: orStack});
        // get all edges of the OR first
        stateGraph[id].edges.forEach(function (edge){
          let tempStack = [];
          lastEdge = traverseOr(stack, tempStack, stateGraph, edge, endIds);
          orStack.push(tempStack);
        });
      } else {
        stack.push({[operation]: value});
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
          if (Object.keys(stack[stack.length-1])[0] === 'then'){
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


//depth first search for OR
function traverseOr(stack, tempStack, stateGraph, id, endIds){
  let lastEdge;
  stateGraph[id].visited = true;

  if (stateGraph[id].type === graph.ATOM){
    tempStack.push({atom: stateGraph[id].text});
    for (let operation of stateGraph[id].operator){
      if (operation === 'or'){
        let orStack = [];
        tempStack.push({[operation]: orStack});
        // get all edges of the OR first
        stateGraph[id].edges.forEach(function (edge){
          let tempStackX = [];
          lastEdge = traverseOr(tempStack, tempStackX, stateGraph, edge, endIds);
          orStack.push(tempStackX);
        });
      } else{
        tempStack.push({[operation]: id});
      }
    }
  }
  else{
    for (let operation of stateGraph[id].operator){
      if (operation === 'then'){
        stateGraph[id].visited = false; //reset
        return id; //a 'then' that's not on the atom is not part of the OR
      }
      if (operation === 'or'){
        let orStack = [];
        tempStack.push({[operation]: orStack});
        // get all edges of the OR first
        stateGraph[id].edges.forEach(function (edge){
          let tempStackX = [];
          lastEdge = traverseOr(tempStack, tempStackX, stateGraph, edge, endIds);
          orStack.push(tempStackX);
        });
      } else{
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
    if (stateGraph[edge].visited && stateGraph[edge].edges.includes(id)){
      if (!endIds.includes(edge)){
        tempStack.push({end: edge});
        endIds.push(edge);
      }
      continue;
    }
    if (stateGraph[edge].visited){
      if (stateGraph[edge].operator.includes('one-or-more')
            || stateGraph[edge].operator.includes('zero-or-more')){
        if (!endIds.includes(edge)){
          stack.push({end: edge});
          endIds.push(edge);
        } //end the 'mores' on the original stack
      }
      continue;
    }

    lastEdge = traverseOr(stack, tempStack, stateGraph, edge, endIds);
  }
  return lastEdge; //the last node of the OR chain
}

function createSBOL(doc, stack){

}



function generateCombinatorialSBOL(stateGraph, categories){
  const doc = new SBOLDocument();

  // traverse whole graph, mark all as not visited
  //create ComponentDefinition for every atom and add to atomMap
  Object.keys(stateGraph).forEach(function(id){
    stateGraph[id].visited = false;
    let atomType = stateGraph[id].type;
    let atomText = stateGraph[id].text;
    if (atomType === graph.ATOM && !(atomText in atomMap)){
      makeAtomComponentDefinition(doc, atomText);

      //create ComponentDefinition for every variant and add to atomMap
      // TODO fetch definitions from SBH
      categories[atomText].forEach(function(variant){
        makeAtomComponentDefinition(doc, variant);
        if (!atomMap[atomText].variants){
          atomMap[atomText].variants = [];
        }
        atomMap[atomText].variants.push(variant);
      });
    }
  });

  //Create root template for the whole graph
  //Components under this Definition should come from traverseGraph
  const rootId = getRootId(stateGraph);
  let stack = [];
  populateStack(stateGraph, stack, rootId); //create a new stack that's ideal for SBOL structure
  console.log(JSON.stringify(stack, null, 2));
  // let rootComponents = createSBOL(doc, stack);
  //
  // const identity = 'design_name';
  // const rootComponentDefinition = makeComponentDefinition(doc, identity, false, true);
  //addComponentsToTemplate(doc, stateGraph, rootComponentDefinition, rootComponents);
  //Create combinatorial derivation for the root template

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
