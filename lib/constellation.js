if (typeof window === 'undefined') {
  designEnumeration = require('./designEnumeration');
  graph = require('./graph');
  imparse = require('imparse');
}

const GRAMMER_DEF = [{"Seq":[{"Then":[["Exp"],".",["Seq"]]},{"Then":[["Exp"],"then",["Seq"]]},{"":[["Exp"]]}]},{"Exp":[{"Or":[["Term"],"or",["Exp"]]},{"And":[["Term"],"and",["Exp"]]},{"":[["Term"]]}]},{"Term":[{"OneOrMore":["one-or-more",["Term"]]},{"ZeroOrMore":["zero-or-more",["Term"]]},{"":["{",["Seq"],"}"]},{"":["(",["Seq"],")"]},{"Atom":[{"RegExp":"([A-Za-z0-9]|-|_)+"}]}]}];

/* * * * * * */
/*    MAIN   */
/* * * * * * */
var constellation = function(langText, categories, numDesigns) {
  var parsed = '';
  try {
    parsed = imparse.parse(GRAMMER_DEF, langText);
  } catch(err) {
    console.error("Parsing error!");
    return;
  }

  var gra = graph(parsed);

  var designs = designEnumeration(gra.paths, categories, numDesigns);

  return {stateGraph: gra.stateGraph, designs: designs, paths: gra.paths};
};

if (typeof window === 'undefined') {
  module.exports = constellation;
}
