
const constellation = require('../lib/constellation');
const expect = require('chai').expect;
const fs = require('fs');

var DESIGN_NAME = 'design';
const CATEGORIES = '{"rbs":["a1","a2"],"cds":["b1","b2","b3"],"promoter":["c1"], "terminator": ["t"]}';

function trim(str) {
  return str.replace(/\s/g, "X");

}


module.exports = function() {
//
describe('SBOL Generation', function() {
  it('atom', function() {
    let result = constellation(DESIGN_NAME, 'rbs', CATEGORIES, 10, 0);
    
    fs.readFile('spec.txt', (err, data) => {
      if (err) throw err;

      expect(trim(result.sbols[0])).to.equal(data.toString());

    });
  });

  // it('Spec for paper', function() {
  //   let result = constellation(DESIGN_NAME, 'one-or-more(one-or-more(promoter then cds)then cds then (zero-or-more (cds or (one-or-more (cds then promoter then cds) then cds)) then (terminator or (terminator then cds) or (cds then terminator)))))', CATEGORIES, 10, 0);

    

  //   fs.readFile('spec.txt', (err, data) => {
  //     if (err) throw err;
  //     console.log(data.toString());
  //   });

  // });
});

}
