
const constellation = require('../lib/constellation');
const expect = require('chai').expect;
let fs = require('fs');

let NUM_DESIGNS = 10;
let MAX_CYCLES = 0;
let DESIGN_NAME = 'design';
const CATEGORIES = '{"rbs":["a1","a2"],"cds":["b1","b2","b3"],"promoter":["c1"], "terminator": ["t"]}';
const NODE = 'NODE';

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
      it('atom', function(done) {
        let result = constellation.goldbar(DESIGN_NAME, 'rbs', CATEGORIES, NUM_DESIGNS, MAX_CYCLES, NODE);

        readModuleFile('./sbolResults/atom.txt', function (err, words) {
          expect(err).to.be.a('null');
          expect(trimX(result.sbol.trim())).to.eql(trimX(words.trim()));
          done();
        });
      });

      it('one-or-more', function(done) {
        const spec = 'one-or-more rbs';
        let result = constellation.goldbar(DESIGN_NAME, spec, CATEGORIES, NUM_DESIGNS, MAX_CYCLES, NODE);

        readModuleFile('./sbolResults/one-or-more.txt', function (err, words) {
          expect(err).to.be.a('null');
          expect(trimX(result.sbol.trim())).to.eql(trimX(words.trim()));
          done();
        });
      });

      it('zero-or-more', function(done) {
        const spec = 'zero-or-more rbs';
        let result = constellation.goldbar(DESIGN_NAME, spec, CATEGORIES, NUM_DESIGNS, MAX_CYCLES, NODE);

        readModuleFile('./sbolResults/zero-or-more.txt', function (err, words) {
          expect(err).to.be.a('null');
          expect(trimX(result.sbol.trim())).to.eql(trimX(words.trim()));
          done();
        });
      });
    });

    describe('Binary expressions', function() {

      it('or', function(done) {
        const spec = 'promoter or rbs';
        let result = constellation.goldbar(DESIGN_NAME, spec, CATEGORIES, NUM_DESIGNS, MAX_CYCLES, NODE);

        readModuleFile('./sbolResults/or.txt', function (err, words) {
          expect(err).to.be.a('null');
          expect(trimX(result.sbol.trim())).to.eql(trimX(words.trim()));
          done();
        });
      });

      it('then', function(done) {
        const spec = 'promoter then rbs';
        let result = constellation.goldbar(DESIGN_NAME, spec, CATEGORIES, NUM_DESIGNS, MAX_CYCLES, NODE);

        readModuleFile('./sbolResults/then.txt', function (err, words) {
          expect(err).to.be.a('null');
          expect(trimX(result.sbol.trim())).to.eql(trimX(words.trim()));
          done();
        });
      });
    });
    
  });

  describe('SBOL Parsing', function() {

    it('Parse SBOL or', async function(){
      let result = constellation.goldbar(DESIGN_NAME, 'promoter or cds', CATEGORIES, NUM_DESIGNS, MAX_CYCLES, NODE);
      result = await constellation.sbol(result.sbol);
      let atomTexts = Object.values(result.stateGraph).map(obj => obj.text).sort();
      expect(atomTexts).to.be.an('array').that.includes('promoter');
      expect(atomTexts).to.be.an('array').that.includes('cds');

      let operators = [];
      for (let value of Object.values(result.stateGraph)){
        operators.push(...value.operator);
      }
      expect(operators).to.deep.eql(['Or']);
    });

    it('Parse SBOL repeat', async function(){
      let result = constellation.goldbar(DESIGN_NAME, 'promoter then zero-or-more rbs then cds', CATEGORIES, NUM_DESIGNS, MAX_CYCLES, NODE);
      result = await constellation.sbol(result.sbol);
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
