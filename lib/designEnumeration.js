/*global Reservoir:true*/

if (typeof window === 'undefined') {
  Reservoir = require('reservoir');
}


/* * * * * * * * * * * * */
/*   PARTS ENUMERATION   */
/* * * * * * * * * * * * */
/**
 * Calls design enumeration algorithms
 * @param {Object[]} paths Array of paths
 * @param {Object} categories Parsed categories object
 * @param {number} numDesigns Number of designs to choose
 * @return {Array<String>} Designs
 */
function enumerateDesigns(paths, categories, numDesigns) {
  if (categories === undefined) {
    return null;
  }
  if (numDesigns === 0) {
    return [];
  }
  if (numDesigns > 10000) {
    throw new Error('Number of designs is too high.');
  }

  let designs = generateDesigns(paths, categories);
  designs = removeDuplicates(designs);
  designs = selectDesigns(designs, numDesigns);
  return designs;
}

/**
 * Uses categories to generate designs based on paths
 * @param paths Array of paths
 * @param categories String of categories
 * @returns {*} Array of designs
 */
function generateDesigns(paths, categories) {
  let designs = [];

  for (const path of paths) {
    if (path.length === 0) {
      continue;
    }

    // Add next nodes of the path to designs
    let currentProduct = null;
    for (let j = 0; j < path.length; j++) {
      const tempNode = path[j].text;

      if (!(tempNode in categories)) {
        throw new Error(`${tempNode} is not defined in categories`);
      }

      currentProduct = getCartesianProduct(currentProduct, categories[tempNode]);
    }
    designs = addDesigns(currentProduct, designs);
  }
  return designs;
}

/**
 * Removes duplicate designs
 * @param designs Designs to check
 * @returns {*} Designs with duplicates removed
 */
function removeDuplicates(designs) {
  let seen = {};
  return designs.filter(function (item) {
    return seen.hasOwnProperty(item) ? false : (seen[item] = true);
  });
}

/**
 * Randomly selects a number of designs using reservoir selection
 * @param designs Designs to choose from
 * @param numDesigns Number of designs to choose
 * @returns {*} Selected designs
 */
function selectDesigns(designs, numDesigns) {
  const resrv = Reservoir(numDesigns);

  designs.forEach(function (e) {
    resrv.pushSome(e);
  });

  delete resrv['pushSome'];
  return resrv;
}

/**
 * Generates the Cartesian product of two sets
 * @param setA First set
 * @param setB Second set
 * @returns {Array} Cartesian product of both sets
 */
function getCartesianProduct(setA, setB) {
  let test1 = !Array.isArray(setA) || !setA.length;
  let test2 = !Array.isArray(setB) || !setB.length;
  if (test1 && test2) {
    return [];
  } else if (test1) {
    return setB;
  } else if (test2) {
    return setA;
  }

  const products = [];
  for (let i = 0; i < setA.length; i++) {
    for (let j = 0; j < setB.length; j++) {
      const comb = setA[i].concat(',').concat(setB[j]);
      products.push(comb);
    }
  }
  return products;
}

/**
 * Adds an array of designs to another existing array of designs
 * @param designs Array of designs
 * @param collection Existing array of designs
 * @returns {Array} Combined array of designs
 */
function addDesigns(designs, collection) {
  for (let i = 0; i < designs.length; i++) {
    collection.push(designs[i]);
  }
  return collection;
}

const designEnumeration = enumerateDesigns;
designEnumeration.getCartesianProduct = getCartesianProduct;

if (typeof window === 'undefined') {
  module.exports = designEnumeration;
}
