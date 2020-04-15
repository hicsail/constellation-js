/*global Reservoir:true*/
Reservoir = require('reservoir');
SBOLDocument = require('sboljs');

/* * * * * * * * * * * * */
/*   PARTS ENUMERATION   */
/* * * * * * * * * * * * */
/**
 * Calls design enumeration algorithms
 * @param {Object[]} paths Array of paths
 * @param {Object} categories Parsed categories object
 * @param {number} numDesigns Number of designs to choose
 * @return {Object} Designs
 */
function enumerateDesigns(paths, categories, numDesigns) {
  if (categories === undefined) {
    return {designs: null, totalNum: 0};
  }
  if (numDesigns === 0) {
    return {designs: [], totalNum: 0};
  }
  if (numDesigns > 10000) {
    throw new Error('Number of designs is too high.');
  }

  // pass in twice the number of designs as the buffer
  let result = generateDesigns(paths, categories, numDesigns);
  let designs = removeDuplicates(result.designs);
  designs = selectDesigns(designs, numDesigns);
  return {designs, totalNum: result.totalNum};
}

/**
 * Uses categories to generate designs based on paths
 * @param paths Array of paths
 * @param categories String of categories
 * @param buffer String of categories
 * @returns {*} Array of designs
 */
function generateDesigns(paths, categories, buffer) {
  let designs = [];
  let totalNum = 0;

  for (const path of paths) {
    if (path.length === 0) {
      continue;
    }
    // get categories specific to this path
    let pathCats = getCatsForPath(path, categories);
    totalNum += productSize(path, pathCats);
    // prune them down so the product the number of ids stays within the buffer length
    prunePathCats(path, pathCats, buffer);

    // Add next nodes of the path to designs
    let currentProduct = null;
    for (let j = 0; j < path.length; j++) {
      const tempNode = path[j].text;

      if (!(tempNode in categories)) {
        throw new Error(`${tempNode} is not defined in categories`);
      }

      currentProduct = getCartesianProduct(currentProduct, getAllIDs(pathCats[tempNode]));
    }
    designs = addDesigns(currentProduct, designs);
  }
  return {designs, totalNum};
}

/**
 * Creates a deep copy of the categories in one path
 * @param path
 * @param categories
 */
function getCatsForPath(path, categories) {
  let pathCats = {};
  for (let edge of path) {
    let part = edge.text;
    if (!(part in categories)) {
      throw new Error(`${part} is not defined in categories`);
    }
    pathCats[part] = JSON.parse(JSON.stringify(categories[part]));
  }
  return pathCats;
}

/**
 * Counts the size of the product of number of ids in a path
 * @param path
 * @param pathCats
 * @return {number}
 */
function productSize(path, pathCats) {
  let prod = 1;
  for (let edge of path) {
    prod = prod*getAllIDs(pathCats[edge.text]).length;
  }
  return prod;
}

/**
 * Prunes the path-specific categories so that the product of the number of their ids
 * does not exceed the number of designs allowed
 * @param path
 * @param pathCats
 * @param buffer
 */
function prunePathCats(path, pathCats, buffer) {
  let prodSize = productSize(path, pathCats);
  while (prodSize > buffer) {
    for (let cat in pathCats) {
      for (let role in pathCats[cat]) {
        let ids = pathCats[cat][role];
        // take two thirds of the part ids
        let partition = Math.ceil(ids.length / 1.5);
        ids = ids.slice(0, partition);
        pathCats[cat][role] = ids;
      }
    }
    let temp = productSize(path, pathCats);
    // if at 2 ids per category, it is still over the numDesign limit, let the select function prune the designs
    if (temp === prodSize) {
      break;
    } else {
      prodSize = temp;
    }
  }
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
 * Extracts all the ids from every role in a category
 * @param category
 * @return {Array|any[]}
 */
function getAllIDs(category) {
  let ids = [];
  for (let role in category) {
    ids = [...new Set(ids.concat(category[role]))];
  }
  return ids;
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

module.exports = {
  enumerateDesigns,
  getCartesianProduct,
  prunePathCats,
};
