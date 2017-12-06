var expect = require('chai').expect;

var constellation = require('../constellation');

// var categories = '{"promoter": ["BBa_R0040", "BBa_J23100"], "rbs": ["BBa_B0032", "BBa_B0034"], "gene": ["BBa_E0040", "BBa_E1010"], "terminator": ["BBa_B0010"]}';
var categories = '{"a":["a1","a2","a3"],"b":["b1","b2","b3"],"c":["c1"],"d":[]}';

categories = JSON.parse(categories);


describe('#constellation', function() {
    // BASIC OPERATORS
    it('atom', function() {
        var result = constellation('c', categories, 10);
        expect(JSON.stringify(result.designs)).to.equal(JSON.stringify(['c1']));
    });

    it('or', function() {
        var result = constellation('a or b', categories, 10);
        var paths = result.paths;
        
        // Correct path
        for (var i = 0; i < paths.length; i ++) {
            expect(paths[i].length).to.equal(1);
        }

        // expect(result.designs.length).to.equal(categories['a'].length * categories['b'].length);
        expect(result.designs.includes('a2')).to.equal(true);
        // expect(JSON.stringify(result.designs)).to.equal(JSON.stringify(['c1']));
    });

    it('then', function() {
        var result = constellation('a . b', categories, 10);
        expect(result.designs.length).to.equal(categories['a'].length * categories['b'].length);
        expect(result.designs.includes('a2 b3')).to.equal(true);
        // expect(JSON.stringify(result.designs)).to.equal(JSON.stringify(['c1']));
    });

    it('zero-or-more', function() {
        var result = constellation('zero-or-more a', categories, 10);
        var paths = result.paths;
        console.log(paths);

    });


    // BASIC ERRORS
    it ('basic errors', function() {
        var result = constellation('d', categories, 10);
        expect(JSON.stringify(result.designs)).to.equal(JSON.stringify([]));
    });
});