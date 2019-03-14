
const constellation = require('../lib/constellation');
const expect = require('chai').expect;
let fs = require('fs');

let NUM_DESIGNS = 10;
let MAX_CYCLES = 0;
let DESIGN_NAME = 'design';
const CATEGORIES = '{"rbs":["a1","a2"],"cds":["b1","b2","b3"],"promoter":["c1"], "terminator": ["t"]}';

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
    it('atom', function(done) {
      let result = constellation.goldbar(DESIGN_NAME, 'rbs', CATEGORIES, NUM_DESIGNS, MAX_CYCLES);

      readModuleFile('./sbolResults/atom.txt', function (err, words) {
        expect(err).to.be.a('null');
        expect(trimX(result.sbols[0].trim())).to.eql(trimX(words.trim()));
        done();
      });
    });

    it('Spec for paper', function(done) {
      const spec = 'one-or-more(one-or-more(promoter then cds)then cds then (zero-or-more (cds or (one-or-more (cds then promoter then cds) then cds)) then (terminator or (terminator then cds) or (cds then terminator)))))';
      let result = constellation.goldbar(DESIGN_NAME, spec, CATEGORIES, NUM_DESIGNS, MAX_CYCLES);

      readModuleFile('./sbolResults/paperEx.txt', function (err, words) {
        expect(err).to.be.a('null');
        expect(trimX(result.sbols[0].trim())).to.eql(trimX(words.trim()));
        done();
      });
    });
  });

  describe('SBOL Parsing', function() {

    it('Parse SBOL or', async function(){
      let result = constellation.goldbar(DESIGN_NAME, 'promoter or cds', CATEGORIES, NUM_DESIGNS, MAX_CYCLES);
      result = await constellation.sbol(result.sbols[0]);
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
      let result = constellation.goldbar(DESIGN_NAME, 'promoter then zero-or-more rbs then cds', CATEGORIES, NUM_DESIGNS, MAX_CYCLES);
      result = await constellation.sbol(result.sbols[0]);
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
