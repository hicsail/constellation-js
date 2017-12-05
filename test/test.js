var expect = require('chai').expect;

var constellation = require('../constellation');


describe('#constellation', function() {
    it('atom', function() {
        var result = constellation('a', [], 10);
        console.log(result)
        // expect(result).to.equal(' ');
    });
});