'use strict';

let designEnumeration = require('./designEnumeration');
let graph = require('./graph');
let imparse = require('imparse');

const GRAMMAR_DEF = [{'Seq':[{'Then':[['Exp'],'.',['Seq']]},{'Then':[['Exp'],'then',['Seq']]},{'':[['Exp']]}]},{'Exp':[{'Or':[['Term'],'or',['Exp']]},{'And':[['Term'],'and',['Exp']]},{'':[['Term']]}]},{'Term':[{'OneOrMore':['one-or-more',['Term']]},{'ZeroOrMore':['zero-or-more',['Term']]},{'':['{',['Seq'],'}']},{'':['(',['Seq'],')']},{'Atom':[{'RegExp':'([A-Za-z0-9]|-|_)+'}]}]}];

/* * * * * * */
/*    MAIN   */
/* * * * * * */
const constellation = function (langText, categories, numDesigns) {
  let parsed = '';
  try {
    parsed = imparse.parse(GRAMMAR_DEF, langText);
  } catch (err) {
    console.error('Parsing error!');
    return;
  }

  const gra = graph(parsed);
  const designs = designEnumeration(gra.paths, categories, numDesigns);

  return {stateGraph: gra.stateGraph, designs: designs, paths: gra.paths};
};

if (typeof window === 'undefined') {
  module.exports = constellation;
}
