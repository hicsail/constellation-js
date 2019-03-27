const expect = require('chai').expect;
const constellation = require('../lib/constellation');

const CATEGORIES = {"a":["a1","a2"],"b":["b1","b2","b3"],"c":["c1"]};
const ALEN = CATEGORIES.a.length;
const BLEN = CATEGORIES.b.length;
const CLEN = CATEGORIES.c.length;

const CATSTR = JSON.stringify(CATEGORIES);
const DESIGN_NAME = 'design';

const f = (a, b) => [].concat(...a.map(d => b.map(e => d.concat(',').concat(e))));
const cartesian = (a, b, ...c) => (b ? cartesian(f(a, b), ...c) : a);

module.exports = function() {
  describe('Operator unit tests, base cases', function() {

    describe('Unary expressions', function() {
      it('atom', function() {
        let result = constellation.goldbar(DESIGN_NAME, 'a', CATSTR, 10, 0);
        expect(result.designs.length).to.equal(ALEN);
        expect(result.designs).to.have.members(CATEGORIES.a);
      });

      it('one-or-more', function() {
        let result = constellation.goldbar(DESIGN_NAME, 'one-or-more a', CATSTR, 10, 0);
        expect(result.designs.length).to.equal(ALEN);
        expect(result.designs).to.have.members(CATEGORIES.a);
        expect(result.paths.length).to.equal(1);
        // expect(result.paths[0].type === ATOM);
      });

      it('zero-or-more', function() {
        const result = constellation.goldbar(DESIGN_NAME, 'zero-or-more a', CATSTR, 10, 0);
        expect(result.designs.length).to.equal(ALEN);
        expect(result.designs).to.have.members(CATEGORIES.a);
        // TODO: state that empty string is not an option as an explicit design choice
      });
    });

    describe('Binary expressions', function() {
      it('and', function() {
        let result = constellation.goldbar(DESIGN_NAME, 'a and a', CATSTR, 10, 0);
        expect(result.designs.length).to.equal(ALEN);
        expect(result.designs).to.have.members(CATEGORIES.a);

        result = constellation.goldbar(DESIGN_NAME, 'a and b', CATSTR, 10, 0);
        expect(result.designs.length).to.equal(0);
      });

      it('or', function() {
        let result = constellation.goldbar(DESIGN_NAME, 'b or a', CATSTR, 10, 0);
        expect(result.designs.length).to.equal(ALEN + BLEN);
        expect(result.designs).to.have.members((CATEGORIES.a).concat(CATEGORIES.b));

        result = constellation.goldbar(DESIGN_NAME, 'a or a', CATSTR, 10, 0);
        expect(result.designs.length).to.equal(ALEN);
        expect(result.designs).to.have.members(CATEGORIES.a);
        // TODO: what should the graph be?
      });

      it('then', function() {
        let result = constellation.goldbar(DESIGN_NAME, 'a then c', CATSTR, 10, 0);
        expect(result.designs.length).to.equal(ALEN * CLEN);
        expect(result.designs).to.have.members(cartesian(CATEGORIES.a, CATEGORIES.c));

        result = constellation.goldbar(DESIGN_NAME, 'a . c', CATSTR, 10, 0);
        expect(result.designs.length).to.equal(ALEN * CLEN);
        expect(result.designs).to.have.members(cartesian(CATEGORIES.a, CATEGORIES.c));
      });
    });
  });


  describe('unary op (unary exp)', function() {
    it('one-or-more (one-or-more atom)', function() {
      const result = constellation.goldbar(DESIGN_NAME, 'one-or-more (one-or-more a)', CATSTR, 10 , 0);
      expect(result.designs.length).to.equal(ALEN);
      expect(result.designs).to.have.members(CATEGORIES.a);
    });

    // TODO: this graph looks wrong
    it('one-or-more (zero-or-more atom)', function() {
      const result = constellation.goldbar(DESIGN_NAME, 'one-or-more (zero-or-more a)', CATSTR, 10 , 0);
      expect(result.designs.length).to.equal(ALEN);
      expect(result.designs).to.have.members(CATEGORIES.a); 
    });

    it('zero-or-more (zero-or-more atom)', function() {
      const result = constellation.goldbar(DESIGN_NAME, 'zero-or-more (zero-or-more a)', CATSTR, 10 , 0);
      expect(result.designs.length).to.equal(ALEN);
      expect(result.designs).to.have.members(CATEGORIES.a);  
    });

    it('zero-or-more (one-or-more atom)', function() {
      const result = constellation.goldbar(DESIGN_NAME, 'zero-or-more (one-or-more a)', CATSTR, 10 , 0);
      expect(result.designs.length).to.equal(ALEN);
      expect(result.designs).to.have.members(CATEGORIES.a);       
    });
  });

  describe('unary-op (binary-exp)', function() {
    // zero-or-more
    it('zero-or-more (atom or atom)', function() {
      const result = constellation.goldbar(DESIGN_NAME, 'zero-or-more (a or b)', CATSTR, 10 , 0);
      expect(result.designs.length).to.equal(ALEN + BLEN);
      expect(result.designs).to.have.members((CATEGORIES.b).concat(CATEGORIES.a));
    });

    it('zero-or-more (atom and atom)', function() {
      const result = constellation.goldbar(DESIGN_NAME, 'zero-or-more (a and a)', CATSTR, 10 , 0);
      expect(result.designs.length).to.equal(ALEN);
      expect(result.designs).to.have.members(CATEGORIES.a);
    });

    it('zero-or-more (atom then atom)', function() {
      const result = constellation.goldbar(DESIGN_NAME, 'zero-or-more (a then a)', CATSTR, 10 , 0);
      expect(result.designs.length).to.equal(ALEN * ALEN);
      expect(result.designs).to.have.members(["a1,a1","a1,a2","a2,a1","a2,a2"]);
    });

    // one-or-more
    it('one-or-more (atom or atom)', function() {
      const result = constellation.goldbar(DESIGN_NAME, 'one-or-more (a or c)', CATSTR, 10 , 0);
      expect(result.designs.length).to.equal(((ALEN * CLEN) * 2) + ALEN + CLEN);
     });

    it('one-or-more (atom and atom)', function() {
      const result = constellation.goldbar(DESIGN_NAME, 'one-or-more (a and a)', CATSTR, 10 , 0);
      expect(result.designs.length).to.equal(ALEN);
      expect(result.designs).to.have.members(CATEGORIES.a);
    });

    it('one-or-more (atom then atom)', function() {
      const result = constellation.goldbar(DESIGN_NAME, 'one-or-more (a then c)', CATSTR, 10 , 0);
      expect(result.designs.length).to.equal(ALEN * CLEN);
      expect(result.designs).to.have.members(cartesian(CATEGORIES.a, CATEGORIES.c));
    });
  });

  describe('(binary-exp) binary-op (atom)', function() {
    // Or
    it('(atom or atom) or atom', function() {
      let result = constellation.goldbar(DESIGN_NAME, 'a or b or c', CATSTR, 10 , 0);
      expect(result.designs.length).to.equal(ALEN + BLEN + CLEN);
      expect(result.designs).to.have.members((CATEGORIES.c).concat(CATEGORIES.b).concat(CATEGORIES.a));

      result = constellation.goldbar(DESIGN_NAME, 'a or a or b', CATSTR, 10 , 0);
      expect(result.designs.length).to.equal(ALEN + BLEN);
      expect(result.designs).to.have.members((CATEGORIES.b).concat(CATEGORIES.a));
    });

    it('(atom or atom) and atom', function() {
      const result = constellation.goldbar(DESIGN_NAME, '(a or c) and a', CATSTR, 10 , 0);
      expect(result.designs.length).to.equal(ALEN);
      expect(result.designs).to.have.members(CATEGORIES.a);
    });

    it('(atom or atom) then atom', function() {
      const result = constellation.goldbar(DESIGN_NAME, '(a or b) then c', CATSTR, 10 , 0);
      expect(result.designs.length).to.equal((ALEN * CLEN) + (BLEN * CLEN));
      expect(result.designs).to.have.members((cartesian(CATEGORIES.b, CATEGORIES.c)).concat(cartesian(CATEGORIES.a, CATEGORIES.c)));
    });

    // And
    it('(atom and atom) or atom', function() {
      const result = constellation.goldbar(DESIGN_NAME, '(a or b) then c', CATSTR, 10 , 0);
      expect(result.designs.length).to.equal((ALEN * CLEN) + (BLEN * CLEN));
      expect(result.designs).to.have.members((cartesian(CATEGORIES.b, CATEGORIES.c)).concat(cartesian(CATEGORIES.a, CATEGORIES.c)));
    });

    it('(atom and atom) and atom', function() {
      let result = constellation.goldbar(DESIGN_NAME, '(a and a) and a', CATSTR, 10 , 0);
      expect(result.designs.length).to.equal(ALEN);
      expect(result.designs).to.have.members(CATEGORIES.a);

      result = constellation.goldbar(DESIGN_NAME, '(a and a) and b', CATSTR, 10 , 0);
      expect(result.designs.length).to.equal(0);
    });

    it('(atom and atom) then atom', function() {
      let result = constellation.goldbar(DESIGN_NAME, '(a and a) then b', CATSTR, 10 , 0);
      expect(result.designs.length).to.equal(ALEN * BLEN);
      expect(result.designs).to.have.members(cartesian(CATEGORIES.a, CATEGORIES.b));
    });

    // Then
    it('(a then b) or c', function() {

    });

    it('(a then b) then c', function() {

    });

    it('(a then b) and c', function() {

    });

  })
  // describe ('Chained expressions', function() {
  //   it('Multiple then', function() {
  //     const result = constellation.goldbar(DESIGN_NAME, 'a then b then c', CATSTR, 10 , 0);
  //     expect(result.designs.length).to.equal(ALEN * BLEN * CLEN);
  //   });

  //   it('Multiple or', function() {
  //     const result = constellation.goldbar(DESIGN_NAME, 'a or b or c', CATSTR, 10 , 0);
  //     expect(result.designs.length).to.equal(ALEN + BLEN + CLEN);
  //   });

  //   // it('Multiple and', function() {
  //   //   const result = constellation.goldbar(DESIGN_NAME, 'a and b and c', CATSTR, 10);
  //   //   expect(result.designs.length).to.equal(0);
  //   // });

  //   it('Multiple one-or-more', function() {
  //     const result = constellation.goldbar(DESIGN_NAME, 'one-or-more (one-or-more a)', CATSTR, 10, 0);
  //     expect(result.designs.length).to.equal(ALEN);
  //     expect(result.designs).to.contain('a1');
  //     expect(result.designs).to.contain('a2');
  //     expect(result.paths.length).to.equal(1);
  //     expect(result.paths[0].type === ATOM);
  //   });

  //   it('Multiple zero-or-more', function() {
  //     const result = constellation.goldbar(DESIGN_NAME, 'zero-or-more (zero-or-more a)', CATSTR, 10, 0);
  //     expect(result.designs.length).to.equal(ALEN);
  //     expect(result.designs).to.contain('a1');
  //     expect(result.designs).to.contain('a2');
  //   });

  //   it('Mixing functions', function() {
  //     const result = constellation.goldbar(DESIGN_NAME, 'a then (one-or-more b or zero-or-more c)', CATSTR, 50, 0); // TODO add and
  //     expect(result.designs.length).to.equal(ALEN * (BLEN + CLEN + 1));
  //   });

  //   it('Then downstream from cycle', function() {
  //     const result = constellation.goldbar(DESIGN_NAME, 'zero-or-more a then b', CATSTR, 50, 0);
  //     expect(result.designs.length).to.equal((ALEN + 1) * BLEN);
  //   });

  // });

  // describe('Cycles', function () {
  //   it('Atom', function() {
  //     let result = constellation.goldbar(DESIGN_NAME, 'c', CATSTR, 10, 2);
  //     expect(result.designs.length).to.equal(CLEN);
  //   });

  //   it('Linear operators', function() {
  //     let result = constellation.goldbar(DESIGN_NAME, 'a or b', CATSTR, 10, 2);
  //     expect(result.designs.length).to.equal(ALEN + BLEN);
  //     expect(result.designs).to.contain('a1');
  //     expect(result.designs).to.contain('a2');
  //     expect(result.designs).to.contain('b1');
  //     expect(result.designs).to.contain('b2');
  //     expect(result.designs).to.contain('b3');
  //     result = constellation.goldbar(DESIGN_NAME, 'a then c', CATSTR, 10, 2);
  //     expect(result.designs.length).to.equal(ALEN * CLEN);
  //     expect(result.designs).to.contain('a1,c1');
  //     expect(result.designs).to.contain('a2,c1');
  //   });

  //   it('one-or-more', function() {
  //     let result = constellation.goldbar(DESIGN_NAME, 'one-or-more a', CATSTR, 10, 1);
  //     expect(result.designs.length).to.equal(ALEN + ALEN * ALEN);
  //     expect(result.designs).to.contain('a1');
  //     expect(result.designs).to.contain('a2');
  //     expect(result.designs).to.contain('a1,a1');
  //     expect(result.designs).to.contain('a1,a2');
  //     expect(result.designs).to.contain('a2,a1');
  //     expect(result.designs).to.contain('a2,a2');
  //     expect(result.paths.length).to.equal(2);
  //   });

  //   it('zero-or-more', function() {
  //     const result = constellation.goldbar(DESIGN_NAME, 'zero-or-more a', CATSTR, 10, 1);
  //     expect(result.designs.length).to.equal(ALEN + ALEN * ALEN);
  //     expect(result.designs).to.contain('a1');
  //     expect(result.designs).to.contain('a2');
  //     expect(result.designs).to.contain('a1,a1');
  //     expect(result.designs).to.contain('a1,a2');
  //     expect(result.designs).to.contain('a2,a1');
  //     expect(result.designs).to.contain('a2,a2');
  //     expect(result.paths.length).to.equal(2);
  //   });

  //   it('Multiple one-or-more', function() {
  //     const result = constellation.goldbar(DESIGN_NAME, 'one-or-more (one-or-more a)', CATSTR, 10, 1);
  //     expect(result.designs.length).to.equal(ALEN + ALEN * ALEN);
  //     expect(result.designs).to.contain('a1');
  //     expect(result.designs).to.contain('a2');
  //     expect(result.designs).to.contain('a1,a1');
  //     expect(result.designs).to.contain('a1,a2');
  //     expect(result.designs).to.contain('a2,a1');
  //     expect(result.designs).to.contain('a2,a2');
  //     expect(result.paths.length).to.equal(2);
  //   });

  //   it('Multiple zero-or-more', function() {
  //     const result = constellation.goldbar(DESIGN_NAME, 'zero-or-more (zero-or-more a)', CATSTR, 10, 1);
  //     expect(result.designs.length).to.equal(ALEN + ALEN * ALEN);
  //     expect(result.designs).to.contain('a1');
  //     expect(result.designs).to.contain('a2');
  //     expect(result.designs).to.contain('a1,a1');
  //     expect(result.designs).to.contain('a1,a2');
  //     expect(result.designs).to.contain('a2,a1');
  //     expect(result.designs).to.contain('a2,a2');
  //     expect(result.paths.length).to.equal(2);
  //   });

  //   it('Then downstream from cycle', function() {
  //     const result = constellation.goldbar(DESIGN_NAME, 'zero-or-more a then b', CATSTR, 50, 1);
  //     expect(result.designs.length).to.equal(BLEN + ALEN * BLEN + ALEN * ALEN * BLEN);
  //   });

  // });

  // describe('Sanitise specification input', function () {
  //   it('Atom not in categories', function () {
  //     expect(() => constellation.goldbar(DESIGN_NAME, 'd', CATSTR, 10, 0)).to.throw('d is not defined in categories');
  //   });

  //   it('Mismatched brackets', function () {
  //     expect(() => constellation.goldbar(DESIGN_NAME, '(a}', CATSTR, 10, 0)).to.throw('Parsing error!');
  //   });


  //   it('Empty specification', function () {
  //     expect(() => constellation.goldbar(DESIGN_NAME, '', CATSTR, 10, 0)).to.throw('No input received')
  //   });

  //   describe('Invalid characters', function () {
  //     it('Tabs used should not throw errors', function () {
  //       const result = constellation.goldbar(DESIGN_NAME, '\ta', CATSTR, 10, 0);
  //       expect(result.designs).to.contain('a1');
  //       expect(result.designs).to.contain('a2');
  //     });

  //     // it('$', function () {
  //     //   expect(() => constellation.goldbar(DESIGN_NAME, 'a then $a', CATSTR, 10)).to.throw('Parsing error!');
  //     // });
  //     // TODO turn back on when imparse starts throwing errors

  //     it('_', function () {
  //       expect(() => constellation.goldbar(DESIGN_NAME, '_a', CATSTR, 10, 0)).to.throw('_a is not defined in categories');
  //     });
  //   });

  // });

  // describe('Sanitise category input', function () {
  //   it('Empty categories', function () {
  //     const categories = '{}';
  //     expect(() => constellation.goldbar(DESIGN_NAME, 'a', CATSTR, 10, 0)).to.throw('a is not defined in categories');
  //   });

  //   it('Handle defined but empty category', function () {
  //     let categories = '{"a": []}';
  //     const result = constellation.goldbar(DESIGN_NAME, 'a', CATSTR, 10, 0);
  //     expect(JSON.stringify(result.designs)).to.equal('[]');
  //   });

  //   it('Mismatched brackets', function () {
  //     expect(() => constellation.goldbar(DESIGN_NAME, '(a}', CATSTR, 10, 0)).to.throw('Parsing error!');
  //   });

  //   describe('Invalid characters', function () {
  //     it('Whitespace should not be included in designs', function () {
  //       let categories = '{"a":["\ta1", " a2"]}';
  //       const result = constellation.goldbar(DESIGN_NAME, 'a', CATSTR, 10, 0);
  //       expect(JSON.stringify(result.designs)).to.contain('a1');
  //       expect(JSON.stringify(result.designs)).to.contain('a2');
  //     });

  //     it('Other symbols should be parsed into category', function () {
  //       let categories = '{"a":["$a1", "a2"]}';
  //       const result = constellation.goldbar(DESIGN_NAME, 'a', CATSTR, 10, 0);
  //       expect(JSON.stringify(result.designs)).to.contain('a1');
  //       expect(JSON.stringify(result.designs)).to.contain('a2');
  //     });
  //   });
  // });

};
