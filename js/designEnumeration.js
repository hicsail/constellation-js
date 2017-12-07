/* * * * * * * * * * * * */
/*   PARTS ENUMERATION   */
/* * * * * * * * * * * * */
function shuffleList(list) {
    var currIndex = list.length;
    while (0 !== currIndex) {
  
      var randIndex = Math.floor(Math.random() * currIndex);
      currIndex--;
  
      // And swap it with the current element.
      var temp = list[currIndex];
      list[currIndex] = list[randIndex];
      list[randIndex] = temp;
    }
    return list;
  }
  
  
  
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
  
  function createRandomIndices(shuffledDesigns) {
    var randIndices = [];
    for (var i = 0; i < shuffledDesigns.length; i++) {
      for (var j = 0; j < shuffledDesigns[i].length; j++) {
         randIndices.push([i,j]);
      }
    }
  
    randIndices = shuffleList(randIndices);
    return randIndices;
  }
  
  function getSelectNumDesigns(designs, numDesigns) {
  
    var shuffledDesigns = [];
    var selectedDesigns = [];
  
    for (var i = 0; i < designs.length; i++) {
      var shuffled = shuffleList(designs[i]);
      shuffledDesigns.push(shuffleList(designs[i])); 
    }
  
    // Generate list of shuffled indices to randomly select
    var randIndices = createRandomIndices(shuffledDesigns);
  
    while(randIndices.length > 0 && numDesigns > 0) {
      var index = randIndices.pop();
      var r = index[0];
      var c = index[1];
  
      selectedDesigns.push(shuffledDesigns[r][c]);
      numDesigns--;
    }
  
    return selectedDesigns;
  }
  
  // TODO: check that ID exists as a key in collection
  function combineParts(paths, collection, numDesigns) {
    if (collection === undefined) {
      return null;
    }
  
    var designs = [];
  
    for (var i = 0; i < paths.length; i++) {
      var currPath = paths[i];
      if (currPath.length == 0) {
        designs.push([]);
      } else if (currPath.length === 1) {
        var id = currPath[0].data.text;
        if (id in collection) {
          designs.push(collection[id]);
        } else {
          return "Error: " + id + " does not have any parts";
        }
        continue;
      } else {
        var product = collection[currPath[0].data.text];
        for (var i = 0; i < currPath.length-1; i++) {
          var collB = collection[currPath[i+1].data.text];
          if (collB) {
            product = cartesianProduct(product, collB);  
          }
        }
        designs.push(product);
      }  
    }
  
    var selectedDesigns = getSelectNumDesigns(designs, numDesigns);
  
    return selectedDesigns;
  }


  module.exports = combineParts;