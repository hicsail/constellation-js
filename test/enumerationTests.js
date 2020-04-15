'use strict';

const expect = require('chai').expect;
const enumeration = require('../lib/designEnumeration');
const uuidv4 = require('uuidv4');

const CELLO_CATS = { "Cello_promoter": { "promoter": ["pLitR", "pQacR", "pIcaRA", "pSrpR", "pPhlF", "pLuxStar", "pTac", "pAmtR", "pTet", "pLmrA", "pCONST", "pAmeR", "pBAD", "pBetI", "pHlyIIR", "pBM3R1", "pPsrA"]},
  "Cello_CDS": {"cds": ["sigmaK1FR", "LmrA", "LacI", "QacR", "LitR", "IcaRA", "SrpR", "PhlF", "LuxR", "AmtR", "TetR", "AmeR", "BetI", "HlyIIR", "BM3R1", "PsrA", "BFP", "sigmaT3", "sigmaCGG", "AraC", "sigmaT7", "YFP", "RFP"]},
  "Cello_RBS": {"ribosomeBindingSite": ["P2", "N1", "B3", "S1", "BBa_B0064_rbs", "S2", "H1", "E1", "Q2", "P1", "B1", "S4", "R1", "B2", "L1", "Q1", "A1", "P3", "F1", "I1", "S3"]},
  "Cello_terminator": {"terminator": ["L3S2P24", "L3S2P11", "ECK120010818", "ECK120019600", "ECK120010876", "L3S3P11", "ECK120033736", "L3S3P31", "ECK120033737", "L3S2P21_terminator", "ECK120016170", "ECK120029600", "ECK120015440", "L3S2P55"]},
  "Cello_ribozyme": {"ribozyme": ["RiboJ54", "BydvJ", "RiboJ10", "SarJ", "RiboJ51", "RiboJ57", "ElvJ", "PlmJ", "ScmJ", "RiboJ", "RiboJ60", "RiboJ53", "RiboJ64"]}
};

const ATOM = 'atom';

function generateAtom(text) {
  return {id: uuidv4(), text: text, type: ATOM, edges: []};
}

function getAllIDs(category) {
  let ids = [];
  for (let role in category) {
    ids = [...new Set(ids.concat(category[role]))];
  }
  return ids;
}


module.exports = function() {
  describe('Design enumeration', function() {
    it('Enumerate designs for one atom', function() {
      const categories = {'a': {'a': ['a']}};
      const paths = [[generateAtom('a')]];
      const designs = enumeration.enumerateDesigns(paths, categories, 1).designs;
      expect(JSON.stringify(designs)).to.contain('a');
    });

    it('Handle defined but empty category', function() {
      const categories = {'a': {'a': []}};
      const paths = [[generateAtom('a')]];
      const designs = enumeration.enumerateDesigns(paths, categories, 1).designs;
      expect(JSON.stringify(designs)).to.equal('[]');
    });

    it('Handle empty categories', function() {
      const categories = {};
      const paths = [[generateAtom('a')]];
      expect(() => enumeration.enumerateDesigns(paths, categories, 1)).to.throw('a is not defined in categories');
    });

    it('Handle undefined atom', function() {
      const categories = {'b': {'b': ['b']}};
      const paths = [[generateAtom('a')]];
      expect(() => enumeration.enumerateDesigns(paths, categories, 1)).to.throw('a is not defined in categories');
    });

    it('Enumerate all duplicates in category', function() {
      const categories = {'a': {'a': ['a1', 'a2']}};
      const path = [generateAtom('a')];
      const paths = [path, path];
      const designs = enumeration.enumerateDesigns(paths, categories, 4).designs;
      expect(JSON.stringify(designs)).to.equal(JSON.stringify(getAllIDs(categories['a'])));
    });

    describe('Prune part IDs if cartesian product is too large', function () {
      it('one-or-more(Cello_promoter then zero-or-one(Cello_promoter) then Cello_ribozyme then Cello_RBS then Cello_CDS then Cello_terminator)', function () {
        const categories = CELLO_CATS;
        const pathStrs = [["Cello_promoter", "Cello_promoter", "Cello_ribozyme", "Cello_RBS", "Cello_CDS", "Cello_terminator"],
          ["Cello_promoter", "Cello_ribozyme", "Cello_RBS", "Cello_CDS", "Cello_terminator"]];
        let paths = [];
        for (let pathStr of pathStrs) {
          let path = [];
          for (let str of pathStr) {
            path.push(generateAtom(str));
          }
          paths.push(path);
        }
        const designs = enumeration.enumerateDesigns(paths, categories, 40);
        expect(designs.designs.length).to.equal(40);
        expect(designs.totalNum).to.equal(26899236);
      });

      it('one-or-more (Cello_promoter or Cello_RBS) then (zero-or-more Cello_CDS) then Cello_terminator', function () {
        const categories = CELLO_CATS;
        const pathStrs = [["Cello_promoter", "Cello_terminator"], ["Cello_RBS", "Cello_terminator"],
          ["Cello_promoter", "Cello_CDS", "Cello_terminator"], ["Cello_RBS", "Cello_CDS", "Cello_terminator"]];
        let paths = [];
        for (let pathStr of pathStrs) {
          let path = [];
          for (let str of pathStr) {
            path.push(generateAtom(str));
          }
          paths.push(path);
        }
        const designs = enumeration.enumerateDesigns(paths, categories, 40);
        expect(designs.designs.length).to.equal(40);
        expect(designs.totalNum).to.equal(12768);
      });

    });

    // it('Multi-level graphs', function() {
    //   const collection = {'a': ['a1', 'a2'], 'b': ['b1']};
    //   const path = [generateRoot(), generateAtom('a')];
    //   const paths = [path, path];
    //   const designs = enumeration(paths, collection, 4);
    //   // TODO finish
    // });

    describe('Number of IDs kept after pruning', function () {
      it('Product too large - select part of the IDs', function () {
        const pathStr = ["Cello_promoter", "Cello_promoter", "Cello_ribozyme", "Cello_RBS", "Cello_CDS", "Cello_terminator"];
        let path = [];
        for (let str of pathStr) {
          path.push(generateAtom(str));
        }
        const pathCats = JSON.parse(JSON.stringify(CELLO_CATS));
        enumeration.prunePathCats(path, pathCats, 80);
        let count = 0;
        for (let cat in pathCats) {
          count += getAllIDs(pathCats[cat]).length;
        }
        expect(count).to.equal(10);
      });

      it('Product within numDesigns - keep all the IDs', function () {
        const pathCats = {'a': {'a': ['a1', 'a2']}};
        const path = [generateAtom('a')];
        enumeration.prunePathCats(path, pathCats, 80);
        let count = 0;
        for (let cat in pathCats) {
          count += getAllIDs(pathCats[cat]).length;
        }
        expect(count).to.equal(2);
      });
    });

    describe ('Number of designs chosen', function() {
      it('Select 1 of 2 designs', function () {
        const categories = {'a': {'a': ['a1', 'a2']}};
        const paths = [[generateAtom('a')]];
        const designs = enumeration.enumerateDesigns(paths, categories, 1).designs;
        expect(designs.length).to.equal(1);
      });

      it('Select 0 designs', function () {
        const categories = {'a': {'a': ['a1', 'a2']}};
        const paths = [[generateAtom('a')]];
        const designs = enumeration.enumerateDesigns(paths, categories, 0).designs;
        expect(designs.length).to.equal(0);
      });
    });
  });

  describe('Cartesian product tests', function() {
    it('Empty setA', function() {
      let setA = [];
      let setB = ['a', 'b'];
      expect(enumeration.getCartesianProduct(setA, setB)).to.equal(setB);
    });
    it('Empty setB', function() {
      let setA = ['a', 'b'];
      let setB = [];
      expect(enumeration.getCartesianProduct(setA, setB)).to.equal(setA);
    });
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
