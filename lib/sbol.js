if (typeof window === 'undefined') {
  SBOLDocument = require('sboljs');
}

const PREFIX = 'http://constellationcad.org/';
const TEMPLATE_PREFIX = PREFIX + 'combinatorialTemplate';
const VERSION = '0.0.0';
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

let atomMap = {}; // {atom id: text, component, operator, variantDerivation: []}

function getRootId(stateGraph){
  for (let id in stateGraph) {
    if (stateGraph[id].type === 'root'){
      return id;
    }
  }
}

function makeComponentDefinition(atomText, doc, variantName){
  let cdURI = '';
  let displayId = '';
  if (variantName){
    cdURI = PREFIX + variantName;
    displayId = variantName;
  }
  else{
    cdURI = PREFIX + atomText;
    displayId = atomText;
  }
  const componentDefinition = doc.componentDefinition(cdURI);
  const role = SBOLDocument.terms[atomText]; //TODO terms need to match what's in sboljs, issue #56
  if (role){
    componentDefinition.addRole(role);
  }
  componentDefinition.addType(SBOLDocument.terms.dnaRegion); //TODO support for non DNA?
  componentDefinition.displayId = displayId;

  // const sequence = doc.sequence();
  // sequence.displayId = atomText + '_sequence';
  // sequence.version = VERSION;
  // sequence.persistentIdentity = PREFIX + sequence.displayId;
  // sequence.uri = sequence.persistentIdentity + '/' + sequence.version;
  // componentDefinition.addSequence(sequence);

  return componentDefinition;
}

function addAtom(atomText, templateComponentDefinition, doc){
  const atomComponent = doc.component(templateComponentDefinition.uri + '/' + atomText);
  atomComponent.definition = makeComponentDefinition(atomText, doc);
  return atomComponent;
}

function getIdList(id, stateGraph, objectIdList, parentId){
  let atomEdges = stateGraph[id].edges;
  atomEdges.forEach(function(atomEdgeId){
    //if an edge has an edge back to its parent, skip
    if (atomEdgeId !== parentId) {
      if (stateGraph[atomEdgeId].type === 'epsilon') {
        getIdList(atomEdgeId, stateGraph, objectIdList, id);
      }
      if (stateGraph[atomEdgeId].type === 'atom') {
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
  console.log("object list:", objectIdList);

  // if the subject atom precedes more than one object atoms
  // the object atoms == OR
  if (objectIdList.length > 1){
    objectIdList.forEach(function(objectId){
      let objectIdListWithoutCurrent = objectIdList.filter(function(x) { return x !== objectId; });
      atomMap[objectId].variantDerivation = objectIdListWithoutCurrent;
    });
  }

  // sequence constraint = THEN
  objectIdList.forEach(function(objectId){
    const sequenceConstraint = doc.sequenceConstraint(TEMPLATE_PREFIX + 'combinatorialSequenceConstraint'); //TODO
    sequenceConstraint.object = atomMap[objectId].component;
    sequenceConstraint.subject = atomMap[subjectId].component;
    sequenceConstraint.restriction = SEQUENCE_CONSTRAINT_URIS.PRECEDE;
    templateComponentDefinition.addSequenceConstraint(sequenceConstraint);

    addSequenceConstraints(objectId, stateGraph, templateComponentDefinition, doc);
  });
}

function generateTemplateComponentDefinition(stateGraph, doc) {
  const templateComponentDefinition = doc.componentDefinition(TEMPLATE_PREFIX);
  templateComponentDefinition.displayId = 'combinatorialTemplate';
  templateComponentDefinition.addType(SBOLDocument.terms.dnaRegion);
  Object.keys(stateGraph).forEach(function(key) {
    if (stateGraph[key].type === 'atom'){
      let text = stateGraph[key].text;
      let atomComponent = addAtom(text, templateComponentDefinition, doc);
      templateComponentDefinition.addComponent(atomComponent);
      atomMap[key] = {};
      atomMap[key].text = text;
      atomMap[key].variantDerivation = [];
      atomMap[key].operator = 'One'; //default
      atomMap[key].component = atomComponent;
      let edges = stateGraph[key].edges;
      // if there is only one edge and that edge is an 'o'
      // and if o's edges contains this edge, it is 'zeroOrMore'
      if ( edges.length === 1 && stateGraph[edges[0]].type === 'epsilon' && stateGraph[edges[0]].edges.includes(key)){
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
  console.log("first ids: ", firstIds);
  firstIds.forEach(function(firstSubjectId){
    addSequenceConstraints(firstSubjectId, stateGraph, templateComponentDefinition, doc);
  });
  return templateComponentDefinition;
}


function generateCombinatorialSBOL(stateGraph, categories){
  const doc = new SBOLDocument();
  const templateComponentDefinition = generateTemplateComponentDefinition(stateGraph, doc);
  const combinatorialDerivation = doc.combinatorialDerivation(PREFIX + 'combinatorialDerivation');
  combinatorialDerivation.template = templateComponentDefinition;

  Object.keys(atomMap).forEach(function(atomId){

    let atomText = atomMap[atomId].text;

    const variableComponent = doc.variableComponent(PREFIX + atomText + '_variable'); //TODO if multiple have the same text
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
    if (variants){ //TODO I shouldn't have to do this check if category types are reinforced
      variants.forEach(function(variant){
        //make componentDefinition for every variant
        let variantCompDef = makeComponentDefinition(atomText, doc, variant);
        variableComponent.addVariant(variantCompDef);
      });
    }

    // link VariableComponent under combinatorialDerivation
    combinatorialDerivation.addVariableComponent(variableComponent);
  });

  return doc.serializeXML();
}

let sbol = generateCombinatorialSBOL;

if (typeof window === 'undefined') {
  module.exports = sbol;
}
