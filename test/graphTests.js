/* eslint-disable no-unused-vars */
'use strict';

// noinspection JSUnusedLocalSymbols
const expect = require('chai').expect;
// noinspection JSUnusedLocalSymbols
// noinspection JSUnusedLocalSymbols
const imparse = require('imparse');

// noinspection JSUnusedLocalSymbols
const GRAMMER_DEF = [{'Seq':[{'Then':[['Exp'],'.',['Seq']]},{'Then':[['Exp'],'then',['Seq']]},{'':[['Exp']]}]},{'Exp':[{'Or':[['Term'],'or',['Exp']]},{'And':[['Term'],'and',['Exp']]},{'':[['Term']]}]},{'Term':[{'OneOrMore':['one-or-more',['Term']]},{'ZeroOrMore':['zero-or-more',['Term']]},{'':['{',['Seq'],'}']},{'':['(',['Seq'],')']},{'Atom':[{'RegExp':'([A-Za-z0-9]|-|_)+'}]}]}];

module.exports = function() {
  describe('Graph tests', function() {
    it ('', function () {

    });
    // TODO add more

  });
};
