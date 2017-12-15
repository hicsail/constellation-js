var Reservoir = require('reservoir');

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
  console.log('designs', designs)
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

// function tryRes() {
//   // console.log(Reservoir(3))
//   var myReservoir = Reservoir(3);

//   var myData = [1,2,3,4,5,6,7,8,9,10];

//   myData.forEach(function(e) {
//     myReservoir.pushSome(e);  
//   });

//   console.log('res', myReservoir);

// }

function combineParts(paths, collection, numDesigns) {

  if (collection === undefined) {
    return null;
  }

    // var currPath = paths[i];
    // if (currPath.length == 0) {
    //   designs.push([]);
    // } else if (currPath.length === 1) {
    //   var id = currPath[0].data.text;
    //   if (id in collection) {
    //     designs.push(collection[id]);
    //   } else {
    //     return "Error: " + id + " does not have any parts";
    //   }
    //   continue;
    // } else {
    //   // start at 1 since root is at 0
      // var product = collection[currPath[1].data.text];
      // for (var i = 1; i < currPath.length-1; i++) {
      //   var collB = collection[currPath[i+1].data.text];
      //   if (collB) {
      //     product = cartesianProduct(product, collB);  
      //   }
      // }
      // console.log('product', product)
      // designs.push(product);
    // }  

  var designs = [];

  for (var i = 0; i < paths.length; i++) {
    var path = paths[i];


    if (path.length === 0) {
      console.log('o')
      designs = addDesigns([], designs);
    } else {
      var product = collection[path[1].data.text];
    
      designs = addDesigns(product, designs);
      
    }

    // for (var i = 1; i < currPath.length-1; i++) {
    //   var collB = collection[currPath[i+1].data.text];
    //   console.log(collB);
    // }





  }

  // tryRes();
  // var tryReservoir = tryRes();
  var selectedDesigns = getSelectNumDesigns(designs, numDesigns);

  return selectedDesigns;
}


function addDesigns(product, designs) {
  for (var i = 0; i < product.length; i++) {
    designs.push(product[i]);
  }
  return designs;
}


module.exports = combineParts;