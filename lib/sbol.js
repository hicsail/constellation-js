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
    this.SO_TERM_MAP = { // for abstract parts whose role names do not match the SO term
      ribosomeBindingSite: 'ribosome_entry_site',
      cds: 'CDS',
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

  addComponentsAndRestraintsToTemplate(templateCD, stack, cv, name=null, makeRoot=false){
    if (!cv) {
      cv = this.makeCombinatorialDerivation(templateCD, name, makeRoot);
    }
    let subject;
    let object;

    for(let stackObj of stack){
      let component = stackObj.component;
      if(!component){
        // in the case of atoms being THEN-ed inside an OR, the CDs still need to be made
        if (!stackObj.componentDef) {
          stackObj.componentDef = this.makeComponentDefinition(stackObj.name);
        }
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
  makeCollection(name) {
    const displayId = name + constants.COLLECTION;
    const persistentId = constants.CONSTELLATION_URL + constants.DELIMITER + displayId;
    const collection = this.doc.collection(persistentId + constants.DELIMITER + constants.VERSION);
    collection.displayId = displayId;
    collection.persistentIdentity = persistentId;
    collection.version = constants.VERSION;

    return collection;
  }

  makeCombinatorialDerivation(templateComponentDefinition, name, makeRoot = false) {
    let displayId;
    if (makeRoot) {
      displayId = name + constants.COMBINATORIAL;
    } else {
      displayId = this.DESIGN_NAME + '_' + name + constants.COMBINATORIAL;
    }
    const persistentId = constants.CONSTELLATION_URL + constants.DELIMITER + displayId;
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
  makeAtomComponentDefinition(name, roles, abstract=false) {
    /* code for using SBH URIs for persistentIDs instead of creating new ones:
    // let persistentId;
    // let match = name.match(/^[A-Za-z]\\w*$/);
    // if (match === name) {
    //   atomMap[name] = {};
    //   atomMap[name].componentDefinition = name;
    //   return name;
    // }
     */

    /* code for attaching the design name to concrete part names
    // let displayId;
    // if abstract part, displayId is just role name (which is passed in as 'name')
    // if (abstract) {
    //   displayId = name;
    // } else {
    //   displayId = this.DESIGN_NAME + '_' + name;
    // }
     */

    let displayId;
    if (abstract) {
      // if abstract part's role name does not match SO term, use SO term
      if (name in this.SO_TERM_MAP) {
        displayId = this.SO_TERM_MAP[name];
      } else {
        displayId = name;
      }
    } else { // if not an abstract part, use part id
      displayId = name;
    }

    const persistentId = constants.CONSTELLATION_URL + constants.DELIMITER + displayId;
    const componentDefinition = this.doc.componentDefinition(persistentId + constants.DELIMITER + constants.VERSION);
    componentDefinition.displayId = displayId;
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

  makeTemplateSubCD(name) {
    const displayId = this.DESIGN_NAME + '_' + name;
    const persistentId = constants.CONSTELLATION_URL + constants.DELIMITER + displayId;
    const componentDefinition = this.doc.componentDefinition(persistentId + constants.DELIMITER + constants.VERSION);
    componentDefinition.displayId = displayId;
    componentDefinition.persistentIdentity = persistentId;
    componentDefinition.version = constants.VERSION;
    componentDefinition.addRole(SBOLDocument.terms.so.sequenceFeature);
    componentDefinition.addType(SBOLDocument.terms.dnaRegion); //specifies the category of biochemical or physical entity

    //add to atomMap
    this.atomMap[name] = {};
    this.atomMap[name].componentDefinition = componentDefinition;
    return componentDefinition;
  }

  makeComponentDefinition(name, variantDerivations, makeTemplate, makeRoot) {
    if(name in this.atomMap && !makeTemplate && !makeRoot){
      return this.makeTemplateSubCD(name);
    }

    const ID = this.DESIGN_NAME + '_' + name;
    const ROOT_ID = name + '_root_template';
    const TEMPLATE_ID = ID + '_template';

    const PID = constants.CONSTELLATION_URL + constants.DELIMITER + ID;
    const ROOT_PID = constants.CONSTELLATION_URL + constants.DELIMITER + ROOT_ID;
    const TEMPLATE_PID = constants.CONSTELLATION_URL + constants.DELIMITER + TEMPLATE_ID;

    let displayId =  makeRoot? ROOT_ID: makeTemplate? TEMPLATE_ID : ID;
    const persistentId = makeRoot? ROOT_PID: makeTemplate?TEMPLATE_PID: PID;
    const componentDefinition = this.doc.componentDefinition(persistentId + constants.DELIMITER + constants.VERSION);
    componentDefinition.displayId = displayId;
    componentDefinition.persistentIdentity = persistentId;
    componentDefinition.version = constants.VERSION;
    if (variantDerivations.length === 0 && !makeRoot) {
      componentDefinition.addRole(SBOLDocument.terms.so.sequenceFeature);
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
   * @param fromOr whether this call is being made for an OR sub region
   */
  makeSBOLFromStack(stateStack, componentDefStack, fromOr=false){
    let stacks = {};
    stacks.templates = [];
    stacks.variantComponents = [];
    stacks.componentDefs = componentDefStack;
    sbolGeneration.collapseStack(stateStack);

    for (let stackObj of stateStack) {
      const key = Object.keys(stackObj)[0];
      switch (key) {
        case constants.ATOM:
          if (!fromOr) {
            this.addToStacks(stacks, stackObj[key], constants.ONE, null, null);
          } else { // single atoms that are being OR-ed do not need their own ComponentDefinitions
            let collections = [];
            if (this.atomMap[stackObj[key]]){
              collections = this.atomMap[stackObj[key]].collections;
            }
            stacks.componentDefs.push({operator:constants.ONE, name: stackObj[key], collections});
          }
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
            this.makeSBOLFromStack(orRegion, orStack, true);
            if (orStack.length === 1 && orStack[0].operator === constants.ONE){
              orCollections.push(...orStack[0].collections);
            } else {
              let orSubIdentity = orIdentity + constants.ORSUBREGION + orSubRegionCount;
              orSubRegionCount += 1;
              const orTemplate = this.makeComponentDefinition(orSubIdentity, [], true);
              const cv = this.addComponentsAndRestraintsToTemplate(orTemplate, orStack, null, orSubIdentity);
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
            const cv = this.makeCombinatorialDerivation(templateCD, identity);
            this.addToStacks(stacks, identity, key, [cv], []);
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
