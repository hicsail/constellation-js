'use strict';

const expect = require('chai').expect;
const simplify = require('../lib/simplifyOperators');


module.exports = function() {
  describe('Goldbar Simplification', function() {
    describe('Then', function () {
      it('one-or-more(a) then one-or-more(a)', function () {
        let toParse = JSON.parse('{"Then":[{"OneOrMore":[{"Atom":["a"]}]}, {"OneOrMore":[{"Atom":["a"]}]}]}');
        let result = JSON.stringify(simplify(toParse));
        expect(result).to.equal('{"Then":[{"Atom":["a"]},{"OneOrMore":[{"Atom":["a"]}]}]}')
      });

      it('one-or-more(a) then zero-or-more(a)', function () {
        let toParse = JSON.parse('{"Then":[{"OneOrMore":[{"Atom":["a"]}]}, {"ZeroOrMore":[{"Atom":["a"]}]}]}');
        let result = JSON.stringify(simplify(toParse));
        expect(result).to.equal('{"OneOrMore":[{"Atom":["a"]}]}')
      });

      it('zero-or-more(a) then one-or-more(a)', function () {
        let toParse = JSON.parse('{"Then":[{"ZeroOrMore":[{"Atom":["a"]}]}, {"OneOrMore":[{"Atom":["a"]}]}]}');
        let result = JSON.stringify(simplify(toParse));
        expect(result).to.equal('{"OneOrMore":[{"Atom":["a"]}]}')
      });

      it('zero-or-more(a) then zero-or-more(a)', function () {
        let toParse = JSON.parse('{"Then":[{"ZeroOrMore":[{"Atom":["a"]}]}, {"ZeroOrMore":[{"Atom":["a"]}]}]}');
        let result = JSON.stringify(simplify(toParse));
        expect(result).to.equal('{"ZeroOrMore":[{"Atom":["a"]}]}')
      });

      it('zero-or-more(a) then a', function () {
        let toParse = JSON.parse('{"Then":[{"ZeroOrMore":[{"Atom":["a"]}]}, {"Atom":["a"]}]}');
        let result = JSON.stringify(simplify(toParse));
        expect(result).to.equal('{"OneOrMore":[{"Atom":["a"]}]}')
      });

    });

    describe('Or', function () {
      // start with one-or-more
      it('one-or-more(a) or one-or-more(a)', function () {
        let toParse = JSON.parse('{"Or":[{"OneOrMore":[{"Atom":["a"]}]}, {"OneOrMore":[{"Atom":["a"]}]}]}');
        let result = JSON.stringify(simplify(toParse));
        expect(result).to.equal('{"OneOrMore":[{"Atom":["a"]}]}')
      });

      it('one-or-more(a) or zero-or-more(a)', function () {
        let toParse = JSON.parse('{"Or":[{"OneOrMore":[{"Atom":["a"]}]}, {"ZeroOrMore":[{"Atom":["a"]}]}]}');
        let result = JSON.stringify(simplify(toParse));
        expect(result).to.equal('{"ZeroOrMore":[{"Atom":["a"]}]}')
      });

      it('one-or-more(a) or zero-or-one(a)', function () {
        let toParse = JSON.parse('{"Or":[{"OneOrMore":[{"Atom":["a"]}]}, {"ZeroOrOne":[{"Atom":["a"]}]}]}');
        let result = JSON.stringify(simplify(toParse));
        expect(result).to.equal('{"ZeroOrMore":[{"Atom":["a"]}]}')
      });

      it('one-or-more(a) or a', function () {
        let toParse = JSON.parse('{"Or":[{"OneOrMore":[{"Atom":["a"]}]}, {"Atom":["a"]}]}');
        let result = JSON.stringify(simplify(toParse));
        expect(result).to.equal('{"OneOrMore":[{"Atom":["a"]}]}')
      });

      // start with zero-or-more
      it('zero-or-more(a) or one-or-more(a)', function () {
        let toParse = JSON.parse('{"Or":[{"ZeroOrMore":[{"Atom":["a"]}]}, {"OneOrMore":[{"Atom":["a"]}]}]}');
        let result = JSON.stringify(simplify(toParse));
        expect(result).to.equal('{"ZeroOrMore":[{"Atom":["a"]}]}')
      });

      it('zero-or-more(a) or zero-or-more(a)', function () {
        let toParse = JSON.parse('{"Or":[{"ZeroOrMore":[{"Atom":["a"]}]}, {"ZeroOrMore":[{"Atom":["a"]}]}]}');
        let result = JSON.stringify(simplify(toParse));
        expect(result).to.equal('{"ZeroOrMore":[{"Atom":["a"]}]}')
      });

      it('zero-or-more(a) or zero-or-one(a)', function () {
        let toParse = JSON.parse('{"Or":[{"ZeroOrMore":[{"Atom":["a"]}]}, {"ZeroOrOne":[{"Atom":["a"]}]}]}');
        let result = JSON.stringify(simplify(toParse));
        expect(result).to.equal('{"ZeroOrMore":[{"Atom":["a"]}]}')
      });

      it('zero-or-more(a) or a', function () {
        let toParse = JSON.parse('{"Or":[{"ZeroOrMore":[{"Atom":["a"]}]}, {"Atom":["a"]}]}');
        let result = JSON.stringify(simplify(toParse));
        expect(result).to.equal('{"ZeroOrMore":[{"Atom":["a"]}]}')
      });

      // start with zero-or-one
      it('zero-or-one(a) or one-or-more(a)', function () {
        let toParse = JSON.parse('{"Or":[{"ZeroOrOne":[{"Atom":["a"]}]}, {"OneOrMore":[{"Atom":["a"]}]}]}');
        let result = JSON.stringify(simplify(toParse));
        expect(result).to.equal('{"ZeroOrMore":[{"Atom":["a"]}]}')
      });

      it('zero-or-one(a) or zero-or-more(a)', function () {
        let toParse = JSON.parse('{"Or":[{"ZeroOrOne":[{"Atom":["a"]}]}, {"ZeroOrMore":[{"Atom":["a"]}]}]}');
        let result = JSON.stringify(simplify(toParse));
        expect(result).to.equal('{"ZeroOrMore":[{"Atom":["a"]}]}')
      });

      it('zero-or-one(a) or zero-or-one(a)', function () {
        let toParse = JSON.parse('{"Or":[{"ZeroOrOne":[{"Atom":["a"]}]}, {"ZeroOrOne":[{"Atom":["a"]}]}]}');
        let result = JSON.stringify(simplify(toParse));
        expect(result).to.equal('{"ZeroOrOne":[{"Atom":["a"]}]}')
      });

      it('zero-or-one(a) or a', function () {
        let toParse = JSON.parse('{"Or":[{"ZeroOrOne":[{"Atom":["a"]}]}, {"Atom":["a"]}]}');
        let result = JSON.stringify(simplify(toParse));
        expect(result).to.equal('{"ZeroOrOne":[{"Atom":["a"]}]}')
      });

    });

    describe('Nested operations', function () {
      it('one-or-more(one-or-more(a))', function () {
        let toParse = JSON.parse('{"OneOrMore":[{"OneOrMore":[{"Atom":["a"]}]}]}');
        let result = JSON.stringify(simplify(toParse));
        expect(result).to.equal('{"OneOrMore":[{"Atom":["a"]}]}')
      });

      it('one-or-more(zero-or-more(a))', function () {
        let toParse = JSON.parse('{"OneOrMore":[{"ZeroOrMore":[{"Atom":["a"]}]}]}');
        let result = JSON.stringify(simplify(toParse));
        expect(result).to.equal('{"ZeroOrMore":[{"Atom":["a"]}]}')
      });

      it('one-or-more(zero-or-one(a))', function () {
        let toParse = JSON.parse('{"OneOrMore":[{"ZeroOrOne":[{"Atom":["a"]}]}]}');
        let result = JSON.stringify(simplify(toParse));
        expect(result).to.equal('{"ZeroOrMore":[{"Atom":["a"]}]}')
      });

      it('zero-or-more(one-or-more(a))', function () {
        let toParse = JSON.parse('{"ZeroOrMore":[{"OneOrMore":[{"Atom":["a"]}]}]}');
        let result = JSON.stringify(simplify(toParse));
        expect(result).to.equal('{"ZeroOrMore":[{"Atom":["a"]}]}')
      });

      it('zero-or-more(zero-or-more(a))', function () {
        let toParse = JSON.parse('{"ZeroOrMore":[{"ZeroOrMore":[{"Atom":["a"]}]}]}');
        let result = JSON.stringify(simplify(toParse));
        expect(result).to.equal('{"ZeroOrMore":[{"Atom":["a"]}]}')
      });

      it('zero-or-more(zero-or-one(a))', function () {
        let toParse = JSON.parse('{"ZeroOrMore":[{"ZeroOrOne":[{"Atom":["a"]}]}]}');
        let result = JSON.stringify(simplify(toParse));
        expect(result).to.equal('{"ZeroOrMore":[{"Atom":["a"]}]}')
      });

      it('zero-or-one(one-or-more(a))', function () {
        let toParse = JSON.parse('{"ZeroOrOne":[{"OneOrMore":[{"Atom":["a"]}]}]}');
        let result = JSON.stringify(simplify(toParse));
        expect(result).to.equal('{"ZeroOrMore":[{"Atom":["a"]}]}')
      });

      it('zero-or-one(zero-or-more(a))', function () {
        let toParse = JSON.parse('{"ZeroOrOne":[{"ZeroOrMore":[{"Atom":["a"]}]}]}');
        let result = JSON.stringify(simplify(toParse));
        expect(result).to.equal('{"ZeroOrMore":[{"Atom":["a"]}]}')
      });

      it('zero-or-one(zero-or-one(a))', function () {
        let toParse = JSON.parse('{"ZeroOrOne":[{"ZeroOrOne":[{"Atom":["a"]}]}]}');
        let result = JSON.stringify(simplify(toParse));
        expect(result).to.equal('{"ZeroOrOne":[{"Atom":["a"]}]}')
      });

    });

    describe('Reverse Complement', function () {
      it('reverse-comp(a)', function () {
        let toParse = JSON.parse('{"ReverseComp":[{"Atom":["a"]}]}');
        let result = JSON.stringify(simplify(toParse));
        expect(result).to.equal('{"ReverseComp":[["a"]]}');
      });

      it('reverse-comp(zero-or-one(a))', function () {
        let toParse = JSON.parse('{"ReverseComp":[{"ZeroOrOne":[{"Atom":["a"]}]}]}');
        let result = JSON.stringify(simplify(toParse));
        expect(result).to.equal('{"ZeroOrOne":[{"ReverseComp":[["a"]]}]}');
      });

      it('reverse-comp(zero-or-more(a))', function () {
        let toParse = JSON.parse('{"ReverseComp":[{"ZeroOrMore":[{"Atom":["a"]}]}]}');
        let result = JSON.stringify(simplify(toParse));
        expect(result).to.equal('{"ZeroOrMore":[{"ReverseComp":[["a"]]}]}');
      });

      it('reverse-comp(one-or-more(a))', function () {
        let toParse = JSON.parse('{"ReverseComp":[{"OneOrMore":[{"Atom":["a"]}]}]}');
        let result = JSON.stringify(simplify(toParse));
        expect(result).to.equal('{"OneOrMore":[{"ReverseComp":[["a"]]}]}');
      });

      it('reverse-comp(a or b)', function () {
        let toParse = JSON.parse('{"ReverseComp":[{"Or":[{"Atom":["a"]}, {"Atom":["b"]}]}]}');
        let result = JSON.stringify(simplify(toParse));
        expect(result).to.equal('{"Or":[{"ReverseComp":[["a"]]},{"ReverseComp":[["b"]]}]}');
      });

      it('reverse-comp(a then b)', function () {
        let toParse = JSON.parse('{"ReverseComp":[{"Then":[{"Atom":["a"]}, {"Atom":["b"]}]}]}');
        let result = JSON.stringify(simplify(toParse));
        expect(result).to.equal('{"Then":[{"ReverseComp":[["b"]]},{"ReverseComp":[["a"]]}]}');
      });
    })

  });
};
