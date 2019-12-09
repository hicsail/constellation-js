const chai = require('chai');
const chaiAsPromised = require('chai-as-promised');
chai.use(chaiAsPromised);

const expect = chai.expect;
const constellation = require('../lib/constellation');

const CATEGORIES = {"a":{"ids":["a1","a2"], "roles":["a"]},"b":{"ids":["b1","b2","b3"], "roles": ["b"]},"c":{"ids":["c1"], "roles": ["c"]}};
const FOR_TOLERANCE = {"a1":{"ids":["first","second"], "roles":["a"]},"a2":{"ids":["first"], "roles": ["a", "letter"]},"a3":{"ids":[], "roles": ["a"]}, "a4":{"ids":[], "roles": ["letter"]}};
const ALEN = CATEGORIES.a.ids.length;
const BLEN = CATEGORIES.b.ids.length;
const CLEN = CATEGORIES.c.ids.length;

const CATSTR = JSON.stringify(CATEGORIES);
const TOLSTR = JSON.stringify(FOR_TOLERANCE);
const DESIGN_NAME = 'design';

const NODE = 'NODE';
const EDGE = 'EDGE';

const f = (a, b) => [].concat(...a.map(d => b.map(e => d.concat(',').concat(e))));
const cartesian = (a, b, ...c) => (b ? cartesian(f(a, b), ...c) : a);

function expectA(result) {
  expect(result.designs.length).to.equal(ALEN);
  expect(result.designs).to.have.members(CATEGORIES.a.ids);
}

function expectAConcatB(result) {
  expect(result.designs.length).to.equal(ALEN + BLEN);
  expect(result.designs).to.have.members((CATEGORIES.a.ids).concat(CATEGORIES.b.ids));
}

function expectACartesianB(result) {
  expect(result.designs.length).to.equal(ALEN * BLEN);
  expect(result.designs).to.have.members(cartesian(CATEGORIES.a.ids, CATEGORIES.b.ids));
}

function expectACartBAndEmpty(result) {
  const emptiesAndCart = CATEGORIES.a.ids.concat(cartesian(CATEGORIES.a.ids, CATEGORIES.b.ids));
  expect(result.designs.length).to.equal(emptiesAndCart.length);
  expect(result.designs).to.have.members(emptiesAndCart);
}

function expectTol0(result) {
  expect(result.designs.length).to.equal(FOR_TOLERANCE.a2.ids.length);
  expect(result.designs).to.have.members(FOR_TOLERANCE.a2.ids);
}

function expectTol1(result) {
  expect(result.designs.length).to.equal(FOR_TOLERANCE.a1.ids.length);
  expect(result.designs).to.have.members(FOR_TOLERANCE.a1.ids);
}


module.exports = function() {
  describe('Missing input errors', function() {

    it('Missing specification', async() => {
      await expect(constellation.goldbar(DESIGN_NAME, null, '{}', 10, 0, NODE)).to.be.rejectedWith('No input received');
      await expect(constellation.goldbar(DESIGN_NAME, null, '{}', 10, 0, EDGE)).to.be.rejectedWith('No input received');
    });

    it('Missing ids in categories', async() => {
      await expect(constellation.goldbar(DESIGN_NAME, 'a', '{"a": {"roles":["a"]}}', 10, 0)).to.be.rejectedWith('Every category must have ids and a role');
      await expect(constellation.goldbar(DESIGN_NAME, 'a', '{"a": {"roles":["a"]}}', 10, 0)).to.be.rejectedWith('Every category must have ids and a role');
    });

    it('Missing roles in categories', async() => {
      await expect(constellation.goldbar(DESIGN_NAME, 'a', '{"a": {"ids":["a"]}}', 10, 0)).to.be.rejectedWith('Every category must have ids and a role');
      await expect(constellation.goldbar(DESIGN_NAME, 'a', '{"a": {"ids":["a"]}}', 10, 0)).to.be.rejectedWith('Every category must have ids and a role');
    });
  });

  describe('Operator unit tests, base cases', function() {

    describe('Unary expressions', function() {
      it('atom', async() => {
        const resultNode = await constellation.goldbar(DESIGN_NAME, 'a', CATSTR, 10, 0, NODE);
        expectA(resultNode);
        const resultEdge = await constellation.goldbar(DESIGN_NAME, 'a', CATSTR, 10, 0, EDGE);
        expectA(resultEdge);
      });

      it('one-or-more', async() => {
        const resultNode = await constellation.goldbar(DESIGN_NAME, 'one-or-more a', CATSTR, 10, 0, NODE);
        expectA(resultNode);
        // expect(resultNode.paths.length).to.equal(1);

        const resultEdge = await constellation.goldbar(DESIGN_NAME, 'one-or-more a', CATSTR, 10, 0, EDGE);
        expectA(resultEdge);
        // expect(resultEdge.paths.length).to.equal(1);
        // expect(result.paths[0].type === ATOM);
      });

      it('zero-or-more', async() => {
        const resultNode = await constellation.goldbar(DESIGN_NAME, 'zero-or-more a', CATSTR, 10, 0, NODE);
        expectA(resultNode);
        const resultEdge = await constellation.goldbar(DESIGN_NAME, 'zero-or-more a', CATSTR, 10, 0, EDGE);
        expectA(resultEdge);
        // TODO: state that empty string is not an option as an explicit design choice
      });

      it('zero-or-one', async() => {
        const resultNode = await constellation.goldbar(DESIGN_NAME, 'zero-or-one a', CATSTR, 10, 0, NODE);
        expectA(resultNode);
        const resultEdge = await constellation.goldbar(DESIGN_NAME, 'zero-or-one a', CATSTR, 10, 0, EDGE);
        expectA(resultEdge);
        // TODO: state that empty string is not an option as an explicit design choice
      });
    });

    describe('Binary expressions', function() {
      // AND only works on EDGE representation
      describe('and', function() {
        it('and tolerance 0', async () => {
          let result = await constellation.goldbar(DESIGN_NAME, 'a1 and a2', TOLSTR, 10, 0, EDGE, 0);
          expectTol0(result);
        });

        it('and tolerance 1', async () => {
          let result = await constellation.goldbar(DESIGN_NAME, 'a1 and a3', TOLSTR, 10, 0, EDGE, 1);
          expectTol1(result);
        });

        it('and tolerance 2', async () => {
          let result = await constellation.goldbar(DESIGN_NAME, 'a3 and a4', TOLSTR, 10, 0, EDGE, 2);
          expect(result.designs.length).to.equal(0);
        });
      });

      describe('or and then', function() {
        it('or', async() => {
          let resultNode = await constellation.goldbar(DESIGN_NAME, 'b or a', CATSTR, 10, 0, NODE);
          expectAConcatB(resultNode);
          let resultEdge = await constellation.goldbar(DESIGN_NAME, 'b or a', CATSTR, 10, 0, EDGE);
          expectAConcatB(resultEdge);

          resultNode = await constellation.goldbar(DESIGN_NAME, 'a or a', CATSTR, 10, 0, NODE);
          expectA(resultNode);
          resultEdge = await constellation.goldbar(DESIGN_NAME, 'a or a', CATSTR, 10, 0, EDGE);
          expectA(resultEdge);
          // TODO: what should the graph be?
        });

        it('then', async() => {
          let resultNode = await constellation.goldbar(DESIGN_NAME, 'a then b', CATSTR, 10, 0, NODE);
          expectACartesianB(resultNode);
          let resultEdge = await constellation.goldbar(DESIGN_NAME, 'a then b', CATSTR, 10, 0, EDGE);
          expectACartesianB(resultEdge);

          resultNode = await constellation.goldbar(DESIGN_NAME, 'a . b', CATSTR, 10, 0, NODE);
          expectACartesianB(resultNode);
          resultEdge = await constellation.goldbar(DESIGN_NAME, 'a . b', CATSTR, 10, 0, EDGE);
          expectACartesianB(resultEdge);
        });
      })
    });
  });

  describe('Operator compositions', function() {
    describe('unary op (unary exp)', function() {
      it('one-or-more (one-or-more atom)', async () => {
        const resultNode = await constellation.goldbar(DESIGN_NAME, 'one-or-more (one-or-more a)', CATSTR, 10 , 0, NODE);
        expectA(resultNode);
        const resultEdge = await constellation.goldbar(DESIGN_NAME, 'one-or-more (one-or-more a)', CATSTR, 10 , 0, EDGE);
        expectA(resultEdge);
      });

      // TODO: this graph looks wrong
      it('one-or-more (zero-or-more atom)', async() => {
        const resultNode = await constellation.goldbar(DESIGN_NAME, 'one-or-more (zero-or-more a)', CATSTR, 10 , 0, NODE);
        expectA(resultNode);
        const resultEdge = await constellation.goldbar(DESIGN_NAME, 'one-or-more (zero-or-more a)', CATSTR, 10 , 0, EDGE);
        expectA(resultEdge);
      });

      it('one-or-more (zero-or-one atom)', async() => {
        const resultNode = await constellation.goldbar(DESIGN_NAME, 'one-or-more (zero-or-one a)', CATSTR, 10 , 0, NODE);
        expectA(resultNode);
        const resultEdge = await constellation.goldbar(DESIGN_NAME, 'one-or-more (zero-or-one a)', CATSTR, 10 , 0, EDGE);
        expectA(resultEdge);
      });

      it('zero-or-more (one-or-more atom)', async() => {
        const resultNode = await constellation.goldbar(DESIGN_NAME, 'zero-or-more (one-or-more a)', CATSTR, 10 , 0, NODE);
        expectA(resultNode);
        const resultEdge = await constellation.goldbar(DESIGN_NAME, 'zero-or-more (one-or-more a)', CATSTR, 10 , 0, EDGE);
        expectA(resultEdge);
      });

      it('zero-or-more (zero-or-more atom)', async() => {
        const resultNode = await constellation.goldbar(DESIGN_NAME, 'zero-or-more (zero-or-more a)', CATSTR, 10 , 0, NODE);
        expectA(resultNode);
        const resultEdge = await constellation.goldbar(DESIGN_NAME, 'zero-or-more (zero-or-more a)', CATSTR, 10 , 0, EDGE);
        expectA(resultEdge);
      });

      it('zero-or-more (zero-or-one atom)', async() => {
        const resultNode = await constellation.goldbar(DESIGN_NAME, 'zero-or-more (zero-or-one a)', CATSTR, 10 , 0, NODE);
        expectA(resultNode);
        const resultEdge = await constellation.goldbar(DESIGN_NAME, 'zero-or-more (zero-or-one a)', CATSTR, 10 , 0, EDGE);
        expectA(resultEdge);
      });

      it('zero-or-one (one-or-more atom)', async() => {
        const resultNode = await constellation.goldbar(DESIGN_NAME, 'zero-or-one (one-or-more a)', CATSTR, 10 , 0, NODE);
        expectA(resultNode);
        const resultEdge = await constellation.goldbar(DESIGN_NAME, 'zero-or-one (one-or-more a)', CATSTR, 10 , 0, EDGE);
        expectA(resultEdge);
      });

      it('zero-or-one (zero-or-more atom)', async() => {
        const resultNode = await constellation.goldbar(DESIGN_NAME, 'zero-or-one (zero-or-more a)', CATSTR, 10 , 0, NODE);
        expectA(resultNode);
        const resultEdge = await constellation.goldbar(DESIGN_NAME, 'zero-or-one (zero-or-more a)', CATSTR, 10 , 0, EDGE);
        expectA(resultEdge);
      });

      it('zero-or-one (zero-or-one atom)', async() => {
        const resultNode = await constellation.goldbar(DESIGN_NAME, 'zero-or-one (zero-or-one a)', CATSTR, 10 , 0, NODE);
        expectA(resultNode);
        const resultEdge = await constellation.goldbar(DESIGN_NAME, 'zero-or-one (zero-or-one a)', CATSTR, 10 , 0, EDGE);
        expectA(resultEdge);
      });

    });


    describe('unary-op (binary-exp)', function() {
      // one-or-more
      it('one-or-more (atom or atom)', async() => {
        const resultNode = await constellation.goldbar(DESIGN_NAME, 'one-or-more (a or c)', CATSTR, 10 , 0, NODE);
        expect(resultNode.designs.length).to.equal(((ALEN * CLEN) * 2) + ALEN + CLEN);
        const resultEdge = await constellation.goldbar(DESIGN_NAME, 'one-or-more (a or c)', CATSTR, 10 , 0, EDGE);
        expect(resultEdge.designs.length).to.equal(((ALEN * CLEN) * 2) + ALEN + CLEN);
      });
      // AND only works on EDGE representation
      it('one-or-more (atom and atom)', async() => {
        const result = await constellation.goldbar(DESIGN_NAME, 'one-or-more (a and a)', CATSTR, 10 , 0, EDGE);
        expectA(result);
      });

      it('one-or-more (atom then atom)', async() => {
        const resultNode = await constellation.goldbar(DESIGN_NAME, 'one-or-more (a then b)', CATSTR, 10 , 0, NODE);
        expectACartesianB(resultNode);
        const resultEdge = await constellation.goldbar(DESIGN_NAME, 'one-or-more (a then b)', CATSTR, 10 , 0, EDGE);
        expectACartesianB(resultEdge);
      });

      // zero-or-more
      it('zero-or-more (atom or atom)', async() => {
        const resultNode = await constellation.goldbar(DESIGN_NAME, 'zero-or-more (a or b)', CATSTR, 10 , 0, NODE);
        expectAConcatB(resultNode);
        const resultEdge = await constellation.goldbar(DESIGN_NAME, 'zero-or-more (a or b)', CATSTR, 10 , 0, EDGE);
        expectAConcatB(resultEdge);
      });
      // AND only works on EDGE representation
      it('zero-or-more (atom and atom)', async() => {
        const result = await constellation.goldbar(DESIGN_NAME, 'zero-or-more (a and a)', CATSTR, 10 , 0, EDGE);
        expectA(result);
      });

      it('zero-or-more (atom then atom)', async() => {
        const resultNode = await constellation.goldbar(DESIGN_NAME, 'zero-or-more (a then b)', CATSTR, 10 , 0, NODE);
        expectACartesianB(resultNode);
        const resultEdge = await constellation.goldbar(DESIGN_NAME, 'zero-or-more (a then b)', CATSTR, 10 , 0, EDGE);
        expectACartesianB(resultEdge);
      });

      // zero-or-one
      it('zero-or-one (atom or atom)', async() => {
        const resultNode = await constellation.goldbar(DESIGN_NAME, 'zero-or-one (a or b)', CATSTR, 10 , 0, NODE);
        expectAConcatB(resultNode);
        const resultEdge = await constellation.goldbar(DESIGN_NAME, 'zero-or-one (a or b)', CATSTR, 10 , 0, EDGE);
        expectAConcatB(resultEdge);
      });
      // AND only works on EDGE representation
      it('zero-or-one (atom and atom)', async() => {
        const result = await constellation.goldbar(DESIGN_NAME, 'zero-or-one (a and a)', CATSTR, 10 , 0, EDGE);
        expectA(result);
      });

      it('zero-or-one (atom then atom)', async() => {
        const resultNode = await constellation.goldbar(DESIGN_NAME, 'zero-or-one (a then b)', CATSTR, 10 , 0, NODE);
        expectACartesianB(resultNode);
        const resultEdge = await constellation.goldbar(DESIGN_NAME, 'zero-or-one (a then b)', CATSTR, 10 , 0, EDGE);
        expectACartesianB(resultEdge);
      });
    });

    describe('(binary-exp) binary-op (atom)', function() {
      // Or
      it('(atom or atom) or atom', async() => {
        let resultNode = await constellation.goldbar(DESIGN_NAME, 'a or b or c', CATSTR, 10 , 0, NODE);
        expect(resultNode.designs.length).to.equal(ALEN + BLEN + CLEN);
        expect(resultNode.designs).to.have.members((CATEGORIES.c.ids).concat(CATEGORIES.b.ids).concat(CATEGORIES.a.ids));
        let resultEdge = await constellation.goldbar(DESIGN_NAME, 'a or b or c', CATSTR, 10 , 0, EDGE);
        expect(resultEdge.designs.length).to.equal(ALEN + BLEN + CLEN);
        expect(resultEdge.designs).to.have.members((CATEGORIES.c.ids).concat(CATEGORIES.b.ids).concat(CATEGORIES.a.ids));

        resultNode = await constellation.goldbar(DESIGN_NAME, 'a or a or b', CATSTR, 10 , 0, NODE);
        expectAConcatB(resultNode);
        resultEdge = await constellation.goldbar(DESIGN_NAME, 'a or a or b', CATSTR, 10 , 0, EDGE);
        expectAConcatB(resultEdge);
      });
      // AND only works on EDGE representation
      it('(atom or atom) and atom', async() => {
        const result = await constellation.goldbar(DESIGN_NAME, '(a or c) and a', CATSTR, 10 , 0, EDGE);
        expectA(result);
      });

      it('(atom or atom) then atom', async() => {
        const resultNode = await constellation.goldbar(DESIGN_NAME, '(a or b) then c', CATSTR, 10 , 0, NODE);
        expect(resultNode.designs.length).to.equal((ALEN * CLEN) + (BLEN * CLEN));
        expect(resultNode.designs).to.have.members((cartesian(CATEGORIES.b.ids, CATEGORIES.c.ids)).concat(cartesian(CATEGORIES.a.ids, CATEGORIES.c.ids)));

        const resultEdge = await constellation.goldbar(DESIGN_NAME, '(a or b) then c', CATSTR, 10 , 0, EDGE);
        expect(resultEdge.designs.length).to.equal((ALEN * CLEN) + (BLEN * CLEN));
        expect(resultEdge.designs).to.have.members((cartesian(CATEGORIES.b.ids, CATEGORIES.c.ids)).concat(cartesian(CATEGORIES.a.ids, CATEGORIES.c.ids)));
      });

      // And
      // AND only works on EDGE representation
      it('(atom and atom) or atom', async() => {
        const result = await constellation.goldbar(DESIGN_NAME, '(a and b) or c', CATSTR, 10 , 0, EDGE);
        expect(result.designs.length).to.equal(CLEN);
        expect(result.designs).to.have.members(CATEGORIES.c.ids);
      });

      it('(atom and atom) and atom', async() => {
        const result = await constellation.goldbar(DESIGN_NAME, '(a and a) and b', CATSTR, 10 , 0, EDGE);
        expect(result.designs.length).to.equal(0);
      });

      it('(atom and atom) then atom', async() => {
        const result = await constellation.goldbar(DESIGN_NAME, '(a and a) then b', CATSTR, 10 , 0, EDGE);
        expectACartesianB(result);
      });

      // Then
      it('(atom then atom) or atom', async() => {
        const resultNode = await constellation.goldbar(DESIGN_NAME, '(a then b) or c', CATSTR, 10 , 0, NODE);
        expect(resultNode.designs.length).to.equal((ALEN * BLEN) + CLEN);
        expect(resultNode.designs).to.have.members((CATEGORIES.c.ids).concat(cartesian(CATEGORIES.a.ids, CATEGORIES.b.ids)));

        const resultEdge = await constellation.goldbar(DESIGN_NAME, '(a then b) or c', CATSTR, 10 , 0, EDGE);
        expect(resultEdge.designs.length).to.equal((ALEN * BLEN) + CLEN);
        expect(resultEdge.designs).to.have.members((CATEGORIES.c.ids).concat(cartesian(CATEGORIES.a.ids, CATEGORIES.b.ids)));
      });

      it('(atom then atom) then atom', async() => {
        const resultNode = await constellation.goldbar(DESIGN_NAME, '(a then b) then c', CATSTR, 10 , 0, NODE);
        expect(resultNode.designs.length).to.equal(ALEN * BLEN * CLEN);
        expect(resultNode.designs).to.have.members(cartesian(CATEGORIES.a.ids, CATEGORIES.b.ids, CATEGORIES.c.ids));

        const resultEdge = await constellation.goldbar(DESIGN_NAME, '(a then b) then c', CATSTR, 10 , 0, EDGE);
        expect(resultEdge.designs.length).to.equal(ALEN * BLEN * CLEN);
        expect(resultEdge.designs).to.have.members(cartesian(CATEGORIES.a.ids, CATEGORIES.b.ids, CATEGORIES.c.ids));
      });
      // AND only works on EDGE representation
      it('(atom then atom) and atom', async() => {
        const result = await constellation.goldbar(DESIGN_NAME, '(a then b) and a', CATSTR, 10 , 0, EDGE);
        expect(result.designs.length).to.equal(0);
      });
    });

    describe('(atom) binary-op (unary-exp)', function() {
      // OR
      it('atom or (one-or-more atom)', async() => {
        const resultNode = await constellation.goldbar(DESIGN_NAME, 'a or (one-or-more b)', CATSTR, 10 , 0, NODE);
        expectAConcatB(resultNode);
        const resultEdge = await constellation.goldbar(DESIGN_NAME, 'a or (one-or-more b)', CATSTR, 10 , 0, EDGE);
        expectAConcatB(resultEdge);
      });

      it('atom or (zero-or-more atom)', async() => {
        const resultNode = await constellation.goldbar(DESIGN_NAME, 'a or (zero-or-more b)', CATSTR, 10 , 0, NODE);
        expectAConcatB(resultNode);
        const resultEdge = await constellation.goldbar(DESIGN_NAME, 'a or (zero-or-more b)', CATSTR, 10 , 0, EDGE);
        expectAConcatB(resultEdge);
      });

      it('atom or (zero-or-one atom)', async() => {
        const resultNode = await constellation.goldbar(DESIGN_NAME, 'a or (zero-or-one b)', CATSTR, 10 , 0, NODE);
        expectAConcatB(resultNode);
        const resultEdge = await constellation.goldbar(DESIGN_NAME, 'a or (zero-or-one b)', CATSTR, 10 , 0, EDGE);
        expectAConcatB(resultEdge);
      });

      // AND
      // AND only works on EDGE representation
      it('atom and (one-or-more atom)', async() => {
        const result = await constellation.goldbar(DESIGN_NAME, 'a and (one-or-more a)', CATSTR, 10 , 0, EDGE);
        expectA(result);
      });

      it('atom and (zero-or-more atom)', async() => {
        const result = await constellation.goldbar(DESIGN_NAME, 'a and (zero-or-more a)', CATSTR, 10 , 0, EDGE);
        expectA(result);
      });

      it('atom and (zero-or-one atom)', async() => {
        const result = await constellation.goldbar(DESIGN_NAME, 'a and (zero-or-one a)', CATSTR, 10 , 0, EDGE);
        expectA(result);
      });

      // THEN
      it('atom then (one-or-more atom)', async() => {
        const resultNode = await constellation.goldbar(DESIGN_NAME, 'a then (one-or-more b)', CATSTR, 10 , 0, NODE);
        expectACartesianB(resultNode);
        const resultEdge = await constellation.goldbar(DESIGN_NAME, 'a then (one-or-more b)', CATSTR, 10 , 0, EDGE);
        expectACartesianB(resultEdge);
      });

      it('atom then (zero-or-more atom)', async() => {
        const resultNode = await constellation.goldbar(DESIGN_NAME, 'a then (zero-or-more b)', CATSTR, 10 , 0, NODE);
        expectACartBAndEmpty(resultNode);
        const resultEdge = await constellation.goldbar(DESIGN_NAME, 'a then (zero-or-more b)', CATSTR, 10 , 0, EDGE);
        expectACartBAndEmpty(resultEdge);
      });

      it('atom then (zero-or-one atom)', async() => {
        const resultNode = await constellation.goldbar(DESIGN_NAME, 'a then (zero-or-one b)', CATSTR, 10 , 0, NODE);
        expectACartBAndEmpty(resultNode);
        const resultEdge = await constellation.goldbar(DESIGN_NAME, 'a then (zero-or-one b)', CATSTR, 10 , 0, EDGE);
        expectACartBAndEmpty(resultEdge);
      });
    });
  });


  describe('Cycles', function () {
    it('atom', async() => {
      let resultNode = await constellation.goldbar(DESIGN_NAME, 'c', CATSTR, 10, 2, NODE);
      expect(resultNode.designs.length).to.equal(CLEN);
      let resultEdge = await constellation.goldbar(DESIGN_NAME, 'c', CATSTR, 10, 2, EDGE);
      expect(resultEdge.designs.length).to.equal(CLEN);
    });

    it('zero-or-more', async() => {
      const resultNode = await constellation.goldbar(DESIGN_NAME, 'zero-or-more a', CATSTR, 10, 1, NODE);
      expect(resultNode.designs.length).to.equal(ALEN + ALEN * ALEN);
      expect(resultNode.designs).to.contain('a1');
      expect(resultNode.designs).to.contain('a2');
      expect(resultNode.designs).to.contain('a1,a1');
      expect(resultNode.designs).to.contain('a1,a2');
      expect(resultNode.designs).to.contain('a2,a1');
      expect(resultNode.designs).to.contain('a2,a2');
      // expect(resultNode.paths.length).to.equal(2);

      const resultEdge = await constellation.goldbar(DESIGN_NAME, 'zero-or-more a', CATSTR, 10, 1, EDGE);
      expect(resultEdge.designs.length).to.equal(ALEN + ALEN * ALEN);
      expect(resultEdge.designs).to.contain('a1');
      expect(resultEdge.designs).to.contain('a2');
      expect(resultEdge.designs).to.contain('a1,a1');
      expect(resultEdge.designs).to.contain('a1,a2');
      expect(resultEdge.designs).to.contain('a2,a1');
      expect(resultEdge.designs).to.contain('a2,a2');
      // expect(resultEdge.paths.length).to.equal(2);
    });
  });

  describe('Sanitise category input', function () {
    it('empty categories', async () => {
      await expect(constellation.goldbar(DESIGN_NAME, 'a', '{}', 10, 0, NODE)).to.be.rejectedWith('a is not defined in categories');
      await expect(constellation.goldbar(DESIGN_NAME, 'a', '{}', 10, 0, EDGE)).to.be.rejectedWith('a is not defined in categories');
    });

    it('handle defined but empty category', async () => {
      const resultNode = await constellation.goldbar(DESIGN_NAME, 'a', '{"a": {"ids":[], "roles":["a"]}}', 10, 0, NODE);
      expect(JSON.stringify(resultNode.designs)).to.equal('[]');
      const resultEdge = await constellation.goldbar(DESIGN_NAME, 'a', '{"a": {"ids":[], "roles":["a"]}}', 10, 0, EDGE);
      expect(JSON.stringify(resultEdge.designs)).to.equal('[]');
    });

    it('mismatched brackets', async() => {
      await expect(constellation.goldbar(DESIGN_NAME, '(a}', '{}', 10, 0, NODE)).to.be.rejectedWith('Parsing error!');
      await expect(constellation.goldbar(DESIGN_NAME, '(a}', '{}', 10, 0, EDGE)).to.be.rejectedWith('Parsing error!');
    });
  });

  describe('Invalid characters', function () {
    it('Whitespace should not be included in designs', async() => {
      const resultNode = await constellation.goldbar(DESIGN_NAME, 'a', '{"a":{"ids":["\ta1", " a2"], "roles":["a"]}}', 10, 0, NODE);
      expect(JSON.stringify(resultNode.designs)).to.contain('a1');
      expect(JSON.stringify(resultNode.designs)).to.contain('a2');

      const resultEdge = await constellation.goldbar(DESIGN_NAME, 'a', '{"a":{"ids":["\ta1", " a2"], "roles":["a"]}}', 10, 0, EDGE);
      expect(JSON.stringify(resultEdge.designs)).to.contain('a1');
      expect(JSON.stringify(resultEdge.designs)).to.contain('a2');
    });

    it('Other symbols should be parsed into category', async() => {
      const resultNode = await constellation.goldbar(DESIGN_NAME, 'a', '{"a":{"ids":["$a1", " a2"], "roles":["a"]}}', 10, 0, NODE);
      expect(JSON.stringify(resultNode.designs)).to.contain('a1');
      expect(JSON.stringify(resultNode.designs)).to.contain('a2');

      const resultEdge = await constellation.goldbar(DESIGN_NAME, 'a', '{"a":{"ids":["$a1", " a2"], "roles":["a"]}}', 10, 0, EDGE);
      expect(JSON.stringify(resultEdge.designs)).to.contain('a1');
      expect(JSON.stringify(resultEdge.designs)).to.contain('a2');
    });
  });


  describe('Sanitise specification input', function () {
    it('Atom not in categories', async() => {
      await expect(constellation.goldbar(DESIGN_NAME, 'd', CATSTR, 10, 0, NODE)).to.be.rejectedWith('d is not defined in categories');
      await expect(constellation.goldbar(DESIGN_NAME, 'd', CATSTR, 10, 0, EDGE)).to.be.rejectedWith('d is not defined in categories');
    });

    it('Mismatched brackets', async() => {
      await expect(constellation.goldbar(DESIGN_NAME, '(a}', CATSTR, 10, 0, NODE)).to.be.rejectedWith('Parsing error!');
      await expect(constellation.goldbar(DESIGN_NAME, '(a}', CATSTR, 10, 0, EDGE)).to.be.rejectedWith('Parsing error!');
    });

    describe('Invalid characters', function () {
      it('Tabs used should not throw errors', async () => {
        const resultNode = await constellation.goldbar(DESIGN_NAME, '\ta', CATSTR, 10, 0, NODE);
        expect(resultNode.designs).to.contain('a1');
        expect(resultNode.designs).to.contain('a2');

        const resultEdge = await constellation.goldbar(DESIGN_NAME, '\ta', CATSTR, 10, 0, EDGE);
        expect(resultEdge.designs).to.contain('a1');
        expect(resultEdge.designs).to.contain('a2');
      });

      // it('$', function () {
      //   expect(() => constellation.goldbar(DESIGN_NAME, 'a then $a', CATSTR, 10)).to.throw('Parsing error!');
      // });
      // TODO turn back on when imparse starts throwing errors

      it('_', async() => {
        await expect(constellation.goldbar(DESIGN_NAME, '_a', CATSTR, 10, 0, NODE)).to.be.rejectedWith('_a is not defined in categories');
        await expect(constellation.goldbar(DESIGN_NAME, '_a', CATSTR, 10, 0, EDGE)).to.be.rejectedWith('_a is not defined in categories');
      });
    });

  });



  //   it('Multiple one-or-more', function() {
  //     const result = constellation.goldbar(DESIGN_NAME, 'one-or-more (one-or-more a)', CATSTR, 10, 1);
  //     expect(result.designs.length).to.equal(ALEN + ALEN * ALEN);
  //     expect(result.designs).to.contain('a1');
  //     expect(result.designs).to.contain('a2');
  //     expect(result.designs).to.contain('a1,a1');
  //     expect(result.designs).to.contain('a1,a2');
  //     expect(result.designs).to.contain('a2,a1');
  //     expect(result.designs).to.contain('a2,a2');
  //     expect(result.paths.length).to.equal(2);
  //   });

  //   it('Multiple zero-or-more', function() {
  //     const result = constellation.goldbar(DESIGN_NAME, 'zero-or-more (zero-or-more a)', CATSTR, 10, 1);
  //     expect(result.designs.length).to.equal(ALEN + ALEN * ALEN);
  //     expect(result.designs).to.contain('a1');
  //     expect(result.designs).to.contain('a2');
  //     expect(result.designs).to.contain('a1,a1');
  //     expect(result.designs).to.contain('a1,a2');
  //     expect(result.designs).to.contain('a2,a1');
  //     expect(result.designs).to.contain('a2,a2');
  //     expect(result.paths.length).to.equal(2);
  //   });

  //   it('Then downstream from cycle', function() {
  //     const result = constellation.goldbar(DESIGN_NAME, 'zero-or-more a then b', CATSTR, 50, 1);
  //     expect(result.designs.length).to.equal(BLEN + ALEN * BLEN + ALEN * ALEN * BLEN);
  //   });

  // });
};
