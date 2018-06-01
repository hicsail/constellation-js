'use strict';

const expect = require('chai').expect;
const enumeration = require('../lib/designEnumeration');
const uuidv4 = require('uuidv4');

const ATOM = 'atom';

function generateRoot() {
  return {'id': 'root',
    'data': {
      'text': 'root',
      'dataType': 'root',
      'edges': []}};
}

function generateAtom() {
  return {id: uuidv4(), data: {text: 'a', dataType: ATOM, edges: []}};
}

module.exports = function() {
  describe('Design enumeration', function() {
    it('Enumerate designs for one atom', function() {
      const collection = {'a': ['a']};
      const paths = [[generateRoot(), generateAtom()]];
      const designs = enumeration(paths, collection, 1);
      expect(JSON.stringify(designs)).to.equal(JSON.stringify(collection['a']));
    });

    it('Handle empty categories', function() {
      const collection = {'d': []};
      const paths = [[generateRoot(), generateAtom()]];
      const designs = enumeration(paths, collection, 1);
      expect(designs.length).to.equal(0);
      expect(designs).to.be.an('array').that.is.empty;
    });

    it('Enumerate all duplicates in category', function() {
      const collection = {'a': ['a1', 'a2']};
      const path = [generateRoot(), generateAtom()];
      const paths = [path, path];
      const designs = enumeration(paths, collection, 4);
      expect(JSON.stringify(designs)).to.equal(JSON.stringify(collection['a']));
    });

    it('Multi-level graphs', function() {
      const collection = {'a': ['a1', 'a2'], 'b': ['b1']};
      const path = [generateRoot(), generateAtom()];
      const paths = [path, path];
      const designs = enumeration(paths, collection, 4);
    });

    describe ('Number of designs chosen', function() {
      it('Select 1 of 2 designs', function () {
        const collection = {'a': ['a1', 'a2']};
        const paths = [[generateRoot(), generateAtom()]];
        const designs = enumeration(paths, collection, 1);
        expect(designs.length).to.equal(1);
      });

      it('Select 0 designs', function () {
        const collection = {'a': ['a1', 'a2']};
        const paths = [[generateRoot(), generateAtom()]];
        const designs = enumeration(paths, collection, 0);
        expect(designs.length).to.equal(0);
      });
    });
  });

  describe('Cartesian product tests', function() {
    it('Empty setA', function() {
      let setA = [];
      let setB = ['a', 'b'];
      expect(enumeration.getCartesianProduct(setA, setB)).to.equal(setB);
    })
    it('Empty setB', function() {
      let setA = ['a', 'b'];
      let setB = [];
      expect(enumeration.getCartesianProduct(setA, setB)).to.equal(setA);
    })
    it('Product test', function() {
      let setA = ['a', 'b'];
      let setB = ['c', 'd'];
      let result = enumeration.getCartesianProduct(setA, setB);
      expect(result).to.contain('a,c');
      expect(result).to.contain('a,d');
      expect(result).to.contain('b,c');
      expect(result).to.contain('b,d');
    })
  })

};
