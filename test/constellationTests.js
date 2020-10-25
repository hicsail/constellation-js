const chai = require('chai');
const chaiAsPromised = require('chai-as-promised');
chai.use(chaiAsPromised);

const expect = chai.expect;
const constellation = require('../lib/constellation');

const CATEGORIES = {"a":{"a":["a1","a2"]},"b":{"b":["b1","b2","b3"]},"c":{"c":["c1"]}};
const CELLO_CATS = { "Cello_promoter": { "promoter": ["pLitR", "pQacR", "pIcaRA", "pSrpR", "pPhlF", "pLuxStar", "pTac", "pAmtR", "pTet", "pLmrA", "pCONST", "pAmeR", "pBAD", "pBetI", "pHlyIIR", "pBM3R1", "pPsrA"]},
  "Cello_CDS": {"cds": ["sigmaK1FR", "LmrA", "LacI", "QacR", "LitR", "IcaRA", "SrpR", "PhlF", "LuxR", "AmtR", "TetR", "AmeR", "BetI", "HlyIIR", "BM3R1", "PsrA", "BFP", "sigmaT3", "sigmaCGG", "AraC", "sigmaT7", "YFP", "RFP"]},
  "Cello_RBS": {"ribosomeBindingSite": ["P2", "N1", "B3", "S1", "BBa_B0064_rbs", "S2", "H1", "E1", "Q2", "P1", "B1", "S4", "R1", "B2", "L1", "Q1", "A1", "P3", "F1", "I1", "S3"]},
  "Cello_terminator": {"terminator": ["L3S2P24", "L3S2P11", "ECK120010818", "ECK120019600", "ECK120010876", "L3S3P11", "ECK120033736", "L3S3P31", "ECK120033737", "L3S2P21_terminator", "ECK120016170", "ECK120029600", "ECK120015440", "L3S2P55"]},
  "Cello_ribozyme": {"ribozyme": ["RiboJ54", "BydvJ", "RiboJ10", "SarJ", "RiboJ51", "RiboJ57", "ElvJ", "PlmJ", "ScmJ", "RiboJ", "RiboJ60", "RiboJ53", "RiboJ64"]}
};

const AMEM = getAllIDs(CATEGORIES.a);
const BMEM = getAllIDs(CATEGORIES.b);
const CMEM = getAllIDs(CATEGORIES.c);

const ALEN = AMEM.length;
const BLEN = BMEM.length;
const CLEN = CMEM.length;

const CATSTR = JSON.stringify(CATEGORIES);
const CELLOSTR = JSON.stringify(CELLO_CATS);

const NODE = 'NODE';
const EDGE = 'EDGE';
const NODE_REP = {representation:NODE};
const EDGE_REP = {representation:EDGE};

const f = (a, b) => [].concat(...a.map(d => b.map(e => d.concat(',').concat(e))));
const cartesian = (a, b, ...c) => (b ? cartesian(f(a, b), ...c) : a);

function expectAllReturnValues(result) {
  expect(result.stateGraph).to.not.equal(undefined);
  expect(result.designs).to.not.equal(undefined);
  expect(result.sbol).to.not.equal(undefined);
}

function revCompPart(partList) {
  let RC_MEM = [];
  for (let p of partList) {
    RC_MEM.push(`reverse-comp(${p})`);
  }
  return RC_MEM;
}

function expectA(result, reverse=false) {
  expectAllReturnValues(result);
  let partListA = AMEM;
  if (reverse) {
    partListA = revCompPart(partListA);
  }
  expect(result.designs.length).to.equal(partListA.length);
  expect(result.designs).to.have.members(partListA);
}

function expectAConcatB(result, reverse=false) {
  expectAllReturnValues(result);
  let partListA = AMEM;
  let partListB = BMEM;
  if (reverse) {
    partListA = revCompPart(partListA);
    partListB = revCompPart(partListB);
  }
  expect(result.designs.length).to.equal(partListB.length + partListA.length);
  expect(result.designs).to.have.members((partListB).concat(partListA));
}

function expectACartesianB(result, reverse=false) {
  expectAllReturnValues(result);
  let partListA = AMEM;
  let partListB = BMEM;
  // if a THEN is RC-ed, switch the order as well
  if (reverse) {
    const tmp = partListA;
    partListA = revCompPart(partListB);
    partListB = revCompPart(tmp);
  }
  expect(result.designs.length).to.equal(partListA.length * partListB.length);
  expect(result.designs).to.have.members(cartesian(partListA, partListB));
}

function expectACartBAndEmpty(result, reverse=false) {
  expectAllReturnValues(result);
  let emptiesAndCart = AMEM.concat(cartesian(AMEM, BMEM));
  if (reverse) {
    emptiesAndCart = revCompPart(emptiesAndCart);
  }
  expect(result.designs.length).to.equal(emptiesAndCart.length);
  expect(result.designs).to.have.members(emptiesAndCart);
}

function getAllIDs(category) {
  let ids = [];
  for (let role in category) {
    ids = [...new Set(ids.concat(category[role]))];
  }
  return ids;
}

module.exports = function() {
  describe('Missing input errors', function() {

    it('Missing specification', async() => {
      await expect(constellation.goldbar(null)).to.be.rejectedWith('No input received');
      await expect(constellation.goldbar(null)).to.be.rejectedWith('No input received');
    });

    it('Missing categories', async() => {
      await expect(constellation.goldbar('a', '{}')).to.be.rejectedWith('No categories specified');
    });

    it('Invalid num designs', async() => {
      await expect(constellation.goldbar('a', CATEGORIES, {numDesigns:0})).to.be.rejectedWith('Invalid number of designs');
    });

    it('Invalid cycle depth', async() => {
      await expect(constellation.goldbar('a', CATEGORIES, {maxCycles:-5})).to.be.rejectedWith('Invalid cycle depth');
      await expect(constellation.goldbar('a', CATEGORIES, {maxCycles:101})).to.be.rejectedWith('Invalid cycle depth');
    });

    it('Invalid representation', async() => {
      await expect(constellation.goldbar('a', CATEGORIES, {representation:'HOBBITS'})).to.be.rejectedWith('Invalid graph representation');
    });

  });

  describe('Operator unit tests, base cases', function() {

    describe('Unary expressions', function() {
      it('atom', async() => {
        const resultNode = await constellation.goldbar('a', CATSTR, NODE_REP);
        expectA(resultNode);
        const resultEdge = await constellation.goldbar('a', CATSTR, EDGE_REP);
        expectA(resultEdge);
      });

      it('one-or-more', async() => {
        const resultNode = await constellation.goldbar('one-or-more a', CATSTR, NODE_REP);
        expectA(resultNode);
        // expect(resultNode.paths.length).to.equal(1);

        const resultEdge = await constellation.goldbar('one-or-more a', CATSTR, EDGE_REP);
        expectA(resultEdge);
        // expect(resultEdge.paths.length).to.equal(1);
        // expect(result.paths[0].type === ATOM);
      });

      it('zero-or-more', async() => {
        const resultNode = await constellation.goldbar('zero-or-more a', CATSTR, NODE_REP);
        expectA(resultNode);
        const resultEdge = await constellation.goldbar('zero-or-more a', CATSTR, EDGE_REP);
        expectA(resultEdge);
        // TODO: state that empty string is not an option as an explicit design choice
      });

      it('zero-or-one', async() => {
        const resultNode = await constellation.goldbar('zero-or-one a', CATSTR, NODE_REP);
        expectA(resultNode);
        const resultEdge = await constellation.goldbar('zero-or-one a', CATSTR, EDGE_REP);
        expectA(resultEdge);
        // TODO: state that empty string is not an option as an explicit design choice
      });

      it('reverse-comp', async() => {
        const resultNode = await constellation.goldbar('reverse-comp(a)', CATSTR, NODE_REP);
        expectA(resultNode, true);
        // expectRevCompPart(resultNode, AMEM);
        const resultEdge = await constellation.goldbar('reverse-comp(a)', CATSTR, EDGE_REP);
        expectA(resultEdge, true);
        // expectRevCompPart(resultEdge, AMEM);
      });
    });

    describe('Binary expressions', function() {
      it('or', async() => {
        let resultNode = await constellation.goldbar('b or a', CATSTR, NODE_REP);
        expectAConcatB(resultNode);
        let resultEdge = await constellation.goldbar('b or a', CATSTR, EDGE_REP);
        expectAConcatB(resultEdge);
        resultNode = await constellation.goldbar('a or a', CATSTR, NODE_REP);
        expectA(resultNode);
        resultEdge = await constellation.goldbar('a or a', CATSTR, EDGE_REP);
        expectA(resultEdge);
        // TODO: what should the graph be?
      });

      it('then', async() => {
        let resultNode = await constellation.goldbar('a then b', CATSTR, NODE_REP);
        expectACartesianB(resultNode);
        let resultEdge = await constellation.goldbar('a then b', CATSTR, EDGE_REP);
        expectACartesianB(resultEdge);

        resultNode = await constellation.goldbar('a . b', CATSTR, NODE_REP);
        expectACartesianB(resultNode);
        resultEdge = await constellation.goldbar('a . b', CATSTR, EDGE_REP);
        expectACartesianB(resultEdge);
      });
    });
  });

  describe('Operator compositions', function() {
    // unary-op(unary-exp) is covered in the simplification tests
    describe('unary-op (binary-exp)', function() {
      // one-or-more
      it('one-or-more (atom or atom)', async() => {
        const resultNode = await constellation.goldbar('one-or-more (a or c)', CATSTR, NODE_REP);
        expectAllReturnValues(resultNode);
        expect(resultNode.designs.length).to.equal(ALEN + CLEN);
        const resultEdge = await constellation.goldbar('one-or-more (a or c)', CATSTR, EDGE_REP);
        expectAllReturnValues(resultEdge);
        expect(resultEdge.designs.length).to.equal(ALEN + CLEN);
      });
      // AND only works on EDGE representation
      it('one-or-more (atom and atom)', async() => {
        const result = await constellation.goldbar('one-or-more (a and0 a)', CATSTR, EDGE_REP);
        expectA(result);
      });

      it('one-or-more (atom then atom)', async() => {
        const resultNode = await constellation.goldbar('one-or-more (a then b)', CATSTR, NODE_REP);
        expectACartesianB(resultNode);
        const resultEdge = await constellation.goldbar('one-or-more (a then b)', CATSTR, EDGE_REP);
        expectACartesianB(resultEdge);
      });

      // zero-or-more
      it('zero-or-more (atom or atom)', async() => {
        const resultNode = await constellation.goldbar('zero-or-more (a or b)', CATSTR, NODE_REP);
        expectAConcatB(resultNode);
        const resultEdge = await constellation.goldbar('zero-or-more (a or b)', CATSTR, EDGE_REP);
        expectAConcatB(resultEdge);
      });
      // AND only works on EDGE representation
      it('zero-or-more (atom and atom)', async() => {
        const result = await constellation.goldbar('zero-or-more (a and0 a)', CATSTR, EDGE_REP);
        expectA(result);
      });

      it('zero-or-more (atom then atom)', async() => {
        const resultNode = await constellation.goldbar('zero-or-more (a then b)', CATSTR, NODE_REP);
        expectACartesianB(resultNode);
        const resultEdge = await constellation.goldbar('zero-or-more (a then b)', CATSTR, EDGE_REP);
        expectACartesianB(resultEdge);
      });

      // zero-or-one
      it('zero-or-one (atom or atom)', async() => {
        const resultNode = await constellation.goldbar('zero-or-one (a or b)', CATSTR, NODE_REP);
        expectAConcatB(resultNode);
        const resultEdge = await constellation.goldbar('zero-or-one (a or b)', CATSTR, EDGE_REP);
        expectAConcatB(resultEdge);
      });
      // AND only works on EDGE representation
      it('zero-or-one (atom and atom)', async() => {
        const result = await constellation.goldbar('zero-or-one (a and0 a)', CATSTR, EDGE_REP);
        expectA(result);
      });

      it('zero-or-one (atom then atom)', async() => {
        const resultNode = await constellation.goldbar('zero-or-one (a then b)', CATSTR, NODE_REP);
        expectACartesianB(resultNode);
        const resultEdge = await constellation.goldbar('zero-or-one (a then b)', CATSTR, EDGE_REP);
        expectACartesianB(resultEdge);
      });

      it('reverse-comp(atom or atom)', async() => {
        const resultNode = await constellation.goldbar('reverse-comp(a or b)', CATSTR, NODE_REP);
        expectAConcatB(resultNode, true);
        const resultEdge = await constellation.goldbar('reverse-comp(a or b)', CATSTR, EDGE_REP);
        expectAConcatB(resultEdge, true);
      });
      // AND only works on EDGE representation
      it('reverse-comp (atom and atom)', async() => {
        const result = await constellation.goldbar('reverse-comp(a and0 a)', CATSTR, EDGE_REP);
        expectA(result, true);
      });

      it('reverse-comp (atom then atom)', async() => {
        const resultNode = await constellation.goldbar('reverse-comp(a then b)', CATSTR, NODE_REP);
        expectACartesianB(resultNode, true);
        const resultEdge = await constellation.goldbar('reverse-comp(a then b)', CATSTR, EDGE_REP);
        expectACartesianB(resultEdge, true);
      });
    });

    describe('(binary-exp) binary-op (atom)', function() {
      // Or
      it('(atom or atom) or atom', async() => {
        let resultNode = await constellation.goldbar('a or b or c', CATSTR, NODE_REP);
        expectAllReturnValues(resultNode);
        expect(resultNode.designs.length).to.equal(ALEN + BLEN + CLEN);
        expect(resultNode.designs).to.have.members((CMEM).concat(BMEM).concat(AMEM));
        let resultEdge = await constellation.goldbar('a or b or c', CATSTR, EDGE_REP);
        expectAllReturnValues(resultEdge);
        expect(resultEdge.designs.length).to.equal(ALEN + BLEN + CLEN);
        expect(resultEdge.designs).to.have.members((CMEM).concat(BMEM).concat(AMEM));

        resultNode = await constellation.goldbar('a or a or b', CATSTR, NODE_REP);
        expectAConcatB(resultNode);
        resultEdge = await constellation.goldbar('a or a or b', CATSTR, EDGE_REP);
        expectAConcatB(resultEdge);
      });
      // AND only works on EDGE representation
      it('(atom or atom) and atom', async() => {
        const result = await constellation.goldbar('(a or c) and0 a', CATSTR, EDGE_REP);
        expectA(result);
      });

      it('(atom or atom) then atom', async() => {
        const resultNode = await constellation.goldbar('(a or b) then c', CATSTR, NODE_REP);
        expectAllReturnValues(resultNode);
        expect(resultNode.designs.length).to.equal((ALEN * CLEN) + (BLEN * CLEN));
        expect(resultNode.designs).to.have.members((cartesian(BMEM, CMEM)).concat(cartesian(AMEM, CMEM)));

        const resultEdge = await constellation.goldbar('(a or b) then c', CATSTR, EDGE_REP);
        expectAllReturnValues(resultEdge);
        expect(resultEdge.designs.length).to.equal((ALEN * CLEN) + (BLEN * CLEN));
        expect(resultEdge.designs).to.have.members((cartesian(BMEM, CMEM)).concat(cartesian(AMEM, CMEM)));
      });

      // And
      // AND only works on EDGE representation
      it('(atom and atom) or atom', async() => {
        const result = await constellation.goldbar('(a and0 b) or c', CATSTR, EDGE_REP);
        expectAllReturnValues(result);
        expect(result.designs.length).to.equal(CLEN);
        expect(result.designs).to.have.members(CMEM);
      });

      it('(atom and atom) and atom', async() => {
        const result = await constellation.goldbar('(a and0 a) and0 b', CATSTR, EDGE_REP);
        expectAllReturnValues(result);
        expect(result.designs.length).to.equal(0);
      });

      it('(atom and atom) then atom', async() => {
        const result = await constellation.goldbar('(a and0 a) then b', CATSTR, EDGE_REP);
        expectACartesianB(result);
      });

      // Then
      it('(atom then atom) or atom', async() => {
        const resultNode = await constellation.goldbar('(a then b) or c', CATSTR, NODE_REP);
        expectAllReturnValues(resultNode);
        expect(resultNode.designs.length).to.equal((ALEN * BLEN) + CLEN);
        expect(resultNode.designs).to.have.members((CMEM).concat(cartesian(AMEM, BMEM)));

        const resultEdge = await constellation.goldbar('(a then b) or c', CATSTR, EDGE_REP);
        expectAllReturnValues(resultEdge);
        expect(resultEdge.designs.length).to.equal((ALEN * BLEN) + CLEN);
        expect(resultEdge.designs).to.have.members((CMEM).concat(cartesian(AMEM, BMEM)));
      });

      it('(atom then atom) then atom', async() => {
        const resultNode = await constellation.goldbar('(a then b) then c', CATSTR, NODE_REP);
        expectAllReturnValues(resultNode);
        expect(resultNode.designs.length).to.equal(ALEN * BLEN * CLEN);
        expect(resultNode.designs).to.have.members(cartesian(AMEM, BMEM, CMEM));

        const resultEdge = await constellation.goldbar('(a then b) then c', CATSTR, EDGE_REP);
        expectAllReturnValues(resultEdge);
        expect(resultEdge.designs.length).to.equal(ALEN * BLEN * CLEN);
        expect(resultEdge.designs).to.have.members(cartesian(AMEM, BMEM, CMEM));
      });
      // AND only works on EDGE representation
      it('(atom then atom) and atom', async() => {
        const result = await constellation.goldbar('(a then b) and0 a', CATSTR, EDGE_REP);
        expectAllReturnValues(result);
        expect(result.designs.length).to.equal(0);
      });
    });

    describe('(atom) binary-op (unary-exp)', function() {
      // OR
      it('atom or (one-or-more atom)', async() => {
        const resultNode = await constellation.goldbar('a or (one-or-more b)', CATSTR, NODE_REP);
        expectAConcatB(resultNode);
        const resultEdge = await constellation.goldbar('a or (one-or-more b)', CATSTR, EDGE_REP);
        expectAConcatB(resultEdge);
      });

      it('atom or (zero-or-more atom)', async() => {
        const resultNode = await constellation.goldbar('a or (zero-or-more b)', CATSTR, NODE_REP);
        expectAConcatB(resultNode);
        const resultEdge = await constellation.goldbar('a or (zero-or-more b)', CATSTR, EDGE_REP);
        expectAConcatB(resultEdge);
      });

      it('atom or (zero-or-one atom)', async() => {
        const resultNode = await constellation.goldbar('a or (zero-or-one b)', CATSTR, NODE_REP);
        expectAConcatB(resultNode);
        const resultEdge = await constellation.goldbar('a or (zero-or-one b)', CATSTR, EDGE_REP);
        expectAConcatB(resultEdge);
      });

      // AND
      // AND only works on EDGE representation
      it('atom and (one-or-more atom)', async() => {
        const result = await constellation.goldbar('a and0 (one-or-more a)', CATSTR, EDGE_REP);
        expectA(result);
      });

      it('atom and (zero-or-more atom)', async() => {
        const result = await constellation.goldbar('a and0 (zero-or-more a)', CATSTR, EDGE_REP);
        expectA(result);
      });

      it('atom and (zero-or-one atom)', async() => {
        const result = await constellation.goldbar('a and0 (zero-or-one a)', CATSTR, EDGE_REP);
        expectA(result);
      });

      // THEN
      it('atom then (one-or-more atom)', async() => {
        const resultNode = await constellation.goldbar('a then (one-or-more b)', CATSTR, NODE_REP);
        expectACartesianB(resultNode);
        const resultEdge = await constellation.goldbar('a then (one-or-more b)', CATSTR, EDGE_REP);
        expectACartesianB(resultEdge);
      });

      it('atom then (zero-or-more atom)', async() => {
        const resultNode = await constellation.goldbar('a then (zero-or-more b)', CATSTR, NODE_REP);
        expectACartBAndEmpty(resultNode);
        const resultEdge = await constellation.goldbar('a then (zero-or-more b)', CATSTR, EDGE_REP);
        expectACartBAndEmpty(resultEdge);
      });

      it('atom then (zero-or-one atom)', async() => {
        const resultNode = await constellation.goldbar('a then (zero-or-one b)', CATSTR, NODE_REP);
        expectACartBAndEmpty(resultNode);
        const resultEdge = await constellation.goldbar('a then (zero-or-one b)', CATSTR, EDGE_REP);
        expectACartBAndEmpty(resultEdge);
      });
    });
  });


  describe('Cycles', function () {
    it('atom', async() => {
      let resultNode = await constellation.goldbar('c', CATSTR, {representation:NODE, maxCycles:2});
      expectAllReturnValues(resultNode);
      expect(resultNode.designs.length).to.equal(CLEN);
      let resultEdge = await constellation.goldbar('c', CATSTR, {representation:EDGE, maxCycles:2});
      expectAllReturnValues(resultEdge);
      expect(resultEdge.designs.length).to.equal(CLEN);
    });

    it('zero-or-more', async() => {
      const resultNode = await constellation.goldbar('zero-or-more a', CATSTR, {representation:NODE, maxCycles:1});
      expectAllReturnValues(resultNode);
      expect(resultNode.designs.length).to.equal(ALEN + ALEN * ALEN);
      expect(resultNode.designs).to.contain('a1');
      expect(resultNode.designs).to.contain('a2');
      expect(resultNode.designs).to.contain('a1,a1');
      expect(resultNode.designs).to.contain('a1,a2');
      expect(resultNode.designs).to.contain('a2,a1');
      expect(resultNode.designs).to.contain('a2,a2');
      // expect(resultNode.paths.length).to.equal(2);

      const resultEdge = await constellation.goldbar('zero-or-more a', CATSTR, {representation:EDGE, maxCycles:1});
      expectAllReturnValues(resultEdge);
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

    it('handle defined but empty category', async () => {
      const resultNode = await constellation.goldbar('a', '{"a": {"a":[]}}', NODE_REP);
      expect(JSON.stringify(resultNode.designs)).to.equal('[]');
      const resultEdge = await constellation.goldbar('a', '{"a": {"a":[]}}', EDGE_REP);
      expect(JSON.stringify(resultEdge.designs)).to.equal('[]');
    });

    it('mismatched brackets', async() => {
      await expect(constellation.goldbar('(a}', '{}', NODE_REP)).to.be.rejectedWith('Error parsing design specification');
      await expect(constellation.goldbar('(a}', '{}', EDGE_REP)).to.be.rejectedWith('Error parsing design specification');
    });
  });

  describe('Invalid characters', function () {
    it('Whitespace should not be included in designs', async() => {
      const resultNode = await constellation.goldbar('a', '{"a":{"a":["\ta1", " a2"]}}', NODE_REP);
      expect(JSON.stringify(resultNode.designs)).to.contain('a1');
      expect(JSON.stringify(resultNode.designs)).to.contain('a2');

      const resultEdge = await constellation.goldbar('a', '{"a":{"a":["\ta1", " a2"]}}', EDGE_REP);
      expect(JSON.stringify(resultEdge.designs)).to.contain('a1');
      expect(JSON.stringify(resultEdge.designs)).to.contain('a2');
    });

    it('Other symbols should be parsed into category', async() => {
      const resultNode = await constellation.goldbar('a', '{"a":{"a":["$a1", " a2"]}}', NODE_REP);
      expect(JSON.stringify(resultNode.designs)).to.contain('a1');
      expect(JSON.stringify(resultNode.designs)).to.contain('a2');

      const resultEdge = await constellation.goldbar('a', '{"a":{"a":["$a1", " a2"]}}', EDGE_REP);
      expect(JSON.stringify(resultEdge.designs)).to.contain('a1');
      expect(JSON.stringify(resultEdge.designs)).to.contain('a2');
    });
  });


  describe('Sanitise specification input', function () {
    it('Atom not in categories', async() => {
      await expect(constellation.goldbar('d', CATSTR, NODE_REP)).to.be.rejectedWith('d is not defined in categories');
      await expect(constellation.goldbar('d', CATSTR, EDGE_REP)).to.be.rejectedWith('d is not defined in categories');
    });

    it('Mismatched brackets', async() => {
      await expect(constellation.goldbar('(a}', CATSTR, NODE_REP)).to.be.rejectedWith('Error parsing design specification');
      await expect(constellation.goldbar('(a}', CATSTR, EDGE_REP)).to.be.rejectedWith('Error parsing design specification');
    });

    describe('Invalid characters', function () {
      it('Tabs used should not throw errors', async () => {
        const resultNode = await constellation.goldbar('\ta', CATSTR, NODE_REP);
        expect(resultNode.designs).to.contain('a1');
        expect(resultNode.designs).to.contain('a2');

        const resultEdge = await constellation.goldbar('\ta', CATSTR, EDGE_REP);
        expect(resultEdge.designs).to.contain('a1');
        expect(resultEdge.designs).to.contain('a2');
      });

      // it('$', function () {
      //   expect(() => constellation.goldbar('a then $a', CATSTR, 10)).to.throw('Error parsing design specification');
      // });
      // TODO turn back on when imparse starts throwing errors

      it('_', async() => {
        await expect(constellation.goldbar('_a', CATSTR, NODE_REP)).to.be.rejectedWith('_a is not defined in categories');
        await expect(constellation.goldbar('_a', CATSTR, EDGE_REP)).to.be.rejectedWith('_a is not defined in categories');
      });
    });

    describe('Show design limit message', function () {
      it('Designs were limited - return the warning message', async () => {
        const result = await constellation.goldbar('one-or-more(Cello_promoter then zero-or-one(Cello_promoter) then Cello_ribozyme then Cello_RBS then Cello_CDS then Cello_terminator)', CELLOSTR, EDGE_REP);
        expect(result.messages.exceedsDesigns).to.exist;
      });

      it('Designs were not limited - do not return the warning message', async () => {
        const result = await constellation.goldbar('a', CATSTR, EDGE_REP);
        expect(result.messages).to.not.have.any.keys('exceedsDesigns');
      });
    });

  });
};
