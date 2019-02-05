
const constellation = require('../lib/constellation');
const expect = require('chai').expect;
var fs = require('fs');


var DESIGN_NAME = 'design';
const CATEGORIES = '{"rbs":["a1","a2"],"cds":["b1","b2","b3"],"promoter":["c1"], "terminator": ["t"]}';

function trimX(str) {
  return str.replace(/\s/g, "X");

}


function readModuleFile(path, callback) {
  try {
      var filename = require.resolve(path);
      fs.readFile(filename, 'utf8', callback);
  } catch (e) {
      callback(e);
  }
}

module.exports = function() {
  //
  describe('SBOL Generation', function() {
    it('atom', function(done) {
      let result = constellation(DESIGN_NAME, 'rbs', CATEGORIES, 10, 0);

      readModuleFile('./sbolResults/atom.txt', function (err, words) {
        expect(err).to.be.a('null');
        expect(trimX(result.sbols[0].trim())).to.eql(trimX(words.trim()));
        done();
      });
    });

    it('Spec for paper', function(done) {
      let result = constellation(DESIGN_NAME, 'one-or-more(one-or-more(promoter then cds)then cds then (zero-or-more (cds or (one-or-more (cds then promoter then cds) then cds)) then (terminator or (terminator then cds) or (cds then terminator)))))', CATEGORIES, 10, 0);

      readModuleFile('./sbolResults/paperEx.txt', function (err, words) {
        expect(err).to.be.a('null');
        expect(trimX(result.sbols[0].trim())).to.eql(trimX(words.trim()));
        done();
      });
    });
  });
}
