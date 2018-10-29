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
const COMBINATORIAL = '_combinatorial_derivation';
const SEQUENCE_CONSTRAINT = '_sequence_constraint';
const COMPONENT = '_component';
const VARIABLE = '_variable';
const ORREGION = 'or_unit';
const ORSUBREGION = '_or_subunit';
const CYCLEREGION = 'cyclical_unit';

const OPERATOR_URIS = {
  [graph.ZERO_SBOL]: 'http://sbols.org/v2#zeroOrMore',
  'one': 'http://sbols.org/v2#one',
  [graph.ONE_MORE]: 'http://sbols.org/v2#oneOrMore'
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

function makeVariableComponent(doc, templateId, component, operator, variantDerivations){
  let displayId = component.displayId + VARIABLE;
  const persistentId = templateId + DELIMITER + displayId;
  const variableComponent = doc.variableComponent(persistentId + DELIMITER + VERSION);
  variableComponent.displayId = displayId;
  variableComponent.persistentIdentity = persistentId;
  variableComponent.version = VERSION;
  variableComponent.variable = component;
  variableComponent.operator = OPERATOR_URIS[operator];

  let compStr = component.displayId.split('_')[0];
  if (atomMap[compStr]){
    let variants = atomMap[compStr].variants;
    if (variants){
      variants.forEach(function(variant){
        variableComponent.addVariant(atomMap[variant].componentDefinition);
      });
    }
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


// breadth width search
function populateStack(stateGraph, stack, id){
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


//depth first search for OR
function traverseOr(stack, tempStack, stateGraph, id, endIds){
  let lastEdge;
  stateGraph[id].visited = true;

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
      } else{
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
      if (stateGraph[edge].operator.includes(graph.ONE_MORE)
            || stateGraph[edge].operator.includes(graph.ZERO_SBOL)){
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

function traverseStack(doc, stack, componentDefStack, templateStack, tempVCStack){
  stack.forEach(function(stackObj){
    for (let key in stackObj){

      if (key === graph.ONE_MORE || key === graph.ZERO_SBOL){
        let identity = CYCLEREGION + cycleRegionCount;
        cycleRegionCount += 1;
        const componentDefinition = makeComponentDefinition(doc, identity);
        const templateCD = makeComponentDefinition(doc, identity, true);
        const cv = makeCombinatorialDerivation(doc, templateCD);

        if (templateStack.length > 0){
          // if there's already a template on the stack, then add component to the template
          const lastTemplate = templateStack[templateStack.length-1].template;
          const component = makeComponent(doc, componentDefinition, lastTemplate.persistentIdentity);
          lastTemplate.addComponent(component);

          tempVCStack.push({operator: key, component: component, variantDV:[cv]});
        }else{
          // else, this is a new componentDef for the root
          componentDefStack.push({operator: key, componentDef: componentDefinition, variantDV: [cv]});
        }

        // add template for the one-or-more to the temp stack
        templateStack.push({id: stackObj[key], operator: key, template: templateCD, combDV: cv});
      }

      if (key === graph.ATOM){
        let name = stackObj[key];
        const componentDefinition = makeComponentDefinition(doc, name);
        if (templateStack.length > 0){
          // add component to the template
          const lastTemplate = templateStack[templateStack.length-1].template;
          const component = makeComponent(doc, componentDefinition, lastTemplate.persistentIdentity);
          lastTemplate.addComponent(component);

          tempVCStack.push({operator: 'one', component: component});
        }else{
          componentDefStack.push({operator: 'one', componentDef: componentDefinition, variantDV: []});
        }
      }

      if (key === 'end'){
        // remove the last template
        const index = templateStack.indexOf(template => template.id === stackObj[key]);
        const templateObj = templateStack.splice(index, 1)[0];
        const cv = templateObj.combDV;

        // get length of components under the component and pop
        // the same number from the temp VariantComponent stack
        const lengthOfComponents = templateObj.template._components.length;
        for (let i=0; i< lengthOfComponents; i++){
          let componentObj = tempVCStack.pop();
          const vc = makeVariableComponent(doc, cv.persistentIdentity, componentObj.component, componentObj.operator, componentObj.variantDV);
          cv.addVariableComponent(vc);
        }
      }

      if (key === graph.OR){
        let orIdentity = ORREGION + orRegionCount;
        orRegionCount += 1;

        let variantDerivations = [];
        const componentDefinition = makeComponentDefinition(doc, orIdentity);

        if (templateStack.length > 0){
          // if there's already a template on the stack, then add component to the template
          const lastTemplate = templateStack[templateStack.length-1].template;
          const component = makeComponent(doc, componentDefinition, lastTemplate.persistentIdentity);
          lastTemplate.addComponent(component);

          // keep track of components within another template
          tempVCStack.push({operator: 'one', component: component, variantDV: variantDerivations});
        }else{
          // else this is a new componentDef for the root
          componentDefStack.push({operator: 'one', componentDef: componentDefinition, variantDV: variantDerivations});
        }

        //const templateComponentDefinition = makeComponentDefinition(doc, orIdentity, true);
        //templateStack.push({id: [key], operator: 'one', template: templateComponentDefinition});

        let orSubRegionCount = 1;
        stackObj[key].forEach(function (orRegion){
          let orSubIdentity = orIdentity + ORSUBREGION + orSubRegionCount;
          orSubRegionCount += 1;

          let cdStack = [];
          let orStack = traverseStack(doc, orRegion, cdStack, templateStack, tempVCStack);
          const templateComponentDefinition = makeComponentDefinition(doc, orSubIdentity, true);
          let componentObjs = [];
          orStack.componentDefs.forEach(function(componentDefObj){
            const component = makeComponent(doc, componentDefObj.componentDef, templateComponentDefinition.persistentIdentity);
            componentObjs.push({operator: componentDefObj.operator, component: component, variantDV: componentDefObj.variantDV});
          });

          //Create combinatorial derivation for the or subunit
          const cv = makeCombinatorialDerivation(doc, templateComponentDefinition);
          variantDerivations.push(cv);

          if (componentObjs.length > 0){
            addComponentsToTemplate(doc, templateComponentDefinition, componentObjs);
            addVariableComponentsToCV(doc, cv, componentObjs);
          }
        });
      }
    }
  });

  return {componentDefs: componentDefStack}
}


function addComponentsToTemplate(doc, templateComponentDefinition, componentObjs){
  templateComponentDefinition.addComponent(componentObjs[0].component);
  for (let i=1; i<componentObjs.length;i++){
    templateComponentDefinition.addComponent(componentObjs[i].component);
    // add sequence constraints
    let subject = componentObjs[i-1].component;
    let object = componentObjs[i].component;
    let sequenceConstraint = makeSequenceConstraint(doc, templateComponentDefinition, subject, object);
    templateComponentDefinition.addSequenceConstraint(sequenceConstraint);
  }
}

function addVariableComponentsToCV(doc, templateCV, componentObjs){
  componentObjs.forEach(function (componentObj){
    const variableComponent = makeVariableComponent(doc, templateCV.persistentIdentity,
                                                    componentObj.component, componentObj.operator,
                                                    componentObj.variantDV);
    templateCV.addVariableComponent(variableComponent);
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
  populateStack(stateGraph, stack, rootId); //create a new stack from the graph that's better for SBOL structure
  console.log(JSON.stringify(stack, null, 2));

  let componentDefStack = []; // for root to make components
  let templateStack = [];
  let tempVCStack = []; //variant components
  let sbolStack = traverseStack(doc, stack, componentDefStack, templateStack, tempVCStack);
  console.log(sbolStack);

  const identity = 'design_name';
  const rootComponentDefinition = makeComponentDefinition(doc, identity, false, true);
  let componentObjs = [];
  sbolStack.componentDefs.forEach(function(componentDefObj){
    const component = makeComponent(doc, componentDefObj.componentDef, rootComponentDefinition.persistentIdentity);
    componentObjs.push({operator: componentDefObj.operator, component: component, variantDV: componentDefObj.variantDV});
  });

  //Create combinatorial derivation for the root template
  const rootCV = makeCombinatorialDerivation(doc, rootComponentDefinition);

  if (componentObjs.length > 0){
    addComponentsToTemplate(doc, rootComponentDefinition, componentObjs); //including sequence constraints
    addVariableComponentsToCV(doc, rootCV, componentObjs);
  }

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
