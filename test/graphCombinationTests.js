const chai = require('chai');
const chaiAsPromised = require('chai-as-promised');
chai.use(chaiAsPromised);

const expect = chai.expect;
const constellation = require('../lib/constellation');

const CATEGORIES = {"cds1": {"cds": ["tetR", "lacI"]},
  "cds2": {"cds": ["tetR", "cI"]},
  "cds3": {"cds": ["gfp", "rfp"]},
  "cds4": {"cds": ["rfp", "yfp"]},
  "cds5": {"cds": ["tetR", "gfp"]}};

const FOR_TOLERANCE = {"a1":{"a":["first","second"]},"a2":{"a":["first"], "letter": ["first"]},"a3":{"a":[]}, "a4":{"letter":[]}};

const CATSTR = JSON.stringify(CATEGORIES);
const TOLSTR = JSON.stringify(FOR_TOLERANCE);

const NODE = 'NODE';
const EDGE = 'EDGE';
const EDGE_REP = {representation:EDGE};
const NODE_REP = {representation:NODE};


function expectAllReturnValues(result) {
  expect(result.stateGraph).to.not.equal(undefined);
  expect(result.designs).to.not.equal(undefined);
  expect(result.sbol).to.not.equal(undefined);
}

async function expectIntersection(goldbar1, goldbar2) {
  const one = await constellation.goldbar(goldbar1, CATSTR, EDGE_REP);
  const two = await constellation.goldbar(goldbar2, CATSTR, EDGE_REP);
  const result = await constellation.goldbar(goldbar1 + ' and ' + goldbar2, CATSTR, EDGE_REP);
  expectAllReturnValues(result);
  const intersection = one.designs.filter(value => two.designs.includes(value));
  expect(result.designs.length).to.equal(intersection.length);
  expect(result.designs).to.have.members(intersection);
}

function expectTol0(result) {
  expectAllReturnValues(result);
  let a2IDS = getAllIDs(FOR_TOLERANCE.a2);
  expect(result.designs.length).to.equal(a2IDS.length);
  expect(result.designs).to.have.members(a2IDS);
}

function expectTol1(result) {
  expectAllReturnValues(result);
  let a1IDS = getAllIDs(FOR_TOLERANCE.a1);
  expect(result.designs.length).to.equal(a1IDS.length);
  expect(result.designs).to.have.members(a1IDS);
}

function getAllIDs(category) {
  let ids = [];
  for (let role in category) {
    ids = [...new Set(ids.concat(category[role]))];
  }
  return ids;
}



module.exports = function() {
  describe('AND tests', function() {
    describe('toy examples', function () {
      it('cds1 and cds2', async () => {
        await expectIntersection('cds1', 'cds2');
      });

      it('zero-or-one(cds1) and zero-or-one(cds2)', async () => {
        await expectIntersection('zero-or-one(cds1)', 'zero-or-one(cds2)');
      });

      it('zero-or-more(cds1) and zero-or-more(cds2)', async () => {
        await expectIntersection('zero-or-more(cds1)', 'zero-or-more(cds2)');
      });

      it('one-or-more(cds1) and one-or-more(cds2)', async () => {
        await expectIntersection('one-or-more(cds1)', 'one-or-more(cds2)');
      });

      it('(cds1 then cds3) and (cds2 then cds4)', async () => {
        await expectIntersection('(cds1 then cds3)', '(cds2 then cds4)');
      });

      // TODO: not sure how to write this one because the result is not the intersection of the original designs
      // it('(cds1 then cds3) and one-or-more(cds5)', async () => {
      //   await expectIntersection('(cds1 then cds3)', 'one-or-more(cds5)');
      // });

      it('cds1 and (cds2 then zero-or-one(cds4))', async () => {
        await expectIntersection('cds1', '(cds2 then zero-or-one(cds4))');
      });

      it('one-or-more(cds5) and (cds2 then zero-or-one(cds4))', async () => {
        await expectIntersection('one-or-more(cds5)', '(cds2 then zero-or-one(cds4))');
      });

      it('and NODE', async () => {
        await expect(constellation.goldbar('a1 and a2', TOLSTR, NODE_REP)).to.be.rejectedWith('The AND operation is not supported in the NODE representation');
      });

      it('and tolerance 0', async () => {
        let result = await constellation.goldbar('a1 and a2', TOLSTR, EDGE_REP);
        expectTol0(result);
      });

      it('and tolerance 1', async () => {
        let result = await constellation.goldbar('a1 and a3', TOLSTR, {representation:EDGE, andTolerance:1});
        expectTol1(result);
      });

      it('and tolerance 2', async () => {
        let result = await constellation.goldbar('a3 and a4', TOLSTR, {representation:EDGE, andTolerance:2});
        expectAllReturnValues(result);
        expect(result.designs.length).to.equal(0);
      });
    });
  });
};



