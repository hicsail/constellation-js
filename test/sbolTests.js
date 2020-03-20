
const constellation = require('../lib/constellation');
const expect = require('chai').expect;
let fs = require('fs');

const CATEGORIES = '{"rbs":{"rbs":["a1","a2"]},"cds":{"cds":["b1","b2","b3"]},"promoter":{"promoter":["c1"]}, "terminator": {"terminator":["t"]}}';
const NODE = 'NODE';
const NODE_REP = {designName: 'design', representation:NODE};

function trimX(str) {
  return str.replace(/\s/g, "X");
}

function readModuleFile(path, callback) {
  try {
      let filename = require.resolve(path);
      fs.readFile(filename, 'utf8', callback);
  } catch (e) {
      callback(e);
  }
}

module.exports = function() {

  describe('SBOL Generation', function() {

    describe('Unary expressions', function() {
      it('atom', async() => {
        let result = await constellation.goldbar('rbs', CATEGORIES, NODE_REP);

        readModuleFile('./sbolResults/atom.txt', function (err, words) {
          expect(err).to.be.a('null');
          expect(trimX(result.sbol.trim())).to.eql(trimX(words.trim()));
        });
      });

      it('one-or-more', async()=> {
        const spec = 'one-or-more rbs';
        let result = await constellation.goldbar(spec, CATEGORIES, NODE_REP);

        readModuleFile('./sbolResults/one-or-more.txt', function (err, words) {
          expect(err).to.be.a('null');
          expect(trimX(result.sbol.trim())).to.eql(trimX(words.trim()));
        });
      });

      it('zero-or-more', async() => {
        const spec = 'zero-or-more rbs';
        let result = await constellation.goldbar(spec, CATEGORIES, NODE_REP);

        readModuleFile('./sbolResults/zero-or-more.txt', function (err, words) {
          expect(err).to.be.a('null');
          expect(trimX(result.sbol.trim())).to.eql(trimX(words.trim()));
        });
      });
    });

    describe('Binary expressions', function() {

      it('or', async() => {
        const spec = 'promoter or rbs';
        let result = await constellation.goldbar(spec, CATEGORIES, NODE_REP);

        readModuleFile('./sbolResults/or.txt', function (err, words) {
          expect(err).to.be.a('null');
          expect(trimX(result.sbol.trim())).to.eql(trimX(words.trim()));
        });
      });

      it('then', async() => {
        const spec = 'promoter then rbs';
        let result = await constellation.goldbar(spec, CATEGORIES, NODE_REP);

        readModuleFile('./sbolResults/then.txt', function (err, words) {
          expect(err).to.be.a('null');
          expect(trimX(result.sbol.trim())).to.eql(trimX(words.trim()));
        });
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
  });

};
