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
  const displayId = templateComponentDefinition.displayId + COMBINATORIAL;
  const persistentId = templateComponentDefinition.persistentIdentity + DELIMITER + displayId;
  const combinatorialDerivation = doc.combinatorialDerivation(persistentId + DELIMITER + VERSION);
  combinatorialDerivation.template = templateComponentDefinition;
  combinatorialDerivation.displayId = displayId;
  combinatorialDerivation.persistentIdentity = persistentId;
  combinatorialDerivation.version = VERSION;

  return combinatorialDerivation;
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
  componentDefinition.addType(SBOLDocument.terms.dnaRegion);

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

// function getNextAtom(stateGraph, id, operator){
//   let atomEdges = stateGraph[id].edges;
//   if (!operator){ operator = 'one'; }
//   for(let atomEdgeId of atomEdges){
//     if (stateGraph[atomEdgeId].visited){
//       continue;
//     }
//
//     if (stateGraph[atomEdgeId].type === graph.EPSILON
//           && stateGraph[atomEdgeId].operator.length > 0
//           && stateGraph[atomEdgeId].operator.includes('or')){
//       return ORFLAG;
//     }
//
//     stateGraph[atomEdgeId].visited = true;
//
//     if (stateGraph[atomEdgeId].type === graph.EPSILON
//           && stateGraph[atomEdgeId].operator.length > 0
//           && (stateGraph[atomEdgeId].operator[0] === 'one-or-more'
//                 || stateGraph[atomEdgeId].operator[0] === 'zero-or-more')){
//       operator = stateGraph[atomEdgeId].operator[0];
//       getNextAtom(stateGraph, id, operator)
//     }
//     if (stateGraph[atomEdgeId].type === graph.ATOM){
//       return {nextAtomId: atomEdgeId, operator: operator};
//     }
//   }
//   return null;
// }

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

function handleCycle(doc, stateGraph, cycleComponents, templateComponentDefinition, id, startEdge){
  if (stateGraph[id].edges.includes(startEdge)){return;}
  for (let edge of stateGraph[id].edges){
    if (stateGraph[edge].visited){
      return;
    }
    if (stateGraph[edge].operator.length > 0){
      stateGraph[edge].visited = true;
      cycleComponents.push(handleOperations(doc, stateGraph, templateComponentDefinition, edge, stateGraph[edge].operator));
    }
    if (stateGraph[edge].operator.length === 0
          && stateGraph[edge].type === graph.ATOM){
      stateGraph[edge].visited = true;
      // 1a) Components
      let atomText = stateGraph[edge].text;
      const componentDefinition = atomMap[atomText].componentDefinition;
      let templateComponent = {op: 'none', component: makeComponent(doc, componentDefinition, templateComponentDefinition.persistentIdentity, atomText), lastId: edge};
      cycleComponents.push(templateComponent);
    }
    handleCycle(doc, stateGraph, cycleComponents, templateComponentDefinition, edge, startEdge);
  }
}

function handleOp(doc, stateGraph, templateComponentDefinition, id, op, operator){
  if (op === 'or'){
    let combinatorialDerivations = handleOr(doc, stateGraph, id); // this handles the individual OR regions

    let identity = ORREGION + orRegionCount;
    orRegionCount++;
    // 1) ComponentDefinition
    // 2) Template ComponentDefinition
    //    a) Component - references #1
    const componentDefinition = makeComponentDefinition(doc, identity, false);
    const orTemplateComponentDefinition = makeComponentDefinition(doc, identity, true);
    const orComponent = makeComponent(doc, componentDefinition, orTemplateComponentDefinition.persistentIdentity, identity);
    orTemplateComponentDefinition.addComponent(orComponent);

    // 3) CombinatorialDerivation - references #2
    //    a) VariableComponent - references #2a
    //      ai) VariantDerivation - one for every item in combinatorialDerivations array
    const combinatorialDerivation = makeCombinatorialDerivation(doc, orTemplateComponentDefinition);
    const variableComponent = makeVariableComponent(doc, orComponent, operator, combinatorialDerivations);
    combinatorialDerivation.addVariableComponent(variableComponent);

    //return this component
    return {op: op, component: makeComponent(doc, componentDefinition, templateComponentDefinition.persistentIdentity, identity)};
  }
  if (op === 'then'){
    // assume that the 'then' is always on an atom
    let atomText = stateGraph[id].text;
    const componentDefinition = atomMap[atomText].componentDefinition;
    const subjectComponent = makeComponent(doc, componentDefinition, templateComponentDefinition.persistentIdentity, atomText);
    return {op: op, component: subjectComponent, lastId: id};
  }
  if (op === 'zero-or-more' || op === 'one-or-more'){
    let identity = CYCLEREGION + cycleRegionCount;
    cycleRegionCount++;
    // 1) ComponentDefinition
    // 2) Template ComponentDefinition
    //    a) Component - references #1
    const componentDefinition = makeComponentDefinition(doc, identity, false);
    const cycleTemplateComponentDefinition = makeComponentDefinition(doc, identity, true);
    const cycleComponent = makeComponent(doc, componentDefinition, cycleTemplateComponentDefinition.persistentIdentity, identity);
    cycleTemplateComponentDefinition.addComponent(cycleComponent);

    let cycleComponents = [];
    handleCycle(doc, stateGraph, cycleComponents, componentDefinition, id, id);
    let lastId = cycleComponents[cycleComponents.length-1].lastId;
    let thenFlag = addComponentsToTemplate(doc, stateGraph, componentDefinition, cycleComponents);

    // 3) CombinatorialDerivation - references #2
    //    a) VariableComponent - references #2a
    const combinatorialDerivation = makeCombinatorialDerivation(doc, cycleTemplateComponentDefinition);
    const variableComponent = makeVariableComponent(doc, cycleComponent, op);
    combinatorialDerivation.addVariableComponent(variableComponent);

    //return this component
    if (thenFlag){ op = 'then'}
    return {op: op, component: makeComponent(doc, componentDefinition, templateComponentDefinition.persistentIdentity, identity), lastId: lastId};
  }
}
function handleOperations(doc, stateGraph, templateComponentDefinition, id, operations){
  let operator = 'one';
  if (operations.length === 1){
    return handleOp(doc, stateGraph, templateComponentDefinition, id, operations[0], operator);
  }
  for(let op of operations){
    if (op === 'one-or-more' || op === 'zero-or-more'){
      operator = op;
      continue;
    }
    return handleOp(doc, stateGraph, templateComponentDefinition, id, op, operator);
  }
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
        //console.log(subject);
        let object = templateComponents[i+1].component;
        let sequenceConstraint = makeSequenceConstraint(doc, templateComponentDefinition.persistentIdentity, subject, object);
        templateComponentDefinition.addSequenceConstraint(sequenceConstraint);
      }
    }
  }

  return thenFlag; //if this is true, it means there is a "then" on the last atom of the cycle region
}

function traverseGraph(doc, stateGraph, rootComponentDefinition, templateComponents, id){
  if (stateGraph[id].type === graph.ACCEPT) {return;}
  if (stateGraph[id].visited) { return;}
  else if (stateGraph[id].operator.length !== 0){
    stateGraph[id].visited = true;
    let componentObj = handleOperations(doc, stateGraph, rootComponentDefinition, id, stateGraph[id].operator);
    templateComponents.push(componentObj);
    if(componentObj.lastId){id = componentObj.lastId;}
  }
  else if (stateGraph[id].operator.length === 0
        && stateGraph[id].type === graph.ATOM){
    stateGraph[id].visited = true;
    let atomText = stateGraph[id].text;
    let templateComponent = {op: 'none', component: makeComponent(doc, atomMap[atomText].componentDefinition, rootComponentDefinition.persistentIdentity, atomText)};
    templateComponents.push(templateComponent);
  }
  stateGraph[id].edges.forEach(function(edge){
    traverseGraph(doc, stateGraph, rootComponentDefinition, templateComponents, edge);
  });

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
      makeComponentDefinition(doc, atomText);

      //create ComponentDefinition for every variant and add to atomMap
      // TODO fetch definitions from SBH
      categories[atomText].forEach(function(variant){
        makeComponentDefinition(doc, variant);
        if (!atomMap[atomText].variants){
          atomMap[atomText].variants = [];
        }
        atomMap[atomText].variants.push(variant);
      });
    }
  });

  //Create root template for the whole graph
  //Components under this Definition should come from traverseGraph
  const identity = 'design_name';
  const rootComponentDefinition = makeComponentDefinition(doc, identity, false, true);
  const firstId = getRootId(stateGraph);
  let templateComponents = [];
  traverseGraph(doc, stateGraph, rootComponentDefinition, templateComponents, firstId);
  addComponentsToTemplate(doc, stateGraph, rootComponentDefinition, templateComponents);

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
