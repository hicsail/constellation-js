
const constellation = require('../lib/constellation');
const expect = require('chai').expect;
let fs = require('fs').promises;

const CATEGORIES = '{"rbs":{"rbs":["a1","a2"]},"cds":{"cds":["b1","b2","b3"]},"promoter":{"promoter":["c1"]}, "terminator": {"terminator":["t"]}}';
const NODE = 'NODE';
const NODE_REP = {designName: 'design', representation:NODE};

const EDGE = 'EDGE';
const EDGE_REP = {designName: 'design', representation:EDGE};

function trimX(str) {
  return str.replace(/\s/g, "X");
}

async function readModuleFile(path) {
  let filename = require.resolve(path);
  try {
    return await fs.readFile(filename, 'utf8');
  } catch (e) {
    return e;
  }
}

function getEdgeAtoms(stateGraph) {
  let parts = [];
  for (let id in stateGraph) {
    for (let edge of stateGraph[id].edges) {
      if (edge.type === 'atom') {
        parts.push(edge.text);
      }
    }
  }
  return parts;
}

module.exports = function() {

  describe('SBOL Generation', function() {

    describe('Unary expressions NODE', function() {
      it('atom', async() => {
        let result = await constellation.goldbar('rbs', CATEGORIES, NODE_REP);
        let words = await readModuleFile('./sbolResults/atom.txt');
        expect(trimX(result.sbol.trim())).to.eql(trimX(words.trim()));
      });

      it('one-or-more', async()=> {
        const spec = 'one-or-more rbs';
        let result = await constellation.goldbar(spec, CATEGORIES, NODE_REP);
        let words = await readModuleFile('./sbolResults/one-or-more.txt');
        expect(trimX(result.sbol.trim())).to.eql(trimX(words.trim()));
      });

      it('zero-or-more', async() => {
        const spec = 'zero-or-more rbs';
        let result = await constellation.goldbar(spec, CATEGORIES, NODE_REP);
        let words = await readModuleFile('./sbolResults/zero-or-more.txt');
        expect(trimX(result.sbol.trim())).to.eql(trimX(words.trim()));
      });
    });

    describe('Unary expressions EDGE', function() {
      it('atom', async() => {
        let result = await constellation.goldbar('rbs', CATEGORIES, EDGE_REP);
        let words = await readModuleFile('./sbolResults/atom.txt');
        expect(trimX(result.sbol.trim())).to.eql(trimX(words.trim()));
      });

      it('one-or-more', async()=> {
        const spec = 'one-or-more rbs';
        let result = await constellation.goldbar(spec, CATEGORIES, EDGE_REP);
        let words = await readModuleFile('./sbolResults/one-or-more.txt');
        expect(trimX(result.sbol.trim())).to.eql(trimX(words.trim()));
      });

      it('zero-or-more', async() => {
        const spec = 'zero-or-more rbs';
        let result = await constellation.goldbar(spec, CATEGORIES, EDGE_REP);
        let words = await readModuleFile('./sbolResults/zero-or-more.txt');
        expect(trimX(result.sbol.trim())).to.eql(trimX(words.trim()));
      });
    });

    describe('Binary expressions NODE', function() {

      it('or', async() => {
        const spec = 'promoter or rbs';
        let result = await constellation.goldbar(spec, CATEGORIES, NODE_REP);
        let words = await readModuleFile('./sbolResults/or.txt');
        expect(trimX(result.sbol.trim())).to.eql(trimX(words.trim()));
      });

      it('then', async() => {
        const spec = 'promoter then rbs';
        let result = await constellation.goldbar(spec, CATEGORIES, NODE_REP);
        let words = await readModuleFile('./sbolResults/then.txt');
        expect(trimX(result.sbol.trim())).to.eql(trimX(words.trim()));
      });
    });

    describe('Binary expressions EDGE', function() {

      it('or', async() => {
        const spec = 'promoter or rbs';
        let result = await constellation.goldbar(spec, CATEGORIES, EDGE_REP);
        let words = await readModuleFile('./sbolResults/or.txt');
        expect(trimX(result.sbol.trim())).to.eql(trimX(words.trim()));
      });

      it('then', async() => {
        const spec = 'promoter then rbs';
        let result = await constellation.goldbar(spec, CATEGORIES, EDGE_REP);
        let words = await readModuleFile('./sbolResults/then.txt');
        expect(trimX(result.sbol.trim())).to.eql(trimX(words.trim()));
      });
    });

  });

  describe('SBOL Parsing', function() {

    it('Parse SBOL or', async() => {
      let result = await constellation.goldbar('promoter or cds', CATEGORIES, NODE_REP);
      result = await constellation.sbol([result.sbol],'', 0, NODE);
      let atomTexts = Object.values(result.stateGraph).map(obj => obj.text).sort();
      expect(atomTexts).to.be.an('array').that.includes('promoter');
      expect(atomTexts).to.be.an('array').that.includes('cds');

      let operators = [];
      for (let value of Object.values(result.stateGraph)){
        operators.push(...value.operator);
      }
      expect(operators).to.deep.eql(['Or']);
    });

    it('Parse SBOL repeat', async() => {
      let result = await constellation.goldbar('promoter then zero-or-more rbs then cds', CATEGORIES, NODE_REP);
      result = await constellation.sbol([result.sbol], '', 0, NODE);
      let atomTexts = Object.values(result.stateGraph).map(obj => obj.text).sort();
      expect(atomTexts).to.be.an('array').that.includes('promoter');
      expect(atomTexts).to.be.an('array').that.includes('rbs');
      expect(atomTexts).to.be.an('array').that.includes('cds');

        let operators = [];
        for (let value of Object.values(result.stateGraph)){
          operators.push(...value.operator);
        }
        operators.sort();
        expect(operators).to.deep.eql(['Then', 'Then', 'ZeroOrMore']);
    });

    it('Parse SBOL or', async() => {
      let result = await constellation.goldbar('promoter or cds', CATEGORIES, EDGE_REP);
      result = await constellation.sbol([result.sbol],'', 0, EDGE);
      let atomTexts = getEdgeAtoms(result.stateGraph).sort();
      expect(atomTexts).to.be.an('array').that.includes('promoter');
      expect(atomTexts).to.be.an('array').that.includes('cds');

      let operators = [];
      for (let value of Object.values(result.stateGraph)){
        operators.push(...value.operator);
      }
      expect(operators).to.deep.eql(['Or']);
    });

    it('Parse SBOL repeat', async() => {
      let result = await constellation.goldbar('promoter then zero-or-more rbs then cds', CATEGORIES, EDGE_REP);
      result = await constellation.sbol([result.sbol], '', 0, EDGE);
      let atomTexts = getEdgeAtoms(result.stateGraph).sort();
      expect(atomTexts).to.be.an('array').that.includes('promoter');
      expect(atomTexts).to.be.an('array').that.includes('rbs');
      expect(atomTexts).to.be.an('array').that.includes('cds');

        let operators = [];
        for (let value of Object.values(result.stateGraph)){
          operators.push(...value.operator);
        }
        operators.sort();
        expect(operators).to.deep.eql(['Then', 'Then', 'ZeroOrMore']);
    });
  });

};
