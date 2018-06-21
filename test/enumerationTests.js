'use strict';

const expect = require('chai').expect;
const enumeration = require('../lib/designEnumeration');
const uuidv4 = require('uuidv4');

const ATOM = 'atom';

function generateAtom(text) {
  return {id: uuidv4(), text: text, type: ATOM, edges: []};
}

module.exports = function() {
  describe('Design enumeration', function() {
    it('Enumerate designs for one atom', function() {
      const categories = {'promoter': ['a1']};
      const paths = [[generateAtom('promoter')]];
      const designs = enumeration(paths, categories, 1);
      expect(JSON.stringify(designs)).to.contain('a1');
    });

    it('Handle defined but empty category', function() {
      const categories = {'promoter': []};
      const paths = [[generateAtom('promoter')]];
      const designs = enumeration(paths, categories, 1);
      expect(JSON.stringify(designs)).to.equal('[]');
    });

    it('Handle empty categories', function() {
      const categories = {};
      const paths = [[generateAtom('promoter')]];
      expect(() => enumeration(paths, categories, 1)).to.throw('promoter is not defined in categories');
    });

    it('Handle undefined atom', function() {
      const categories = {'b': ['b']};
      const paths = [[generateAtom('promoter')]];
      expect(() => enumeration(paths, categories, 1)).to.throw('promoter is not defined in categories');
    });

    it('Enumerate all duplicates in category', function() {
      const categories = {'promoter': ['a1', 'a2']};
      const path = [generateAtom('promoter')];
      const paths = [path, path];
      const designs = enumeration(paths, categories, 4);
      expect(JSON.stringify(designs)).to.equal(JSON.stringify(categories['promoter']));
    });

    // it('Multi-level graphs', function() {
    //   const collection = {'promoter': ['a1', 'a2'], 'b': ['b1']};
    //   const path = [generateRoot(), generateAtom('promoter')];
    //   const paths = [path, path];
    //   const designs = enumeration(paths, collection, 4);
    //   // TODO finish
    // });

    describe ('Number of designs chosen', function() {
      it('Select 1 of 2 designs', function () {
        const categories = {'promoter': ['a1', 'a2']};
        const paths = [[generateAtom('promoter')]];
        const designs = enumeration(paths, categories, 1);
        expect(designs.length).to.equal(1);
      });

      it('Select 0 designs', function () {
        const categories = {'promoter': ['a1', 'a2']};
        const paths = [[generateAtom('promoter')]];
        const designs = enumeration(paths, categories, 0);
        expect(designs.length).to.equal(0);
      });
    });
  });

  describe('Cartesian product tests', function() {
    it('Empty setA', function() {
      let setA = [];
      let setB = ['promoter', 'b'];
      expect(enumeration.getCartesianProduct(setA, setB)).to.equal(setB);
    });
    it('Empty setB', function() {
      let setA = ['promoter', 'b'];
      let setB = [];
      expect(enumeration.getCartesianProduct(setA, setB)).to.equal(setA);
    });
    it('Product test', function() {
      let setA = ['promoter', 'b'];
      let setB = ['c', 'd'];
      let result = enumeration.getCartesianProduct(setA, setB);
      expect(result).to.contain('promoter,c');
      expect(result).to.contain('promoter,d');
      expect(result).to.contain('b,c');
      expect(result).to.contain('b,d');
    })
  })

};
