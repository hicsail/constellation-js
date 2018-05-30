if (typeof window === 'undefined') {
  Reservoir = require('reservoir');
}

/* * * * * * * * * * * * */
/*   PARTS ENUMERATION   */
/* * * * * * * * * * * * */

function cartesianProduct(setA, setB) {
  if (!setA || !setB) {
    return [];
  }
  var newSet = [];

  for (var i = 0; i < setA.length; i++) {
    for (var j = 0; j < setB.length; j++) {
      var combo = setA[i].concat(',').concat(setB[j]);

      newSet.push(combo);
    }
  }
  return newSet;
}

function generateError(error) {
  return ['Error: ' + error];
}

function enumerateDesigns(paths, collection) {
  var designs = [];

  for (var i = 0; i < paths.length; i++) {
    var path = paths[i];

    if (path.length === 0) {
      designs = addDesigns([], designs);
    } else {

      var key = path[1].data.text;
      if (!(key in collection)) {
        return ['Error: key ' + key + ' not in part categories'];
      }

      var product = collection[key];
      for (var j = 1; j < path.length-1; j++) {
        var nextSet = collection[path[j+1].data.text];
        if (nextSet) {
          product = cartesianProduct(product, nextSet);
        }
      }
      designs = addDesigns(product, designs);
    }
  }
  return designs;
}


/**
 *
 * @param {path-object} paths - Array of path-objects
 * @param {*} collection
 * @param {*} numDesigns
 */
function combineParts(paths, collection, numDesigns) {

  if (collection === undefined) {
    return null;
  }

  if (numDesigns === 0) {
    return [];
  }

  if (numDesigns > 10000) {
    return generateError('number of designs specified is too large. Must be under 10000');
  }

  var designs = enumerateDesigns(paths, collection);
  designs = removeDuplicates(designs);
  return selectDesigns(designs, numDesigns);
}

function removeDuplicates(designs) {
  var seen = {};
  return designs.filter(function(item) {
    return seen.hasOwnProperty(item) ? false: (seen[item] = true);
  });
}

// Takes all designs, uses reservoir selection to pick a specified number
function selectDesigns(designs, numDesigns) {

  var resrv = Reservoir(numDesigns);

  designs.forEach(function(e) {
    resrv.pushSome(e);
  });

  delete resrv['pushSome'];
  return resrv;
}


function addDesigns(product, designs) {
  for (var i = 0; i < product.length; i++) {
    designs.push(product[i]);
  }
  return designs;
}

var designEnumeration = combineParts;

if (typeof window === 'undefined') {
  module.exports = designEnumeration;
}
