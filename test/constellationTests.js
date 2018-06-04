'use strict';

const ATOM = 'atom';

const expect = require('chai').expect;
const constellation = require('../lib/constellation');

let categories = '{"a":["a1","a2"],"b":["b1","b2","b3"],"c":["c1"]}';
categories = JSON.parse(categories);

module.exports = function() {

  describe('Basic operators', function() {
    it('atom', function() {
      let result = constellation('c', categories, 10);
      expect(result.designs[0]).to.equal('c1');
    });

    it('or', function() {
      let categories = {'a': ['a1', 'a2'], 'b': ['b']};
      const result = constellation('a or b', categories, 10);
      const len = categories['a'].length + categories['b'].length;
      expect(result.designs.length).to.equal(len);
      expect(result.designs).to.contain('b');
      expect(result.designs).to.contain('a1');
      expect(result.designs).to.contain('a2');
    });

    it('then', function() {
      const result = constellation('a then c', categories, 10);
      expect(result.designs.length).to.equal(2);
      expect(result.designs).to.contain('a1,c1');
      expect(result.designs).to.contain('a2,c1');
    });

    it('then as dot', function() {
      const result = constellation('a . c', categories, 10);
      expect(result.designs.length).to.equal(2);
      expect(result.designs).to.contain('a1,c1');
      expect(result.designs).to.contain('a2,c1');
    });

    // it('and', function() {
    //   const result = constellation('(a or c) and a', categories, 10);
    //   expect(result.designs.length).to.equal(1);
    //   expect(result.designs).to.contain('a1');
    //   expect(result.designs).to.contain('a2');
    // });

    it('one-or-more', function() {
      let result = constellation('one-or-more a', categories, 10);
      expect(result.designs).to.contain('a1');
      expect(result.designs).to.contain('a2');
      expect(result.paths.length).to.equal(1); // Number of paths
      expect(result.paths[0].length).to.equal(2); // Length of each path, including root
      expect(result.paths[0][0].dataType === ATOM);
    });

    it('zero-or-more', function() {
      const result = constellation('zero-or-more a', categories, 10);
      console.log(result.designs);
      expect(result.designs).to.contain('');
      expect(result.designs).to.contain('a1');
      expect(result.designs).to.contain('a2');
      expect(result.paths.length).to.equal(2); // Number of paths, including empty path
      expect(result.paths[0][0].dataType === ATOM);
    });

  });

  describe ('Chained expressions', function() {
    it('Multiple then', function() {
      const result = constellation('a then b then c', categories, 10);
      expect(result.designs.length).to.equal(categories['a'].length * categories['b'].length * categories['c'].length);
    });

    it('Multiple or', function() {
      const result = constellation('a or b or c', categories, 10);
      console.log(result.designs);
      expect(result.designs.length).to.equal(categories['a'].length + categories['b'].length + categories['c'].length);
    });

    // it('Multiple and', function() {
    //   const result = constellation('a and b and c', categories, 10);
    //   expect(result.designs.length).to.equal(0);
    // });

    it('Multiple one-or-more', function() {
      const result = constellation('one-or-more (one-or-more a)', categories, 10);
      expect(result.designs.length).to.equal(categories['a'].length);
    });

    it.only('Multiple zero-or-more', function() {
      const result = constellation('zero-or-more (zero-or-more a)', categories, 10);
      console.log(result.designs);
      expect(result.designs.length).to.equal(categories['a'].length + 1);
    });

    it('Mixing functions', function() {
      const result = constellation('a then (one-or-more b or zero-or-more c)', categories, 50); // TODO add and
      console.log(result.designs);
      let len = categories['a'].length * (1 + categories['b'].length + categories['c'].length);
      expect(result.designs.length).to.equal(len);
    });

  });

  describe('Sanitise specification input', function () {
    it('Atom not in categories', function () {
      expect(() => constellation('d', categories, 10)).to.throw('d is not defined in categories');
    });

    it('Mismatched brackets', function () {
      expect(constellation('(a}', categories, 10)).to.be.undefined;
    });

    describe('Invalid characters', function () {
      it('Tabs used should not throw errors', function () {
        const result = constellation('\ta', categories, 10);
        expect(result.designs).to.contain('a1');
        expect(result.designs).to.contain('a2');
      });

      it('$', function () {
        let result = constellation('$a', categories, 10);
        expect(result).to.be.undefined;
      });

      it('Other symbols should be parsed into specification', function () {
        let result = constellation('$a', categories, 10);
        expect(result).to.be.undefined;
      });
    });

  });

  describe('Sanitise category input', function () {
    it('Empty categories', function () {
      let categories = {};
      expect(() => constellation('a', categories, 1)).to.throw('a is not defined in categories');
    });

    it('Handle defined but empty category', function () {
      let categories = {'a': []};
      const result = constellation('a', categories, 10);
      expect(JSON.stringify(result.designs)).to.equal('[]');
    });

    it('Mismatched brackets', function () {
      expect(constellation('(a}', categories, 10)).to.be.undefined;
    });

    describe('Invalid characters', function () {
      it('Whitespace should not be included in designs', function () {
        let categories = {"a":["\ta1", " a2"]};
        const result = constellation('a', categories, 10);
        expect(JSON.stringify(result.designs)).to.contain('a1');
        expect(JSON.stringify(result.designs)).to.contain('a2');
      });

      it('Other symbols should be parsed into category', function () {
        let categories = {"a":["$a1", "a2"]};
        const result = constellation('a', categories, 10);
        expect(JSON.stringify(result.designs)).to.contain('a1');
        expect(JSON.stringify(result.designs)).to.contain('a2');
      });
    });

  });

};
