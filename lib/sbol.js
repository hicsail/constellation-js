if (typeof window === 'undefined') {
  SBOLDocument = require('sboljs');
}

let sequenceConstraintCount = 1;
let atomTextSet = new Set();
let atomMap = {}; // {atom id: text, type, component, operator, variantDerivation: []}

const VERSION = '1';
const DELIMITER = '/';
const PREFIX = 'http://constellationcad.org/';
const TEMPLATE = 'combinatorialTemplate';
const TEMPLATE_PREFIX = PREFIX + TEMPLATE + DELIMITER;
const COMBINATORIAL = 'combinatorialDerivation';
const SEQUENCE_CONSTRAINT = 'combinatorialSequenceConstraint';
const COMPONENT = 'Component';
const VARIABLE = 'Variable';

const OPERATOR_URIS = {
  'ZeroOrOne': 'http://sbols.org/v2#zeroOrOne',
  'ZeroOrMore': 'http://sbols.org/v2#zeroOrMore',
  'One': 'http://sbols.org/v2#one',
  'OneOrMore': 'http://sbols.org/v2#oneOrMore'
};
const SEQUENCE_CONSTRAINT_URIS = {
  'PRECEDE': 'http://sbols.org/v2#precedes',
  'SAMEORIENTATION': 'http://sbols.org/v2#sameOrientationAs',
  'OPPOSITEORIENTATION': 'http://sbols.org/v2#oppositeOrientationAs',
  'DIFFERENT': 'http://sbols.org/v2#differentFrom'
};
const STATE_GRAPH_TYPES = {
  'ROOT': 'root',
  'EPSILON': 'epsilon',
  'ATOM': 'atom'
};


function getRootId(stateGraph){
  for (let id in stateGraph) {
    if (stateGraph[id].type === STATE_GRAPH_TYPES.ROOT){
      return id;
    }
  }
}

function makeComponentDefinition(atomText, doc, variantName){
  let displayId = '';
  if (variantName){
    displayId = variantName;
  }
  else{
    displayId = atomText;
  }
  const componentDefinition = doc.componentDefinition(PREFIX + displayId + DELIMITER + VERSION);
  componentDefinition.displayId = displayId;
  componentDefinition.persistentIdentity = PREFIX + displayId;
  componentDefinition.version = VERSION;
  const role = SBOLDocument.terms[atomText]; //TODO terms need to match what's in sboljs, issue #56
  if (role){
    componentDefinition.addRole(role);
  }
  componentDefinition.addType(SBOLDocument.terms.dnaRegion); //TODO support for non DNA?

  return componentDefinition;
}

function makeComponent(atomText, parentPrefix, componentDefinition, doc){
  let displayId = atomText + COMPONENT;
  const atomComponent = doc.component(parentPrefix + displayId + DELIMITER + VERSION);
  atomComponent.displayId = displayId;
  atomComponent.persistentIdentity = parentPrefix + displayId;
  atomComponent.version = VERSION;
  atomComponent.definition = componentDefinition;
  return atomComponent;
}

function makeVariableComponent(atomId, categories, doc){

  let atomText = atomMap[atomId].text;
  let displayId = atomText + VARIABLE;
  const variableComponent = doc.variableComponent(TEMPLATE_PREFIX + displayId + DELIMITER + VERSION);
  variableComponent.displayId = displayId;
  variableComponent.persistentIdentity = TEMPLATE_PREFIX + displayId;
  variableComponent.version = VERSION;
  variableComponent.variable = atomMap[atomId].component;
  variableComponent.operator = OPERATOR_URIS[atomMap[atomId].operator];

  //OR
  if (atomMap[atomId].variantDerivation.length > 0){
    atomMap[atomId].variantDerivation.forEach(function(variantId){
      let variantDerivationComponent = atomMap[variantId].component;
      variableComponent.addVariantDerivation(variantDerivationComponent);
    });
  }

  let variants = categories[atomText];
  if (variants){
    variants.forEach(function(variant){
      //make componentDefinition for every variant
      let variantCompDef = makeComponentDefinition(atomText, doc, variant);
      variableComponent.addVariant(variantCompDef);
    });
  }

  return variableComponent;
}

function makeSequenceConstraint(objectId, subjectId, doc){
  let displayId = SEQUENCE_CONSTRAINT + sequenceConstraintCount;
  const sequenceConstraint = doc.sequenceConstraint(TEMPLATE_PREFIX + displayId + DELIMITER + VERSION);
  sequenceConstraint.displayId = displayId;
  sequenceConstraint.persistentIdentity = TEMPLATE_PREFIX + displayId;
  sequenceConstraint.version = VERSION;
  sequenceConstraint.object = atomMap[objectId].component;
  sequenceConstraint.subject = atomMap[subjectId].component;
  sequenceConstraint.restriction = SEQUENCE_CONSTRAINT_URIS.PRECEDE;
  sequenceConstraintCount += 1;

  return sequenceConstraint
}

function getIdList(id, stateGraph, objectIdList, parentId){
  let atomEdges = stateGraph[id].edges;
  atomEdges.forEach(function(atomEdgeId){
    //if an edge has an edge back to its parent, skip
    if (atomEdgeId !== parentId) {
      if (stateGraph[atomEdgeId].type === STATE_GRAPH_TYPES.EPSILON) {
        getIdList(atomEdgeId, stateGraph, objectIdList, id);
      }
      if (stateGraph[atomEdgeId].type === STATE_GRAPH_TYPES.ATOM) {
        objectIdList.push(atomEdgeId);
      }
    }
  });
}

function addSequenceConstraints(id, stateGraph, templateComponentDefinition, doc){
  //subject precedes object
  let subjectId = id;
  let objectIdList = [];
  getIdList(subjectId, stateGraph, objectIdList);

  // if the subject atom precedes more than one object atoms
  // the object atoms == OR
  if (objectIdList.length > 1){
    objectIdList.forEach(function(objectId){
      atomMap[objectId].variantDerivation = objectIdList.filter(function(x) { return x !== objectId; });
    });
  }

  // sequence constraint = THEN
  objectIdList.forEach(function(objectId){
    let sequenceConstraint = makeSequenceConstraint(objectId, subjectId, doc);
    templateComponentDefinition.addSequenceConstraint(sequenceConstraint);
    addSequenceConstraints(objectId, stateGraph, templateComponentDefinition, doc);
  });
}

function generateTemplateComponentDefinition(stateGraph, doc) {
  const templateComponentDefinition = makeComponentDefinition(TEMPLATE, doc);
  Object.keys(stateGraph).forEach(function(key) {
    if (stateGraph[key].type === STATE_GRAPH_TYPES.ATOM){

      let type = stateGraph[key].text;
      let text = stateGraph[key].text;

      if (atomTextSet.has(text)){
        if (!Number.isNaN(text.slice(-1))){
          text = text + '1';
        }else{
          let nextNum = parseInt(text.slice(-1)) + 1;
          text = text + nextNum;
        }
      }
      atomTextSet.add(text);

      let componentDefinition = makeComponentDefinition(type, doc);
      let atomComponent = makeComponent(text, TEMPLATE_PREFIX, componentDefinition, doc);
      templateComponentDefinition.addComponent(atomComponent);

      atomMap[key] = {};
      atomMap[key].text = text;
      atomMap[key].type = type;
      atomMap[key].variantDerivation = [];
      atomMap[key].operator = 'One'; //default
      atomMap[key].component = atomComponent;
      let edges = stateGraph[key].edges;
      // if there is only one edge and that edge is an 'o'
      // and if o's edges contains this edge, it is 'zeroOrMore'
      if ( edges.length === 1 && stateGraph[edges[0]].type === STATE_GRAPH_TYPES.EPSILON && stateGraph[edges[0]].edges.includes(key)){
        atomMap[key].operator = 'ZeroOrMore';
      }else if (edges.length > 1){
        for (let i = 0; i < edges.length; i++) {
          if (stateGraph[edges[i]].edges.includes(key)){
            atomMap[key].operator = 'OneOrMore';
            break;
          }
        }
      }
    }
  });

  let firstIds = [];
  let rootId = getRootId(stateGraph);
  getIdList(rootId, stateGraph, firstIds);
  firstIds.forEach(function(firstSubjectId){
    addSequenceConstraints(firstSubjectId, stateGraph, templateComponentDefinition, doc);
  });
  return templateComponentDefinition;
}


function generateCombinatorialSBOL(stateGraph, categories){
  const doc = new SBOLDocument();
  const templateComponentDefinition = generateTemplateComponentDefinition(stateGraph, doc);
  const combinatorialDerivation = doc.combinatorialDerivation(TEMPLATE_PREFIX + COMBINATORIAL + DELIMITER + VERSION);
  combinatorialDerivation.template = templateComponentDefinition;
  combinatorialDerivation.displayId = COMBINATORIAL;
  combinatorialDerivation.persistentIdentity = PREFIX + combinatorialDerivation.displayId;
  combinatorialDerivation.version = VERSION;

  // VariantComponent URIs must be unique even if the atomText is the same
  Object.keys(atomMap).forEach(function(atomId){
    let variableComponent = makeVariableComponent(atomId, categories, doc);
    combinatorialDerivation.addVariableComponent(variableComponent);
  });

  return doc.serializeXML();
}

let sbol = generateCombinatorialSBOL;

if (typeof window === 'undefined') {
  module.exports = sbol;
}
