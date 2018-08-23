if (typeof window === 'undefined') {
  SBOLDocument = require('sboljs');
  graph = require('./graph');
  uuidv4 = require('uuidv4');
}

let sequenceConstraintCount = 1;
let orRegionCount = 1;
let componentDefinitionObj = {}; // {atom text: componentDefiniton}

const VERSION = '1';
const DELIMITER = '/';
const PREFIX = 'http://constellationcad.org/';
const TEMPLATE_PREFIX = PREFIX + 'template' + DELIMITER;
const COMBINATORIAL = '_combinatorial_derivation';
const SEQUENCE_CONSTRAINT = '_combinatorial_sequence_constraint';
const COMPONENT = '_component';
const VARIABLE = '_variable';
const ORREGION = 'OR_region';
const UNIT = '_unit';

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


function makeSequenceConstraint(doc, subjectComponent, objectComponent) {
  const displayId = SEQUENCE_CONSTRAINT + sequenceConstraintCount;
  const persistentId = TEMPLATE_PREFIX + displayId;
  const sequenceConstraint = doc.sequenceConstraint(persistentId + DELIMITER + VERSION);
  sequenceConstraint.displayId = displayId;
  sequenceConstraint.persistentIdentity = persistentId;
  sequenceConstraint.version = VERSION;
  sequenceConstraint.subject = subjectComponent;
  sequenceConstraint.object = objectComponent;
  sequenceConstraint.restriction = SEQUENCE_CONSTRAINT_URIS.PRECEDE;
  sequenceConstraintCount += 1;

  return sequenceConstraint
}

function makeVariableComponent(doc, derivationIdentity, component, name, categories, variantDerivations){

  const displayId = name + VARIABLE;
  const persistentId = derivationIdentity + DELIMITER + displayId;
  const variableComponent = doc.variableComponent(persistentId + DELIMITER + VERSION);
  variableComponent.displayId = displayId;
  variableComponent.persistentIdentity = persistentId;
  variableComponent.version = VERSION;
  variableComponent.variable = component;
  variableComponent.operator = OPERATOR_URIS.One;

  if (name in componentDefinitionObj){
    let variants = categories[name];
    if (variants){
      variants.forEach(function(variant){
        //make componentDefinition for every variant
        const variantCompDef = makeComponentDefinition(doc, variant, false);
        variableComponent.addVariant(variantCompDef);
      });
    }
  }
  if (variantDerivations){
    variantDerivations.forEach(function(variantDerivation){
      variableComponent.addVariantDerivation(variantDerivation);
    });
  }

  return variableComponent;
}

function makeCombinatorialDerivation(doc, parsedOr, templateComponentDefinition){
  const displayId = templateComponentDefinition.displayId + COMBINATORIAL;
  const persistentId = templateComponentDefinition.persistentIdentity + DELIMITER + displayId;
  const combinatorialDerivation = doc.combinatorialDerivation(persistentId + DELIMITER + VERSION);
  combinatorialDerivation.template = templateComponentDefinition;
  combinatorialDerivation.displayId = displayId;
  combinatorialDerivation.persistentIdentity = persistentId;
  combinatorialDerivation.version = VERSION;

  return combinatorialDerivation;
}

function makeComponent(doc, name, componentDefinition, templateComponentDefinition){
  const displayId = name + COMPONENT;
  const persistentId =  templateComponentDefinition.persistentIdentity + DELIMITER + displayId;
  const atomComponent = doc.component(persistentId + DELIMITER + VERSION);
  atomComponent.displayId = displayId;
  atomComponent.persistentIdentity = persistentId;
  atomComponent.version = VERSION;
  atomComponent.definition = componentDefinition;
  return atomComponent;
}

function makeTemplateComponentDefinition(doc, name, componentDefinition){
  const template = makeComponentDefinition(doc, name, true);
  const component = makeComponent(doc, name, componentDefinition, template);
  template.addComponent(component);

  return template;
}

function makeComponentDefinition(doc, name, makeTemplate){

  if (! makeTemplate && name in componentDefinitionObj){
    return componentDefinitionObj[name];
  }

  const prefix = makeTemplate? TEMPLATE_PREFIX : PREFIX;

  const displayId = name;
  const persistentId = prefix + displayId;
  const componentDefinition = doc.componentDefinition(persistentId + DELIMITER + VERSION);
  componentDefinition.displayId = displayId;
  componentDefinition.persistentIdentity = persistentId;
  componentDefinition.version = VERSION;
  let role = SBOLDocument.terms[name];
  if (!role){
    role = SBOLDocument.terms.engineeredRegion;
  }
  componentDefinition.addRole(role);
  componentDefinition.addType(SBOLDocument.terms.dnaRegion);

  if (!makeTemplate && role !== SBOLDocument.terms.engineeredRegion){
    componentDefinitionObj[name] = componentDefinition;
  }

  return componentDefinition;
}


function handleOr(doc, parsedOr, categories){

  let variantDerivations = [];
  let orUnitCount = 1;

  //OR objects 1 and 2
  parsedOr.forEach(function (orObject){

    // every object in this loop should return
    // 1) ComponentDefinition
    // 2) template ComponentDefinition
    // 3) CombinatorialDerivation

    let name = '';
    if (orObject.Atom){
      name = orObject.Atom[0];
    }else{
      name = ORREGION + orRegionCount + UNIT + orUnitCount;
      orUnitCount += 1;
    }
    const componentDefinition = makeComponentDefinition(doc, name, false);
    const templateComponentDefinition = makeTemplateComponentDefinition(doc, name, componentDefinition);
    const combinatorialDerivation = makeCombinatorialDerivation(doc, orObject, templateComponentDefinition);
    const variableComponent = makeVariableComponent(doc, combinatorialDerivation.persistentIdentity, templateComponentDefinition.components[0], name, categories, null);
    combinatorialDerivation.addVariableComponent(variableComponent);

    variantDerivations.push(combinatorialDerivation);
  });

  let name = ORREGION + orRegionCount;
  orRegionCount += 1;
  const componentDefinition = makeComponentDefinition(doc, name, false);
  const templateComponentDefinition = makeTemplateComponentDefinition(doc, name, componentDefinition);
  const combinatorialDerivation = makeCombinatorialDerivation(doc, parsedOr, templateComponentDefinition);
  const variableComponent = makeVariableComponent(doc, combinatorialDerivation.persistentIdentity, templateComponentDefinition.components[0], name, null, variantDerivations);
  combinatorialDerivation.addVariableComponent(variableComponent);
}

function handleThen(doc, parsedThen){

  let thenComponents = [];

  //THEN objects 1 (subject) and 2 (object)
  parsedThen.forEach(function (thenObject){
    let name = '';
    let componentDefinition = makeComponentDefinition(doc, name);
    let templateComponentDefinition = makeTemplateComponentDefinition(doc, componentDefinition, thenObject);
    let component = makeComponent(doc, name, componentDefinition, templateComponentDefinition);
    templateComponentDefinition.addComponent(component);
    thenComponents.push(component);
  });

  let name = '';
  let componentDefinition = makeComponentDefinition(doc, name);
  let templateComponentDefinition = makeTemplateComponentDefinition(doc, componentDefinition, parsedThen);
  let sequenceConstraint = makeSequenceConstraint(doc, thenComponents[0], thenComponents[1]);
  templateComponentDefinition.addSequenceConstraint(sequenceConstraint);
}

function handleOperation(doc, op, parsed, categories){
  if (op === 'Or') {
    handleOr(doc, parsed[op], categories);
    return;
  }
  if (op === 'Then') {
    handleThen(doc, parsed);
  }
  if (op in OPERATOR_URIS) {
    let quantifier = op;
  }
  else {
    throw new Error('operator not supported');
  }
}


function generateSBOL(parsed, categories){
  const doc = new SBOLDocument();

  Object.keys(parsed).forEach(function (parsedKey){
    handleOperation(doc, parsedKey, parsed, categories);
  });

  //reset globals
  sequenceConstraintCount = 1;
  orRegionCount = 1;
  for (let atom in componentDefinitionObj) delete componentDefinitionObj[atom];

  return doc.serializeXML();
}

let sbol = generateSBOL;

if (typeof window === 'undefined') {
  module.exports = sbol;
}
