
const constellation = require('../lib/constellation');
const expect = require('chai').expect;
let fs = require('fs');

let NUM_DESIGNS = 10;
let MAX_CYCLES = 0;
let DESIGN_NAME = 'design';
const CATEGORIES = '{"rbs":{"ids":["a1","a2"], "roles":["rbs"]},"cds":{"ids":["b1","b2","b3"], "roles":["cds"]},"promoter":{"ids":["c1"], "roles":["promoter"]}, "terminator": {"ids":["t"], "roles":["terminator"]}}';
const NODE = 'NODE';

const util = require('util');

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
        let result = await constellation.goldbar(DESIGN_NAME, 'rbs', CATEGORIES, NUM_DESIGNS, MAX_CYCLES, NODE);

        readModuleFile('./sbolResults/atom.txt', function (err, words) {
          expect(err).to.be.a('null');
          expect(trimX(result.sbol.trim())).to.eql(trimX(words.trim()));
        });
      });

      it('one-or-more', async()=> {
        const spec = 'one-or-more rbs';
        let result = await constellation.goldbar(DESIGN_NAME, spec, CATEGORIES, NUM_DESIGNS, MAX_CYCLES, NODE);

        readModuleFile('./sbolResults/one-or-more.txt', function (err, words) {
          expect(err).to.be.a('null');
          expect(trimX(result.sbol.trim())).to.eql(trimX(words.trim()));
        });
      });

      it('zero-or-more', async() => {
        const spec = 'zero-or-more rbs';
        let result = await constellation.goldbar(DESIGN_NAME, spec, CATEGORIES, NUM_DESIGNS, MAX_CYCLES, NODE);

        readModuleFile('./sbolResults/zero-or-more.txt', function (err, words) {
          expect(err).to.be.a('null');
          expect(trimX(result.sbol.trim())).to.eql(trimX(words.trim()));
        });
      });
    });

    describe('Binary expressions', function() {

      it('or', async() => {
        const spec = 'promoter or rbs';
        let result = await constellation.goldbar(DESIGN_NAME, spec, CATEGORIES, NUM_DESIGNS, MAX_CYCLES, NODE);

        readModuleFile('./sbolResults/or.txt', function (err, words) {
          expect(err).to.be.a('null');
          expect(trimX(result.sbol.trim())).to.eql(trimX(words.trim()));
        });
      });

      it('then', async() => {
        const spec = 'promoter then rbs';
        let result = await constellation.goldbar(DESIGN_NAME, spec, CATEGORIES, NUM_DESIGNS, MAX_CYCLES, NODE);

        readModuleFile('./sbolResults/then.txt', function (err, words) {
          expect(err).to.be.a('null');
          expect(trimX(result.sbol.trim())).to.eql(trimX(words.trim()));
        });
      });
    });
    
  });

  describe('SBOL Parsing', function() {

    it('Parse SBOL or', async() => {
      let result = await constellation.goldbar(DESIGN_NAME, 'promoter or cds', CATEGORIES, NUM_DESIGNS, MAX_CYCLES, NODE);
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

    it('Parse SBOL repeat', async() => {
      let result = await constellation.goldbar(DESIGN_NAME, 'promoter then zero-or-more rbs then cds', CATEGORIES, NUM_DESIGNS, MAX_CYCLES, NODE);
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
