const expect = require('chai').expect;
const enumeration = require('../js/designEnumeration');
const imparse = require('imparse');
const uuidv4 = require('uuidv4');

const EPSILON = "o";
const ATOM = "atom";
const ACCEPT = "accept";
const ROOT = "root";


function generateRoot() {
  return {'id': 'root',
  'data': {
    'text': 'root',
    'dataType': 'root',
    'edges': []}};
}

function generateAtom() {
  return {id: uuidv4(), data: {text: 'a', dataType: ATOM, edges: []}};
}

module.exports = function() {
  describe('#design-enumeration', function() {
    it('atom', function() {
      var collection = {'a': ['a']};
      var paths = [[generateRoot(), generateAtom()]];
      var designs = enumeration(paths, collection, 1);
  
      expect(JSON.stringify(designs)).to.equal(JSON.stringify(collection['a']));
    });
    
    it('empty-part', function() {
      var collection = {'a': []};
      var paths = [[generateRoot(), generateAtom()]];
      var designs = enumeration(paths, collection, 1);
      expect(JSON.stringify(designs)).to.equal(JSON.stringify(collection['a']));
    });

    it('missing-part', function() {
      var collection = {'b': []};
      var paths = [[generateRoot(), generateAtom()]];
      var designs = enumeration(paths, collection, 1);
      expect(JSON.stringify(designs)).to.contain('Error');
      expect(designs.length).to.equal(1);
    });

    it('duplicates', function() {
      var collection = {'a': ['a1', 'a2']};
      var path = [generateRoot(), generateAtom()];
      var paths = [path, path];
      var designs = enumeration(paths, collection, 4);
      expect(JSON.stringify(designs)).to.equal(JSON.stringify(collection['a']));
    });

    // NUM DESIGNS
    it('select 1 of 2 designs', function() {
      var collection = {'a': ['a1', 'a2']};
      var paths = [[generateRoot(), generateAtom()]];
      var designs = enumeration(paths, collection, 1);
      expect(designs.length).to.equal(1);
    });

    it('select 0 designs', function() {
      var collection = {'a': ['a1', 'a2']};
      var paths = [[generateRoot(), generateAtom()]];
      var designs = enumeration(paths, collection, 0);
      expect(designs.length).to.equal(0);
    });
  });
}