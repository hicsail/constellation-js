const expect = require('chai').expect;
const constellation = require('../lib/constellation');

const ATOM = 'atom';
const CATEGORIES = '{"a":["a1","a2"],"b":["b1","b2","b3"],"c":["c1"]}';
const ACATS = 2;
const BCATS = 3;
const CCATS = 1;

const DESIGN_NAME = 'design';

module.exports = function() {

  describe('Basic operators', function() {
    it('atom', function() {
      let result = constellation.goldbar(DESIGN_NAME, 'c', CATEGORIES, 10, 0);
      expect(result.designs.length).to.equal(CCATS);
      expect(result.designs).to.contain('c1');
    });

    it('and', function() {
      let result = constellation.goldbar(DESIGN_NAME, 'c and c', CATEGORIES, 10, 0);
      expect(result.designs.length).to.equal(CCATS);
      expect(result.designs).to.contain('c1');

      result = constellation.goldbar(DESIGN_NAME, 'a and b', CATEGORIES, 10, 0);
      expect(result.designs.length).to.equal(0);
    });


    it('or', function() {
      const result = constellation.goldbar(DESIGN_NAME, 'a or b', CATEGORIES, 10, 0);
      expect(result.designs.length).to.equal(ACATS + BCATS);
      expect(result.designs).to.contain('a1');
      expect(result.designs).to.contain('a2');
      expect(result.designs).to.contain('b1');
      expect(result.designs).to.contain('b2');
      expect(result.designs).to.contain('b3');
    });

    it('then', function() {
      const result = constellation.goldbar(DESIGN_NAME, 'a then c', CATEGORIES, 10, 0);
      expect(result.designs.length).to.equal(ACATS * CCATS);
      expect(result.designs).to.contain('a1,c1');
      expect(result.designs).to.contain('a2,c1');
    });

    it('then as dot', function() {
      const result = constellation.goldbar(DESIGN_NAME, 'a . c', CATEGORIES, 10, 0);
      expect(result.designs.length).to.equal(ACATS * CCATS);
      expect(result.designs).to.contain('a1,c1');
      expect(result.designs).to.contain('a2,c1');
    });

    it('one-or-more', function() {
      let result = constellation.goldbar(DESIGN_NAME, 'one-or-more a', CATEGORIES, 10, 0);
      expect(result.designs.length).to.equal(ACATS);
      expect(result.designs).to.contain('a1');
      expect(result.designs).to.contain('a2');
      expect(result.paths.length).to.equal(1);
      expect(result.paths[0].type === ATOM);
    });

    it('zero-or-more', function() {
      const result = constellation.goldbar(DESIGN_NAME, 'zero-or-more a', CATEGORIES, 10, 0);
      expect(result.designs.length).to.equal(ACATS);
      expect(result.designs).to.contain('a1');
      expect(result.designs).to.contain('a2');
      expect(result.paths.length).to.equal(1);
      expect(result.paths[0].type === ATOM);
    });

  });

  describe ('Chained expressions', function() {
    it('Multiple then', function() {
      const result = constellation.goldbar(DESIGN_NAME, 'a then b then c', CATEGORIES, 10 , 0);
      expect(result.designs.length).to.equal(ACATS * BCATS * CCATS);
    });

    it('Multiple or', function() {
      const result = constellation.goldbar(DESIGN_NAME, 'a or b or c', CATEGORIES, 10 , 0);
      expect(result.designs.length).to.equal(ACATS + BCATS + CCATS);
    });

    // it('Multiple and', function() {
    //   const result = constellation.goldbar(DESIGN_NAME, 'a and b and c', categories, 10);
    //   expect(result.designs.length).to.equal(0);
    // });

    it('Multiple one-or-more', function() {
      const result = constellation.goldbar(DESIGN_NAME, 'one-or-more (one-or-more a)', CATEGORIES, 10, 0);
      expect(result.designs.length).to.equal(ACATS);
      expect(result.designs).to.contain('a1');
      expect(result.designs).to.contain('a2');
      expect(result.paths.length).to.equal(1);
      expect(result.paths[0].type === ATOM);
    });

    it('Multiple zero-or-more', function() {
      const result = constellation.goldbar(DESIGN_NAME, 'zero-or-more (zero-or-more a)', CATEGORIES, 10, 0);
      expect(result.designs.length).to.equal(ACATS);
      expect(result.designs).to.contain('a1');
      expect(result.designs).to.contain('a2');
    });

    it('Mixing functions', function() {
      const result = constellation.goldbar(DESIGN_NAME, 'a then (one-or-more b or zero-or-more c)', CATEGORIES, 50, 0); // TODO add and
      expect(result.designs.length).to.equal(ACATS * (BCATS + CCATS + 1));
    });

    it('Then downstream from cycle', function() {
      const result = constellation.goldbar(DESIGN_NAME, 'zero-or-more a then b', CATEGORIES, 50, 0);
      expect(result.designs.length).to.equal((ACATS + 1) * BCATS);
    });

  });

  describe('Cycles', function () {
    it('Atom', function() {
      let result = constellation.goldbar(DESIGN_NAME, 'c', CATEGORIES, 10, 2);
      expect(result.designs.length).to.equal(CCATS);
    });

    it('Linear operators', function() {
      let result = constellation.goldbar(DESIGN_NAME, 'a or b', CATEGORIES, 10, 2);
      expect(result.designs.length).to.equal(ACATS + BCATS);
      expect(result.designs).to.contain('a1');
      expect(result.designs).to.contain('a2');
      expect(result.designs).to.contain('b1');
      expect(result.designs).to.contain('b2');
      expect(result.designs).to.contain('b3');
      result = constellation.goldbar(DESIGN_NAME, 'a then c', CATEGORIES, 10, 2);
      expect(result.designs.length).to.equal(ACATS * CCATS);
      expect(result.designs).to.contain('a1,c1');
      expect(result.designs).to.contain('a2,c1');
    });

    it('one-or-more', function() {
      let result = constellation.goldbar(DESIGN_NAME, 'one-or-more a', CATEGORIES, 10, 1);
      expect(result.designs.length).to.equal(ACATS + ACATS * ACATS);
      expect(result.designs).to.contain('a1');
      expect(result.designs).to.contain('a2');
      expect(result.designs).to.contain('a1,a1');
      expect(result.designs).to.contain('a1,a2');
      expect(result.designs).to.contain('a2,a1');
      expect(result.designs).to.contain('a2,a2');
      expect(result.paths.length).to.equal(2);
    });

    it('zero-or-more', function() {
      const result = constellation.goldbar(DESIGN_NAME, 'zero-or-more a', CATEGORIES, 10, 1);
      expect(result.designs.length).to.equal(ACATS + ACATS * ACATS);
      expect(result.designs).to.contain('a1');
      expect(result.designs).to.contain('a2');
      expect(result.designs).to.contain('a1,a1');
      expect(result.designs).to.contain('a1,a2');
      expect(result.designs).to.contain('a2,a1');
      expect(result.designs).to.contain('a2,a2');
      expect(result.paths.length).to.equal(2);
    });

    it('Multiple one-or-more', function() {
      const result = constellation.goldbar(DESIGN_NAME, 'one-or-more (one-or-more a)', CATEGORIES, 10, 1);
      expect(result.designs.length).to.equal(ACATS + ACATS * ACATS);
      expect(result.designs).to.contain('a1');
      expect(result.designs).to.contain('a2');
      expect(result.designs).to.contain('a1,a1');
      expect(result.designs).to.contain('a1,a2');
      expect(result.designs).to.contain('a2,a1');
      expect(result.designs).to.contain('a2,a2');
      expect(result.paths.length).to.equal(2);
    });

    it('Multiple zero-or-more', function() {
      const result = constellation.goldbar(DESIGN_NAME, 'zero-or-more (zero-or-more a)', CATEGORIES, 10, 1);
      expect(result.designs.length).to.equal(ACATS + ACATS * ACATS);
      expect(result.designs).to.contain('a1');
      expect(result.designs).to.contain('a2');
      expect(result.designs).to.contain('a1,a1');
      expect(result.designs).to.contain('a1,a2');
      expect(result.designs).to.contain('a2,a1');
      expect(result.designs).to.contain('a2,a2');
      expect(result.paths.length).to.equal(2);
    });

    it('Then downstream from cycle', function() {
      const result = constellation.goldbar(DESIGN_NAME, 'zero-or-more a then b', CATEGORIES, 50, 1);
      expect(result.designs.length).to.equal(BCATS + ACATS * BCATS + ACATS * ACATS * BCATS);
    });

  });

  describe('Sanitise specification input', function () {
    it('Atom not in categories', function () {
      expect(() => constellation.goldbar(DESIGN_NAME, 'd', CATEGORIES, 10, 0)).to.throw('d is not defined in categories');
    });

    it('Mismatched brackets', function () {
      expect(() => constellation.goldbar(DESIGN_NAME, '(a}', CATEGORIES, 10, 0)).to.throw('Parsing error!');
    });


    it('Empty specification', function () {
      expect(() => constellation.goldbar(DESIGN_NAME, '', CATEGORIES, 10, 0)).to.throw('No input received')
    });

    describe('Invalid characters', function () {
      it('Tabs used should not throw errors', function () {
        const result = constellation.goldbar(DESIGN_NAME, '\ta', CATEGORIES, 10, 0);
        expect(result.designs).to.contain('a1');
        expect(result.designs).to.contain('a2');
      });

      // it('$', function () {
      //   expect(() => constellation.goldbar(DESIGN_NAME, 'a then $a', CATEGORIES, 10)).to.throw('Parsing error!');
      // });
      // TODO turn back on when imparse starts throwing errors

      it('_', function () {
        expect(() => constellation.goldbar(DESIGN_NAME, '_a', CATEGORIES, 10, 0)).to.throw('_a is not defined in categories');
      });
    });

  });

  describe('Sanitise category input', function () {
    it('Empty categories', function () {
      const categories = '{}';
      expect(() => constellation.goldbar(DESIGN_NAME, 'a', categories, 10, 0)).to.throw('a is not defined in categories');
    });

    it('Handle defined but empty category', function () {
      let categories = '{"a": []}';
      const result = constellation.goldbar(DESIGN_NAME, 'a', categories, 10, 0);
      expect(JSON.stringify(result.designs)).to.equal('[]');
    });

    it('Mismatched brackets', function () {
      expect(() => constellation.goldbar(DESIGN_NAME, '(a}', CATEGORIES, 10, 0)).to.throw('Parsing error!');
    });

    describe('Invalid characters', function () {
      it('Whitespace should not be included in designs', function () {
        let categories = '{"a":["\ta1", " a2"]}';
        const result = constellation.goldbar(DESIGN_NAME, 'a', categories, 10, 0);
        expect(JSON.stringify(result.designs)).to.contain('a1');
        expect(JSON.stringify(result.designs)).to.contain('a2');
      });

      it('Other symbols should be parsed into category', function () {
        let categories = '{"a":["$a1", "a2"]}';
        const result = constellation.goldbar(DESIGN_NAME, 'a', categories, 10, 0);
        expect(JSON.stringify(result.designs)).to.contain('a1');
        expect(JSON.stringify(result.designs)).to.contain('a2');
      });
    });
  });

};
