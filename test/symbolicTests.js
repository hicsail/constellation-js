const chai = require('chai');
const chaiAsPromised = require('chai-as-promised');
chai.use(chaiAsPromised);

const expect = chai.expect;
const constellation = require('../lib/constellation');

const CATEGORIES = {"a":{"a":["a1","a2"]},"b":{"b":["b1","b2","b3"]},"c":{"c":["c1"]}};

module.exports = function() {
  describe('operator tests', function() {
    describe('unary', function() {
      it('one-or-more', async() => {
        const r0 = await constellation.symbolic("(one-or-more a)", {"a": {"b": ["c"]}});
        expect(r0.designs).to.deep.equal(['c', 'c,c', 'c,c,c', 'c,c,c,c']);
      });
      it('zero-or-more', async() => {
        const r0 = await constellation.symbolic("(zero-or-more a)", {"a": {"b": ["c"]}});
        expect(r0.designs).to.deep.equal(['', 'c', 'c,c', 'c,c,c', 'c,c,c,c']);
      });
    });
    describe('binary', function() {
      it('then', async() => {
        const r0 = await constellation.symbolic("a then a", CATEGORIES);
        expect(r0.designs).to.deep.equal(['a1,a1', 'a1,a2', 'a2,a1', 'a2,a2']);
      });
      it('or', async() => {
        const r0 = await constellation.symbolic("(a or b)", CATEGORIES);
        expect(r0.designs).to.deep.equal(['a1', 'a2', 'b1', 'b2', 'b3']);
      });
      it('and0', async() => {
        const r0 = await constellation.symbolic("(a and0 a)", CATEGORIES);
        expect(r0.designs).to.deep.equal(['a1', 'a2']);
        const r1 = await constellation.symbolic("(a and0 b)", CATEGORIES);
        expect(r1.designs).to.deep.equal([]);
      });
    });
  });

  describe('expression tests', function() {
    it('one binary two unary', async() => {
      const r0 = await constellation.symbolic("(one-or-more a) then (one-or-more x)", {"a": {"b": ["c"]}, "x":{"y": ["z1", "z2", "z3"]}}, {"numDesigns": 5});
      expect(r0.designs).to.deep.equal(['c,z1', 'c,z2', 'c,z3', 'c,z1,z1', 'c,z1,z2']);
    });
    it('various combinations', async() => {
      const r0 = await constellation.symbolic("(a or b) then (b or c)", CATEGORIES, {"numDesigns": 5});
      expect(r0.designs).to.deep.equal(['a1,b1', 'a1,b2', 'a1,b3', 'a1,c1', 'a2,b1']);
      const r1 = await constellation.symbolic("(a or b) then (b or c)", CATEGORIES, {"numDesigns": 10});
      expect(r1.designs).to.deep.equal([
        'a1,b1', 'a1,b2',
        'a1,b3', 'a1,c1',
        'a2,b1', 'a2,b2',
        'a2,b3', 'a2,c1',
        'b1,b1', 'b1,b2'
      ]);
      const r2 = await constellation.symbolic("((a or b) then b) and0 (b then b)", CATEGORIES, {"numDesigns": 10});
      expect(r2.designs).to.deep.equal([
        'b1,b1', 'b1,b2',
        'b1,b3', 'b2,b1',
        'b2,b2', 'b2,b3',
        'b3,b1', 'b3,b2',
        'b3,b3'
      ]);
      const r3 = await constellation.symbolic("(zero-or-one a) and (one-or-more a)", CATEGORIES);
      expect(r3.designs).to.deep.equal([ '', 'a1', 'a2']);
      const r4 = await constellation.symbolic("(one-or-more a) then b", CATEGORIES);
      expect(r4.designs).to.deep.equal([
        'a1,b1',          'a1,b2',          'a1,b3',          'a2,b1',
        'a2,b2',          'a2,b3',          'a1,a1,b1',       'a1,a1,b2',
        'a1,a1,b3',       'a1,a2,b1',       'a1,a2,b2',       'a1,a2,b3',
        'a2,a1,b1',       'a2,a1,b2',       'a2,a1,b3',       'a2,a2,b1',
        'a2,a2,b2',       'a2,a2,b3',       'a1,a1,a1,b1',    'a1,a1,a1,b2',
        'a1,a1,a1,b3',    'a1,a1,a2,b1',    'a1,a1,a2,b2',    'a1,a1,a2,b3',
        'a1,a2,a1,b1',    'a1,a2,a1,b2',    'a1,a2,a1,b3',    'a1,a2,a2,b1',
        'a1,a2,a2,b2',    'a1,a2,a2,b3',    'a2,a1,a1,b1',    'a2,a1,a1,b2',
        'a2,a1,a1,b3',    'a2,a1,a2,b1',    'a2,a1,a2,b2',    'a2,a1,a2,b3',
        'a2,a2,a1,b1',    'a2,a2,a1,b2',    'a2,a2,a1,b3',    'a2,a2,a2,b1',
        'a2,a2,a2,b2',    'a2,a2,a2,b3',    'a1,a1,a1,a1,b1', 'a1,a1,a1,a1,b2',
        'a1,a1,a1,a1,b3', 'a1,a1,a1,a2,b1', 'a1,a1,a1,a2,b2', 'a1,a1,a1,a2,b3',
        'a1,a1,a2,a1,b1', 'a1,a1,a2,a1,b2', 'a1,a1,a2,a1,b3', 'a1,a1,a2,a2,b1',
        'a1,a1,a2,a2,b2', 'a1,a1,a2,a2,b3', 'a1,a2,a1,a1,b1', 'a1,a2,a1,a1,b2',
        'a1,a2,a1,a1,b3', 'a1,a2,a1,a2,b1', 'a1,a2,a1,a2,b2', 'a1,a2,a1,a2,b3',
        'a1,a2,a2,a1,b1', 'a1,a2,a2,a1,b2', 'a1,a2,a2,a1,b3', 'a1,a2,a2,a2,b1',
        'a1,a2,a2,a2,b2', 'a1,a2,a2,a2,b3', 'a2,a1,a1,a1,b1', 'a2,a1,a1,a1,b2',
        'a2,a1,a1,a1,b3', 'a2,a1,a1,a2,b1', 'a2,a1,a1,a2,b2', 'a2,a1,a1,a2,b3',
        'a2,a1,a2,a1,b1', 'a2,a1,a2,a1,b2', 'a2,a1,a2,a1,b3', 'a2,a1,a2,a2,b1',
        'a2,a1,a2,a2,b2', 'a2,a1,a2,a2,b3', 'a2,a2,a1,a1,b1', 'a2,a2,a1,a1,b2',
        'a2,a2,a1,a1,b3', 'a2,a2,a1,a2,b1', 'a2,a2,a1,a2,b2', 'a2,a2,a1,a2,b3',
        'a2,a2,a2,a1,b1', 'a2,a2,a2,a1,b2', 'a2,a2,a2,a1,b3', 'a2,a2,a2,a2,b1',
        'a2,a2,a2,a2,b2', 'a2,a2,a2,a2,b3'
      ]);
      const r5 = await constellation.symbolic("(zero-or-one a) or b", CATEGORIES);
      expect(r5.designs).to.deep.equal(['', 'a1', 'a2', 'b1', 'b2', 'b3']);
    });
  });
};
