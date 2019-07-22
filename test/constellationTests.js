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

function expectA(result) {
  expect(result.designs.length).to.equal(ALEN);
  expect(result.designs).to.have.members(CATEGORIES.a);
}

function expectAConcatB(result) {
  expect(result.designs.length).to.equal(ALEN + BLEN);
  expect(result.designs).to.have.members((CATEGORIES.a).concat(CATEGORIES.b));
}

function expectACartesianB(result) {
  expect(result.designs.length).to.equal(ALEN * BLEN);
  expect(result.designs).to.have.members(cartesian(CATEGORIES.a, CATEGORIES.b));
}

module.exports = function() {
  // describe('Missing input errors', function() {
  //   it('Missing num designs', function () {
  //     expect(() => constellation.goldbar(DESIGN_NAME, '(a}', '{}', null, 0)).to.throw('Invalid number of designs');
  //   });

  //   it('Invalid num designs', function () {
  //     expect(() => constellation.goldbar(DESIGN_NAME, '(a}', '{}', 0, 0)).to.throw('Invalid number of designs');
  //   });

  //   it('Invalid cycle depth', function () {
  //     expect(() => constellation.goldbar(DESIGN_NAME, '(a}', '{}', 10, -1)).to.throw('Invalid cycle depth');
  //   });

  //   it('Missing specification', function () {
  //     expect(() => constellation.goldbar(DESIGN_NAME, null, '{}', 10, 0)).to.throw('No input received')
  //   });

  //   it('Missing design name', function () {
  //     expect(() => constellation.goldbar(null, '(a}', '{}', 10, 0)).to.throw('No design name is specified');
  //   });
  // });

  describe('Operator unit tests, base cases', function() {

    describe('Unary expressions', function() {
      it('atom', function() {
        let result = constellation.goldbar(DESIGN_NAME, 'a', CATSTR, 10, 0);
        expectA(result);
      });

      it('one-or-more', function() {
        let result = constellation.goldbar(DESIGN_NAME, 'one-or-more a', CATSTR, 10, 0);
        expectA(result);
        expect(result.paths.length).to.equal(1);
        // expect(result.paths[0].type === ATOM);
      });

      it('zero-or-more', function() {
        const result = constellation.goldbar(DESIGN_NAME, 'zero-or-more a', CATSTR, 10, 0);
        expectA(result);
        // TODO: state that empty string is not an option as an explicit design choice
      });
    });

    describe('Binary expressions', function() {
      // it('and', function() {
      //   let result = constellation.goldbar(DESIGN_NAME, 'a and a', CATSTR, 10, 0);
      //   expectA(result);
      //
      //   result = constellation.goldbar(DESIGN_NAME, 'a and b', CATSTR, 10, 0);
      //   expect(result.designs.length).to.equal(0);
      // });

      it('or', function() {
        let result = constellation.goldbar(DESIGN_NAME, 'b or a', CATSTR, 10, 0);
        expectAConcatB(result);

        result = constellation.goldbar(DESIGN_NAME, 'a or a', CATSTR, 10, 0);
        expectA(result);
        // TODO: what should the graph be?
      });

      it('then', function() {
        let result = constellation.goldbar(DESIGN_NAME, 'a then b', CATSTR, 10, 0);
        expectACartesianB(result);

        result = constellation.goldbar(DESIGN_NAME, 'a . b', CATSTR, 10, 0);
        expectACartesianB(result);
      });
    });
  });

  describe('Operator compositions', function() {
    describe('unary op (unary exp)', function() {
      it('one-or-more (one-or-more atom)', function() {
        const result = constellation.goldbar(DESIGN_NAME, 'one-or-more (one-or-more a)', CATSTR, 10 , 0);
        expectA(result);
      });

      // TODO: this graph looks wrong
      it('one-or-more (zero-or-more atom)', function() {
        const result = constellation.goldbar(DESIGN_NAME, 'one-or-more (zero-or-more a)', CATSTR, 10 , 0);
        expectA(result);
      });

      it('zero-or-more (zero-or-more atom)', function() {
        const result = constellation.goldbar(DESIGN_NAME, 'zero-or-more (zero-or-more a)', CATSTR, 10 , 0);
        expectA(result);
      });

      it('zero-or-more (one-or-more atom)', function() {
        const result = constellation.goldbar(DESIGN_NAME, 'zero-or-more (one-or-more a)', CATSTR, 10 , 0);
        expectA(result);
      });
    });


    describe('unary-op (binary-exp)', function() {
      // zero-or-more
      it('zero-or-more (atom or atom)', function() {
        const result = constellation.goldbar(DESIGN_NAME, 'zero-or-more (a or b)', CATSTR, 10 , 0);
        expectAConcatB(result);
      });

  //     it('zero-or-more (atom and atom)', function() {
  //       const result = constellation.goldbar(DESIGN_NAME, 'zero-or-more (a and a)', CATSTR, 10 , 0);
  //       expectA(result);
  //     });

  //     it('zero-or-more (atom then atom)', function() {
  //       const result = constellation.goldbar(DESIGN_NAME, 'zero-or-more (a then b)', CATSTR, 10 , 0);
  //       expectACartesianB(result);
  //     });

  //     // one-or-more
  //     it('one-or-more (atom or atom)', function() {
  //       const result = constellation.goldbar(DESIGN_NAME, 'one-or-more (a or c)', CATSTR, 10 , 0);
  //       expect(result.designs.length).to.equal(((ALEN * CLEN) * 2) + ALEN + CLEN);
  //     });

  //     it('one-or-more (atom and atom)', function() {
  //       const result = constellation.goldbar(DESIGN_NAME, 'one-or-more (a and a)', CATSTR, 10 , 0);
  //       expectA(result);
  //     });

  //     it('one-or-more (atom then atom)', function() {
  //       const result = constellation.goldbar(DESIGN_NAME, 'one-or-more (a then b)', CATSTR, 10 , 0);
  //       expectACartesianB(result)
  //     });
    });

  //   describe('(binary-exp) binary-op (atom)', function() {
  //     // Or
  //     it('(atom or atom) or atom', function() {
  //       let result = constellation.goldbar(DESIGN_NAME, 'a or b or c', CATSTR, 10 , 0);
  //       expect(result.designs.length).to.equal(ALEN + BLEN + CLEN);
  //       expect(result.designs).to.have.members((CATEGORIES.c).concat(CATEGORIES.b).concat(CATEGORIES.a));

  //       result = constellation.goldbar(DESIGN_NAME, 'a or a or b', CATSTR, 10 , 0);
  //       expectAConcatB(result);
  //     });

  //     it('(atom or atom) and atom', function() {
  //       const result = constellation.goldbar(DESIGN_NAME, '(a or c) and a', CATSTR, 10 , 0);
  //       expectA(result);
  //     });

  //     it('(atom or atom) then atom', function() {
  //       const result = constellation.goldbar(DESIGN_NAME, '(a or b) then c', CATSTR, 10 , 0);
  //       expect(result.designs.length).to.equal((ALEN * CLEN) + (BLEN * CLEN));
  //       expect(result.designs).to.have.members((cartesian(CATEGORIES.b, CATEGORIES.c)).concat(cartesian(CATEGORIES.a, CATEGORIES.c)));
  //     });

  //     // And
  //     it('(atom and atom) or atom', function() {
  //       const result = constellation.goldbar(DESIGN_NAME, '(a or b) then c', CATSTR, 10 , 0);
  //       expect(result.designs.length).to.equal((ALEN * CLEN) + (BLEN * CLEN));
  //       expect(result.designs).to.have.members((cartesian(CATEGORIES.b, CATEGORIES.c)).concat(cartesian(CATEGORIES.a, CATEGORIES.c)));
  //     });

  //     it('(atom and atom) and atom', function() {
  //       let result = constellation.goldbar(DESIGN_NAME, '(a and a) and a', CATSTR, 10 , 0);
  //       expectA(result);

  //       result = constellation.goldbar(DESIGN_NAME, '(a and a) and b', CATSTR, 10 , 0);
  //       expect(result.designs.length).to.equal(0);
  //     });

  //     it('(atom and atom) then atom', function() {
  //       const result = constellation.goldbar(DESIGN_NAME, '(a and a) then b', CATSTR, 10 , 0);
  //       expectACartesianB(result);
  //     });

  //     // Then
  //     it('(atom then atom) or atom', function() {
  //       const result = constellation.goldbar(DESIGN_NAME, '(a then b) or c', CATSTR, 10 , 0);
  //       expect(result.designs.length).to.equal((ALEN * BLEN) + CLEN);
  //       expect(result.designs).to.have.members((CATEGORIES.c).concat(cartesian(CATEGORIES.a, CATEGORIES.b)));
  //     });

  //     it('(atom then atom) then atom', function() {
  //       const result = constellation.goldbar(DESIGN_NAME, '(a then b) then c', CATSTR, 10 , 0);
  //       expect(result.designs.length).to.equal(ALEN * BLEN * CLEN);
  //       expect(result.designs).to.have.members(cartesian(CATEGORIES.a, CATEGORIES.b, CATEGORIES.c));
  //     });

  //     it('(atom then atom) and atom', function() {
  //       const result = constellation.goldbar(DESIGN_NAME, '(a then b) and a', CATSTR, 10 , 0);
  //       expectA(result);
  //     });
  //   });

  //   describe('(atom) binary-op (unary-exp)', function() {
  //     // OR
  //     it('atom or (one-or-more atom)', function() {
  //       const result = constellation.goldbar(DESIGN_NAME, 'a or (one-or-more b)', CATSTR, 10 , 0);
  //       expectAConcatB(result);
  //     });

  //     it('atom or (zero-or-more atom)', function() {
  //       const result = constellation.goldbar(DESIGN_NAME, 'a or (zero-or-more b)', CATSTR, 10 , 0);
  //       expectAConcatB(result);
  //     });

  //     // AND
  //     it('atom and (zero-or-more atom)', function() {
  //       const result = constellation.goldbar(DESIGN_NAME, 'a and (zero-or-more a)', CATSTR, 10 , 0);
  //       expectA(result);
  //     });

  //     it('atom and (zero-or-more atom)', function() {
  //       const result = constellation.goldbar(DESIGN_NAME, 'a and (one-or-more a)', CATSTR, 10 , 0);
  //       expectA(result);
  //     });

  //     // THEN
  //     it('atom then (zero-or-more atom)', function() {
  //       const result = constellation.goldbar(DESIGN_NAME, 'a then (one-or-more b)', CATSTR, 10 , 0);
  //       expectACartesianB(result);
  //     });

  //     it('atom then (zero-or-more atom)', function() {
  //       const result = constellation.goldbar(DESIGN_NAME, 'a then (one-or-more b)', CATSTR, 10 , 0);
  //       expectACartesianB(result);
  //     });
  //   });
  });


  // describe('Cycles', function () {
  //   it('atom', function() {
  //     let result = constellation.goldbar(DESIGN_NAME, 'c', CATSTR, 10, 2);
  //     expect(result.designs.length).to.equal(CLEN);
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
  // });

  // describe('Sanitise category input', function () {
  //   it('empty categories', function () {
  //     expect(() => constellation.goldbar(DESIGN_NAME, 'a', '{}', 10, 0)).to.throw('a is not defined in categories');
  //   });

  //   it('handle defined but empty category', function () {
  //     const result = constellation.goldbar(DESIGN_NAME, 'a', '{"a": []}', 10, 0);
  //     expect(JSON.stringify(result.designs)).to.equal('[]');
  //   });

  //   it('mismatched brackets', function () {
  //     expect(() => constellation.goldbar(DESIGN_NAME, '(a}', '{}', 10, 0)).to.throw('Parsing error!');
  //   });
  // });

  // describe('Invalid characters', function () {
  //   it('Whitespace should not be included in designs', function () {
  //     const result = constellation.goldbar(DESIGN_NAME, 'a', '{"a":["\ta1", " a2"]}', 10, 0);

  //     expect(JSON.stringify(result.designs)).to.contain('a1');
  //     expect(JSON.stringify(result.designs)).to.contain('a2');
  //   });

  //   it('Other symbols should be parsed into category', function () {
  //     const result = constellation.goldbar(DESIGN_NAME, 'a', '{"a":["$a1", "a2"]}', 10, 0);
  //     expect(JSON.stringify(result.designs)).to.contain('a1');
  //     expect(JSON.stringify(result.designs)).to.contain('a2');
  //   });
  // });


  // describe('Sanitise specification input', function () {
  //   it('Atom not in categories', function () {
  //     expect(() => constellation.goldbar(DESIGN_NAME, 'd', CATSTR, 10, 0)).to.throw('d is not defined in categories');
  //   });

  //   it('Mismatched brackets', function () {
  //     expect(() => constellation.goldbar(DESIGN_NAME, '(a}', CATSTR, 10, 0)).to.throw('Parsing error!');
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
};
