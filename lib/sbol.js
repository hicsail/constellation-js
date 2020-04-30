const constants = require('./constants');
SBOLDocument = require('sboljs');

/**
 * @class Helper class for SBOL representation of a design space
 * See SBOL 2.2 specifications
 * https://sbolstandard.org/wp-content/uploads/2018/01/BBF-RFC114-SBOL2.2.0.pdf
 */
class sbolGeneration {

  constructor(designName) {
    this.doc = new SBOLDocument();
    this.sequenceConstraintCount = 1;
    this.orRegionCount = 1;
    this.cycleRegionCount = 1;
    this.atomMap = {}; // {atomText: componentDefinition, collections}
    this.DESIGN_NAME = designName || '';
    this.OPERATOR_URIS = {
      [constants.ZERO_SBOL]: constants.ZERO_MORE_URI,
      [constants.ZERO_MORE]: constants.ZERO_MORE_URI,
      [constants.ONE]: constants.ONE_URI,
      [constants.ONE_MORE]: constants.ONE_MORE_URI,
      [constants.ZERO_ONE]: constants.ZERO_ONE_URI,
      [constants.ZERO_ONE_SBOL]: constants.ZERO_ONE_URI,
    };
  }


  /*****************
   * STATIC HELPERS
   *****************/

  /**
   * Collapse the state stack when there is only one atom inside a MORE
   * @param stack
   */
  static collapseStack(stack){
    for(let i=0; i<stack.length; i++){
      let key = Object.keys(stack[i])[0];
      if (key ===constants.THEN){
        stack.splice(i,1); //remove THENs
      }
    }
    if(stack.length > 2){
      for(let i=0; i<stack.length-2; i++){
        let key = Object.keys(stack[i])[0];
        if (key === constants.ONE_MORE || key === constants.ZERO_SBOL || key === constants.ZERO_ONE_SBOL){
          if (Object.keys(stack[i+1])[0] === constants.ATOM && Object.keys(stack[i+2])[0] === 'end'){
            stack[i][key] = [stack[i+1].atom];
            stack.splice(i+1,1);
            stack.splice(i+1,1);
          }
        }
      }
    }
  }

  static createVariantComponentObj(operator, component, variantDVs, collections){
    return {
      operator: operator,
      component: component,
      variantDVs: variantDVs,
      collections: collections
    }
  }

  static createComponentDefObj(operator, componentDef, variantDVs, collections){
    return {
      operator: operator,
      componentDef: componentDef,
      variantDVs: variantDVs,
      collections: collections
    }
  }

  static createTemplateObj(operator, template, combDV, id){
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

  addToStacks(stacks, name, operator, variantDerivations, collections){
    if (!collections){
      collections = [];
      if (this.atomMap[name]){
        collections = this.atomMap[name].collections;
      }
    }
    // gets the one from atomMap if it exists
    const componentDefinition = this.makeComponentDefinition(name, variantDerivations);
    if (stacks.templates.length > 0){
      // if there's already a template on the stack, then add component to the template
      const lastTemplate = stacks.templates[stacks.templates.length-1].template;
      const component = this.makeComponent(componentDefinition, lastTemplate);
      lastTemplate.addComponent(component);
      stacks.variantComponents.push(sbolGeneration.createVariantComponentObj(operator, component, variantDerivations, collections));
    }else{
      // else, this is a new componentDef for the root
      stacks.componentDefs.push(sbolGeneration.createComponentDefObj(operator, componentDefinition, variantDerivations, collections));
    }
  }

  addComponentsAndRestraintsToTemplate(templateCD, stack, cv){
    if (!cv){
      cv = this.makeCombinatorialDerivation(templateCD);
    }
    let subject;
    let object;

    for(let stackObj of stack){
      let component = stackObj.component;
      if(!component){
        component = this.makeComponent(stackObj.componentDef, templateCD);
        templateCD.addComponent(component);
      }

      const variableComponent = this.makeVariableComponent(cv.persistentIdentity, component, stackObj.operator,
        stackObj.variantDVs, stackObj.collections);
      cv.addVariableComponent(variableComponent);

      object = component;
      if (subject && object){
        const sequenceConstraint = this.makeSequenceConstraint(templateCD, subject, object);
        templateCD.addSequenceConstraint(sequenceConstraint);
      }
      subject = object;
    }
    return cv;
  }


  /**
   * Group biological parts into collections
   * @param name Key in categories
   */
  makeCollection(name){
    const persistentId = constants.CONSTELLATION_URL + constants.DELIMITER + name + constants.COLLECTION + constants.DELIMITER + name;
    const collection = this.doc.collection(persistentId + constants.DELIMITER + constants.VERSION);
    collection.displayId = name;
    collection.persistentIdentity = persistentId;
    collection.version = constants.VERSION;

    return collection;
  }

  makeCombinatorialDerivation(templateComponentDefinition){
    const displayId = templateComponentDefinition.displayId + constants.COMBINATORIAL;
    const persistentId = templateComponentDefinition.persistentIdentity + constants.DELIMITER + displayId;
    const combinatorialDerivation = this.doc.combinatorialDerivation(persistentId + constants.DELIMITER + constants.VERSION);
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
  makeAtomComponentDefinition(name, roles){
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
    const componentDefinition = this.doc.componentDefinition(persistentId + constants.DELIMITER + constants.VERSION);
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
    this.atomMap[name] = {};
    this.atomMap[name].componentDefinition = componentDefinition;
    return componentDefinition;
  }

  makeTemplateSubCD(name){
    const prefix = constants.CONSTELLATION_URL + constants.DELIMITER + 'generic_definition/';
    const persistentId = prefix + name;
    const componentDefinition = this.doc.componentDefinition(persistentId + constants.DELIMITER + constants.VERSION);
    componentDefinition.displayId = name;
    componentDefinition.persistentIdentity = persistentId;
    componentDefinition.version = constants.VERSION;
    componentDefinition.addRole(SBOLDocument.terms.sequenceFeature);
    componentDefinition.addType(SBOLDocument.terms.dnaRegion); //specifies the category of biochemical or physical entity

    //add to atomMap
    this.atomMap[name] = {};
    this.atomMap[name].componentDefinition = componentDefinition;
    return componentDefinition;
  }

  makeComponentDefinition(name, variantDerivations, makeTemplate, makeRoot){
    if(name in this.atomMap && !makeTemplate && !makeRoot){
      return this.atomMap[name].componentDefinition;
    }

    const PREFIX = constants.CONSTELLATION_URL + constants.DELIMITER + this.DESIGN_NAME + constants.DELIMITER;
    const ROOT_PREFIX = PREFIX + 'root_template' + constants.DELIMITER;
    const TEMPLATE_PREFIX = PREFIX + constants.TEMPLATE + constants.DELIMITER;

    let displayId =  name;
    const prefix = makeRoot? ROOT_PREFIX: makeTemplate? TEMPLATE_PREFIX : PREFIX;
    const persistentId = prefix + displayId;
    const componentDefinition = this.doc.componentDefinition(persistentId + constants.DELIMITER + constants.VERSION);
    componentDefinition.displayId = displayId;
    componentDefinition.persistentIdentity = persistentId;
    componentDefinition.version = constants.VERSION;
    if (variantDerivations.length === 0) {
      componentDefinition.addRole(SBOLDocument.terms.sequenceFeature);
    } else {
      componentDefinition.addRole(SBOLDocument.terms.engineeredRegion);
    }

    componentDefinition.addType(SBOLDocument.terms.dnaRegion);

    //add to atomMap
    if(!makeTemplate && !makeRoot){
      this.atomMap[name] = {};
      this.atomMap[name].componentDefinition = componentDefinition;
    }
    return componentDefinition;
  }

  makeComponent(componentDefinition, template){
    let num = 1;
    // make name unique if component is already in the template
    for (let comp of template.components){
      if (comp.definition.uri === componentDefinition.uri){
        num = Number.parseInt(comp.displayId[comp.displayId.length -1], 10) + 1;
      }
    }

    const displayId = componentDefinition.displayId + constants.COMPONENT + num;
    const persistentId =  template.persistentIdentity + constants.DELIMITER + displayId;
    const atomComponent = this.doc.component(persistentId + constants.DELIMITER + constants.VERSION);
    atomComponent.displayId = displayId;
    atomComponent.persistentIdentity = persistentId;
    atomComponent.version = constants.VERSION;
    atomComponent.definition = componentDefinition;
    return atomComponent;
  }

  makeVariableComponent(templateId, component, operator, variantDerivations, collections){
    let displayId = component.displayId + constants.VARIABLE;
    const persistentId = templateId + constants.DELIMITER + displayId;
    const variableComponent = this.doc.variableComponent(persistentId + constants.DELIMITER + constants.VERSION);
    variableComponent.displayId = displayId;
    variableComponent.persistentIdentity = persistentId;
    variableComponent.version = constants.VERSION;
    variableComponent.variable = component;
    variableComponent.operator = this.OPERATOR_URIS[operator];

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

  makeSequenceConstraint(templateCD, subject, object){
    //subject precedes object
    let displayId = templateCD.displayId + constants.SEQUENCE_CONSTRAINT + this.sequenceConstraintCount;
    const persistentId =  templateCD.persistentIdentity + constants.DELIMITER + displayId;
    const sequenceConstraint = this.doc.sequenceConstraint(persistentId + constants.DELIMITER + constants.VERSION);
    sequenceConstraint.displayId = displayId;
    sequenceConstraint.persistentIdentity = persistentId;
    sequenceConstraint.version = constants.VERSION;
    sequenceConstraint.subject = subject;
    sequenceConstraint.object = object;
    sequenceConstraint.restriction = constants.SEQUENCE_CONSTRAINT_URIS.PRECEDE;
    this.sequenceConstraintCount += 1;

    return sequenceConstraint
  }


  /**
   * Traverse the state stack to make the SBOL
   * @param stateStack Custom stack generated from Constellation state graph
   * @param componentDefStack Component Definitions returned to one level above
   */
  makeSBOLFromStack(stateStack, componentDefStack){
    let stacks = {};
    stacks.templates = [];
    stacks.variantComponents = [];
    stacks.componentDefs = componentDefStack;
    sbolGeneration.collapseStack(stateStack);

    for (let stackObj of stateStack) {
      const key = Object.keys(stackObj)[0];
      switch (key) {
        case constants.ATOM:
          this.addToStacks(stacks, stackObj[key], constants.ONE, null, null);
          break;
        case constants.OR:
          let orIdentity = constants.ORREGION + this.orRegionCount;
          this.orRegionCount += 1;
          let variantDerivations = [];
          let orCollections = [];
          this.addToStacks(stacks, orIdentity, constants.ONE, variantDerivations, orCollections);

          let orSubRegionCount = 1;
          for (let orRegion of stackObj[key]){
            let orStack = [];
            this.makeSBOLFromStack(orRegion, orStack);
            if (orStack.length === 1 && orStack[0].operator === constants.ONE){
              orCollections.push(...orStack[0].collections);
            } else {
              let orSubIdentity = orIdentity + constants.ORSUBREGION + orSubRegionCount;
              orSubRegionCount += 1;
              const orTemplate = this.makeComponentDefinition(orSubIdentity, [], true);
              const cv = this.addComponentsAndRestraintsToTemplate(orTemplate, orStack);
              variantDerivations.push(cv);
            }
          }
          break;
        case constants.ONE_MORE: //fall through
        case constants.ZERO_SBOL:
        case constants.ZERO_ONE_SBOL:
        case constants.ZERO_MORE:
        case constants.ZERO_ONE:
          // only one atom within the -or-more operator
          if (Array.isArray(stackObj[key])){
            this.addToStacks(stacks, stackObj[key][0], key, null, null);
          } else {
            let identity = constants.CYCLEREGION + this.cycleRegionCount;
            this.cycleRegionCount += 1;
            const templateCD = this.makeComponentDefinition(identity, [], true);
            const cv = this.makeCombinatorialDerivation(templateCD);
            this.addToStacks(stacks, identity, key, [cv], null);
            stacks.templates.push(sbolGeneration.createTemplateObj(key, templateCD, cv, stackObj[key]));
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
          this.addComponentsAndRestraintsToTemplate(templateObj.template, componentsStack, cv);
          break;
      }
    }
  }
}

module.exports = sbolGeneration;
