var designEnumeration = require('./js/designEnumeration');
var graphModule = require('./js/graph');
var imparse = require('imparse');

const GRAMMER_DEF = [{"Seq":[{"Then":[["Exp"],".",["Seq"]]},{"Then":[["Exp"],"then",["Seq"]]},{"":[["Exp"]]}]},{"Exp":[{"Or":[["Term"],"or",["Exp"]]},{"And":[["Term"],"and",["Exp"]]},{"":[["Term"]]}]},{"Term":[{"OneOrMore":["one-or-more",["Term"]]},{"ZeroOrMore":["zero-or-more",["Term"]]},{"":["{",["Seq"],"}"]},{"":["(",["Seq"],")"]},{"Atom":[{"RegExp":"([A-Za-z0-9]|-|_)+"}]}]}];


/* * * * * * */
/*    MAIN   */
/* * * * * * */
module.exports = function(langText, categories, numDesigns) {

  var parsed = '';
  try {
    parsed = imparse.parse(GRAMMER_DEF, langText);

  } catch(err) {
    console.error("Parsing error!");
    return;
  }


  var graph = graphModule(parsed);

  var designs = designEnumeration(graph.paths, categories, numDesigns);

  return {stateGraph: graph.stateGraph, designs: [], paths: graph.paths};
};

