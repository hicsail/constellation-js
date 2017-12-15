var Reservoir = require('reservoir');

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
      var combo = setA[i].concat(",").concat(setB[j]);

      newSet.push(combo);
    }
  }
  return newSet;
}
  

function combineParts(paths, collection, numDesigns) {

  if (collection === undefined) {
    return null;
  }

  var designs = [];

  for (var i = 0; i < paths.length; i++) {
    var path = paths[i];


    if (path.length === 0) {
      designs = addDesigns([], designs);
    } else {
      var product = collection[path[1].data.text];

      for (var j = 1; j < path.length-1; j++) {
        var nextSet = collection[path[j+1].data.text];
        if (nextSet) {
          product = cartesianProduct(product, nextSet);
        }
      }
      designs = addDesigns(product, designs);      
    }

  }
  var selectedDesigns = selectDesigns(designs, numDesigns);
  return selectedDesigns;

}

function selectDesigns(designs, numDesigns) {

  var reservoir = Reservoir(numDesigns);

  designs.forEach(function(e) {
    reservoir.pushSome(e);
  });

  delete reservoir['pushSome'];
  return reservoir;
}


function addDesigns(product, designs) {
  for (var i = 0; i < product.length; i++) {
    designs.push(product[i]);
  }
  return designs;
}

module.exports = combineParts;