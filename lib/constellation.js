'use strict';

const designEnumeration = require('./designEnumeration');
const Graph = require('./graph');
const imparse = require('imparse');

const GRAMMAR_DEF = [{'Seq':[{'Then':[['Exp'],'.',['Seq']]},{'Then':[['Exp'],'then',['Seq']]},{'':[['Exp']]}]},{'Exp':[{'Or':[['Term'],'or',['Exp']]},{'And':[['Term'],'and',['Exp']]},{'':[['Term']]}]},{'Term':[{'OneOrMore':['one-or-more',['Term']]},{'ZeroOrMore':['zero-or-more',['Term']]},{'':['{',['Seq'],'}']},{'':['(',['Seq'],')']},{'Atom':[{'RegExp':'([A-Za-z0-9]|-|_)+'}]}]}];

/* * * * * * */
/*    MAIN   */
/* * * * * * */
/**
 * Runs constellation
 * @param langText Text with GOLDBAR specification input
 * @param categories Text with categories
 * @param numDesigns Maximum number of designs to output
 * @returns {{stateGraph, designs: *, paths}}
 */
const constellation = function (langText, categories, numDesigns) {
  let parsed;
  try {
    parsed = parseGoldbar(langText);
  } catch (err) {
    console.error('Parsing error!');
    return;
  }

  const graph = Graph(parsed);
  const designs = designEnumeration(graph.paths, categories, numDesigns);

  return {stateGraph: graph.stateGraph, designs: designs, paths: graph.paths};
};

/**
 * Sanitises specification input and parses GOLDBAR
 * @param langText Text with GOLDBAR specification text
 * @returns {object} Parsed object
 */
function parseGoldbar(langText) {
  langText = String(langText).replace('\t', ' ');
  return imparse.parse(GRAMMAR_DEF, langText);
}

if (typeof window === 'undefined') {
  module.exports = constellation;
}
