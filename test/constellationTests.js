const expect = require('chai').expect;
const constellation = require('../lib/constellation');

const ATOM = 'atom';
const CATEGORIES = '{"promoter":["a1","a2"],"cds":["b1","b2","b3"],"assemblyScar":["c1"]}';
const ACATS = 2;
const BCATS = 3;
const CCATS = 1;

module.exports = function() {

  describe('Basic operators', function() {
    it('atom', function() {
      let result = constellation('assemblyScar', CATEGORIES, 10, 0);
      expect(result.designs.length).to.equal(CCATS);
      expect(result.designs).to.contain('c1');
    });

    it('or', function() {
      const result = constellation('promoter or cds', CATEGORIES, 10, 0);
      expect(result.designs.length).to.equal(ACATS + BCATS);
      expect(result.designs).to.contain('a1');
      expect(result.designs).to.contain('a2');
      expect(result.designs).to.contain('b1');
      expect(result.designs).to.contain('b2');
      expect(result.designs).to.contain('b3');
    });

    it('then', function() {
      const result = constellation('promoter then assemblyScar', CATEGORIES, 10);
      expect(result.designs.length).to.equal(ACATS * CCATS);
      expect(result.designs).to.contain('a1,c1');
      expect(result.designs).to.contain('a2,c1');
    });

    it('then as dot', function() {
      const result = constellation('promoter . assemblyScar', CATEGORIES, 10);
      expect(result.designs.length).to.equal(ACATS * CCATS);
      expect(result.designs).to.contain('a1,c1');
      expect(result.designs).to.contain('a2,c1');
    });

    // it('and', function() {
    //   const result = constellation('(promoter or assemblyScar) and promoter', categories, 10);
    //   expect(result.designs.length).to.equal(1);
    //   expect(result.designs).to.contain('a1');
    //   expect(result.designs).to.contain('a2');
    // });

    it('one-or-more', function() {
      let result = constellation('one-or-more promoter', CATEGORIES, 10, 0);
      expect(result.designs.length).to.equal(ACATS);
      expect(result.designs).to.contain('a1');
      expect(result.designs).to.contain('a2');
      expect(result.paths.length).to.equal(1);
      expect(result.paths[0].type === ATOM);
    });

    it('zero-or-more', function() {
      const result = constellation('zero-or-more promoter', CATEGORIES, 10, 0);
      expect(result.designs.length).to.equal(ACATS);
      expect(result.designs).to.contain('a1');
      expect(result.designs).to.contain('a2');
      expect(result.paths.length).to.equal(1);
      expect(result.paths[0].type === ATOM);
    });

  });

  describe ('Chained expressions', function() {
    it('Multiple then', function() {
      const result = constellation('promoter then cds then assemblyScar', CATEGORIES, 10);
      expect(result.designs.length).to.equal(ACATS * BCATS * CCATS);
    });

    it('Multiple or', function() {
      const result = constellation('promoter or cds or assemblyScar', CATEGORIES, 10);
      expect(result.designs.length).to.equal(ACATS + BCATS + CCATS);
    });

    // it('Multiple and', function() {
    //   const result = constellation('promoter and cds and assemblyScar', categories, 10);
    //   expect(result.designs.length).to.equal(0);
    // });

    it('Multiple one-or-more', function() {
      const result = constellation('one-or-more (one-or-more promoter)', CATEGORIES, 10, 0);
      expect(result.designs.length).to.equal(ACATS);
      expect(result.designs).to.contain('a1');
      expect(result.designs).to.contain('a2');
      expect(result.paths.length).to.equal(1);
      expect(result.paths[0].type === ATOM);
    });

    it('Multiple zero-or-more', function() {
      const result = constellation('zero-or-more (zero-or-more promoter)', CATEGORIES, 10, 0);
      expect(result.designs.length).to.equal(ACATS);
      expect(result.designs).to.contain('a1');
      expect(result.designs).to.contain('a2');
    });

    it('Mixing functions', function() {
      const result = constellation('promoter then (one-or-more cds or zero-or-more assemblyScar)', CATEGORIES, 50, 0); // TODO add and
      expect(result.designs.length).to.equal(ACATS * (BCATS + CCATS + 1));
    });

    it('Then downstream from cycle', function() {
      const result = constellation('zero-or-more promoter then cds', CATEGORIES, 50, 0);
      expect(result.designs.length).to.equal((ACATS + 1) * BCATS);
    });

  });

  describe('Cycles', function () {
    it('Atom', function() {
      let result = constellation('assemblyScar', CATEGORIES, 10, 2);
      expect(result.designs.length).to.equal(CCATS);
    });

    it('Linear operators', function() {
      let result = constellation('promoter or cds', CATEGORIES, 10, 2);
      expect(result.designs.length).to.equal(ACATS + BCATS);
      expect(result.designs).to.contain('a1');
      expect(result.designs).to.contain('a2');
      expect(result.designs).to.contain('b1');
      expect(result.designs).to.contain('b2');
      expect(result.designs).to.contain('b3');
      result = constellation('promoter then assemblyScar', CATEGORIES, 10, 2);
      expect(result.designs.length).to.equal(ACATS * CCATS);
      expect(result.designs).to.contain('a1,c1');
      expect(result.designs).to.contain('a2,c1');
    });

    it('one-or-more', function() {
      let result = constellation('one-or-more promoter', CATEGORIES, 10, 1);
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
      const result = constellation('zero-or-more promoter', CATEGORIES, 10, 1);
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
      const result = constellation('one-or-more (one-or-more promoter)', CATEGORIES, 10, 1);
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
      const result = constellation('zero-or-more (zero-or-more promoter)', CATEGORIES, 10, 1);
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
      const result = constellation('zero-or-more promoter then cds', CATEGORIES, 50, 1);
      expect(result.designs.length).to.equal(BCATS + ACATS * BCATS + ACATS * ACATS * BCATS);
    });

  });

  describe('Sanitise specification input', function () {
    it('Atom not in categories', function () {
      expect(() => constellation('d', CATEGORIES, 10, 0)).to.throw('d is not a valid SBOL part');
    });

    it('Mismatched brackets', function () {
      expect(() => constellation('(promoter}', CATEGORIES, 10, 0)).to.throw('Parsing error!');
    });


    it('Empty specification', function () {
      expect(() => constellation('', CATEGORIES, 10, 0)).to.throw('No input received')
    });

    describe('Invalid characters', function () {
      it('Tabs used should not throw errors', function () {
        const result = constellation('\tpromoter', CATEGORIES, 10, 0);
        expect(result.designs).to.contain('a1');
        expect(result.designs).to.contain('a2');
      });

      // it('$', function () {
      //   expect(() => constellation('promoter then $a', CATEGORIES, 10)).to.throw('Parsing error!');
      // });
      // TODO turn back on when imparse starts throwing errors

      it('_', function () {
        expect(() => constellation('_d', CATEGORIES, 10, 0)).to.throw('_d is not a valid SBOL part');
      });
    });

  });

  describe('Sanitise category input', function () {
    it('Empty categories', function () {
      const categories = '{}';
      expect(() => constellation('promoter', categories, 10, 0)).to.throw('promoter is not defined in categories');
    });

    it('Handle defined but empty category', function () {
      let categories = '{"promoter": []}';
      const result = constellation('promoter', categories, 10, 0);
      expect(JSON.stringify(result.designs)).to.equal('[]');
    });

    it('Mismatched brackets', function () {
      expect(() => constellation('(promoter}', CATEGORIES, 10, 0)).to.throw('Parsing error!');
    });

    describe('Invalid characters', function () {
      it('Whitespace should not be included in designs', function () {
        let categories = '{"promoter":["\ta1", " a2"]}';
        const result = constellation('promoter', categories, 10, 0);
        expect(JSON.stringify(result.designs)).to.contain('a1');
        expect(JSON.stringify(result.designs)).to.contain('a2');
      });

      it('Other symbols should be parsed into category', function () {
        let categories = '{"promoter":["$a1", "a2"]}';
        const result = constellation('promoter', categories, 10, 0);
        expect(JSON.stringify(result.designs)).to.contain('a1');
        expect(JSON.stringify(result.designs)).to.contain('a2');
      });
    });
  });

};
