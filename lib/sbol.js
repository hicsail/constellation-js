if (typeof window === 'undefined') {
  SBOLDocument = require('sboljs');
}

const prefix = 'http://sbolstandard.org/constellation_example1/';
const operatorURIs = {
  'ZeroOrOne': 'http://sbols.org/v2#zeroOrOne',
  'ZeroOrMore': 'http://sbols.org/v2#zeroOrMore',
  'One': 'http://sbols.org/v2#one',
  'OneOrMore': 'http://sbols.org/v2#oneOrMore'
};
const precedeURI = 'http://sbols.org/v2#precedes';
const dnaRegionURI = 'http://www.biopax.org/release/biopax-level3.owl#DnaRegion';

let atomMap = {}; // {atom text: id, component, operator, variantDerivation: []}

function getRootId(stateGraph){
  for (let id in stateGraph) {
    if (stateGraph[id].text === 'root'){
      return id;
    }
  }
}

function makeComponentDefinition(atomText, doc){
  const componentDefinition = doc.componentDefinition(prefix + atomText);
  const role = SBOLDocument.terms[atomText]; //TODO terms need to match what's in sboljs, issue #56
  if (role){
    componentDefinition.addRole(role);
  }
  componentDefinition.addType(dnaRegionURI); //TODO support for non DNA?
  componentDefinition.displayId = atomText;
  return componentDefinition;
}

function addAtom(atomText, templateComponentDefinition, doc){
  const atomComponent = doc.component(templateComponentDefinition.uri + '/' + atomText);
  atomComponent.definition = makeComponentDefinition(atomText, doc);
  return atomComponent;
}

// there can be more than one here
function getFirstSubjectIds(stateGraph){
  let firstIds = [];
  let rootId = getRootId(stateGraph);
  let edges = stateGraph[rootId].edges;
  for (let i in edges) {
    if (stateGraph[edges[i]].type === 'atom'){
      firstIds.push(edges[i]);
    }
  };
  return firstIds;
}

function getObjectTextList(id, stateGraph, objectTextList, parentId){
  let atomEdges = stateGraph[id].edges;
  atomEdges.forEach(function(atomEdgeId){
    //if an edge has an edge back to its parent, skip
    if (atomEdgeId !== parentId) {
      if (stateGraph[atomEdgeId].type === 'epsilon') {
        getObjectTextList(atomEdgeId, stateGraph, objectTextList, id);
      }
      if (stateGraph[atomEdgeId].type === 'atom') {
        objectTextList.push(stateGraph[atomEdgeId].text);
      }
    }
  });
}

function addSequenceConstraints(id, stateGraph, templateComponentDefinition, doc){
  //subject precedes object
  let subjectText = stateGraph[id].text;
  let objectTextList = [];
  getObjectTextList(atomMap[subjectText].id, stateGraph, objectTextList);

  // if the subject atom precedes more than one object atoms
  // the object atoms == OR
  if (objectTextList.length > 1){
    objectTextList.forEach(function(objectText){
      let objectTextListWithoutCurrent = objectTextList.filter(function(x) { return x !== objectText; });
      atomMap[objectText].variantDerivation.push(objectTextListWithoutCurrent);
    });
  }

  // sequence constraint = THEN
  objectTextList.forEach(function(objectText){
    const sequenceConstraint = doc.sequenceConstraint(prefix + 'combinatorialSequenceConstraint');
    sequenceConstraint.object = atomMap[objectText];
    sequenceConstraint.subject = atomMap[subjectText];
    sequenceConstraint.restriction = precedeURI;
    templateComponentDefinition.addSequenceConstraint(sequenceConstraint);

    let id = atomMap[objectText].id;
    addSequenceConstraints(id, stateGraph, templateComponentDefinition, doc);
  });
}

function generateTemplateComponentDefinition(stateGraph, doc) {
  const templateComponentDefinition = doc.componentDefinition(prefix + 'combinatorialTemplate');
  templateComponentDefinition.displayId = 'combinatorialTemplate';
  templateComponentDefinition.addType(dnaRegionURI);
  Object.keys(stateGraph).forEach(function(key) {
    if (stateGraph[key].type === 'atom'){
      let text = stateGraph[key].text;
      let atomComponent = addAtom(text, templateComponentDefinition, doc);
      templateComponentDefinition.addComponent(atomComponent);
      atomMap[text] = {};
      atomMap[text].id = key;
      atomMap[text].variantDerivation = [];
      atomMap[text].operator = 'One'; //default
      atomMap[text].component = atomComponent;
      let edges = stateGraph[key].edges;
      // if there is only one edge and that edge is an 'o'
      // and if o's edges contains this edge, it is 'zeroOrMore'
      if ( edges.length === 1 && stateGraph[edges[0]].type === 'epsilon' && stateGraph[edges[0]].edges.includes(key)){
        atomMap[text].operator = 'ZeroOrMore';
      }else if (edges.length > 1){
        for (let i = 0; i < edges.length; i++) {
          if (stateGraph[edges[i]].edges.includes(key)){
            atomMap[text].operator = 'OneOrMore';
            break;
          }
        }
      }
    }
  });

  let firstSubjectIds = getFirstSubjectIds(stateGraph);
  firstSubjectIds.forEach(function(firstSubjectId){
    addSequenceConstraints(firstSubjectId, stateGraph, templateComponentDefinition, doc);
  });
  return templateComponentDefinition;
}


function generateCombinatorialSBOL(stateGraph, categories){
  const doc = new SBOLDocument();
  const templateComponentDefinition = generateTemplateComponentDefinition(stateGraph, doc)
  const combinatorialDerivation = doc.combinatorialDerivation(prefix + 'combinatorialDerivation');
  combinatorialDerivation.template = templateComponentDefinition;

  Object.keys(atomMap).forEach(function(atomText){

    const variableComponent = doc.variableComponent(prefix + atomText + '_variable');
    variableComponent.variable = atomMap[atomText].component;
    variableComponent.operator = operatorURIs[atomMap[atomText].operator];

    //OR
    if (atomMap[atomText].variantDerivation.length > 0){
      atomMap[atomText].variantDerivation.forEach(function(text){
        let variantDerivationComponent = atomMap[text].component;
        variableComponent.addVariantDerivation(variantDerivationComponent);
      });
    }

    let variants = categories[atomText];
    variants.forEach(function(variant){
      //make componentDefinition for every variant
      let variantCompDef = makeComponentDefinition(variant, doc);
      variableComponent.addVariant(variantCompDef);
    });

    // link VariableComponent under combinatorialDerivation
    combinatorialDerivation.addVariableComponent(variableComponent);
  });

  return doc.serializeXML();
}

let sbol = generateCombinatorialSBOL;

if (typeof window === 'undefined') {
  module.exports = sbol;
}
