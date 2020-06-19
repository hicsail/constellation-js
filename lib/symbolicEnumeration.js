summations = require('summations');

/**
 * Equality between two designs
 * @param {Array} d1
 * @param {Array} d2
 * @returns {boolean} Result indicating equality
 */
function eq(d1, d2) {
  if (d1.length != d2.length)
    return false;
  for (var i = 0; i < d1.length; i++)
    if (d1[i] != d2[i])
      return false;
  return true;
}

/**
 * Determines whether a design is contained in a design
 * collection
 * @param {Array} d
 * @param {Array} ds
 * @returns {Array} Result indicating containment
 */
function inside(d, ds) {
  for (var i = 0; i < ds.length; i++)
    if (eq(d, ds[i]))
      return true;
  return false;
}

/**
 * Returns concatenations of all pairs of designs from two
 * design collections
 * @param {Array} ds1
 * @param {Array} ds2
 * @returns {Array} Collection of concatenated designs
 */
function product(ds1, ds2) {
  var ds = [];
  for (var i = 0; i < ds1.length; i++) {
    for (var j = 0; j < ds2.length; j++) {
      ds.push(ds1[i].concat(ds2[j])) 
    }
  }
  return ds;
}

/**
 * Returns all designs found in either supplied design
 * collections
 * @param {Array} ds1
 * @param {Array} ds2
 * @returns {Array} Union of all designs in two design collections
 */
function union(ds1, ds2) {
  var ds = ds1;
  for (var i = 0; i < ds2.length; i++)
    if (!inside(ds2[i], ds))
      ds.push(ds2[i]);
  return ds;
}

/**
 * Returns only those designs found in both supplied
 * design collections
 * @param {Array} ds1
 * @param {Array} ds2
 * @returns {Array} Union of all designs in two design collections
 */
function intersection(ds1, ds2) {
  var ds = [];
  for (var i = 0; i < ds1.length; i++)
    if (inside(ds1[i], ds2))
      ds.push(ds1[i]);
  return ds;
}

/**
 * Enumerates designs that satisfy the supplied expression,
 * represented as an abstract syntax tree (AST) root node, in
 * accordance with repetition limits associated with
 * the AST nodes.
 * @param {Object} cat_to_parts
 * @param {Object} ast_node
 * @returns {Array} Collection of designs
 */
function designs_enumerate(cat_to_parts, ast_node) {
  if ("Atom" in ast_node) {
    if (ast_node["Atom"][0] in cat_to_parts) {
      let atom = ast_node["Atom"][0];
      let entry = cat_to_parts[atom];
      for (var key in entry) {
          let parts = entry[key];
          return parts.map(function(p) { return [p]; })
      }
    } else {
      return [[]];
    }
  } else if ("Then" in ast_node) {
    var ds1 = designs_enumerate(cat_to_parts, ast_node["Then"][0]);
    var ds2 = designs_enumerate(cat_to_parts, ast_node["Then"][1]);
    return product(ds1, ds2);
  } else if ("Or" in ast_node) {
    var ds1 = designs_enumerate(cat_to_parts, ast_node["Or"][0]);
    var ds2 = designs_enumerate(cat_to_parts, ast_node["Or"][1]);
    return union(ds1, ds2);
  } else if ("And0" in ast_node) {
    var ds1 = designs_enumerate(cat_to_parts, ast_node["And0"][0]);
    var ds2 = designs_enumerate(cat_to_parts, ast_node["And0"][1]);
    return intersection(ds1, ds2);
  } else if ("And" in ast_node) {
    var ds1 = designs_enumerate(cat_to_parts, ast_node["And"][0]);
    var ds2 = designs_enumerate(cat_to_parts, ast_node["And"][1]);
    return intersection(ds1, ds2);
  } else if ("ZeroOrOne" in ast_node) {
    var ds = designs_enumerate(cat_to_parts, ast_node["ZeroOrOne"][0]);
    return [[]].concat(ds);
  } else if ("ZeroOrMore" in ast_node) {
    var ds0 = designs_enumerate(cat_to_parts, ast_node["ZeroOrMore"][0]);
    var ds_final = [];
    var ds = [[]];
    var repeat = ('repeat' in ast_node) ? ast_node.repeat : 0;
    for (var k = 0; k <= repeat; k++) {
      ds_final = union(ds_final, ds);
      ds = product(ds, ds0);
    }
    return ds_final;
  } else if ("OneOrMore" in ast_node) {
    var ds0 = designs_enumerate(cat_to_parts, ast_node["OneOrMore"][0]);
    var ds_final = [];
    var ds = [[]];
    var repeat = ('repeat' in ast_node) ? ast_node.repeat : 1;
    for (var k = 0; k < repeat; k++) {
      ds = product(ds, ds0);
      ds_final = union(ds_final, ds);
    }
    return ds_final;
  }
}

/**
 * Retrieves a list of references to all abstract syntax tree
 * nodes that represent repetition (i.e., one-or-more and
 * zero-or-more).
 * @param {Object} ast_node
 * @returns {Array} Collection of AST node references
 */
function repetition_nodes(ast_node) {
  if ("Then" in ast_node) {
    var rns1 = repetition_nodes(ast_node["Then"][0]);
    var rns2 = repetition_nodes(ast_node["Then"][1]);
    return rns1.concat(rns2);
  } else if ("Or" in ast_node) {
    var rns1 = repetition_nodes(ast_node["Or"][0]);
    var rns2 = repetition_nodes(ast_node["Or"][1]);
    return rns1.concat(rns2);
  } else if ("And0" in ast_node) {
    var rns1 = repetition_nodes(ast_node["And0"][0]);
    var rns2 = repetition_nodes(ast_node["And0"][1]);
    return rns1.concat(rns2);
  } else if ("And" in ast_node) {
    var rns1 = repetition_nodes(ast_node["And"][0]);
    var rns2 = repetition_nodes(ast_node["And"][1]);
    return rns1.concat(rns2);
  } else if ("ZeroOrMore" in ast_node) {
    return [ast_node].concat(repetition_nodes(ast_node["ZeroOrMore"][0]));
  } else if ("OneOrMore" in ast_node) {
    return [ast_node].concat(repetition_nodes(ast_node["OneOrMore"][0]));
  } else if ("ZeroOrOne" in ast_node) {
    return repetition_nodes(ast_node["ZeroOrOne"][0]);
  } else {
    return [];
  }
}

/**
 * Enumerates designs that satisfy the supplied expression,
 * represented as an abstract syntax tree (AST) root node, in
 * accordance with limits on the number of designs and the
 * maximum number of repetitions that each repetition node
 * should be allotted.
 * @param {Object} ast
 * @param {Object} categories
 * @param {Object} numDesigns
 * @param {Object} maxCycles
 * @returns {Array} Collection of AST node references
 */
function enumerateDesigns(ast, categories, numDesigns, maxCycles) {
  // The maximum number of times to repeat the
  // body of a repetition node.
  var repBound = maxCycles;

  // Find all repetition nodes.
  var rns = repetition_nodes(ast);

  var designs = [];

  if (rns.length > 0) {
    var sum_breakdowns = summations.sumLen(repBound, rns.length);
    
    for (let i = 0; i < sum_breakdowns.length; i++) {
      if (numDesigns == 'all' || designs.length < numDesigns) {
        let valid = true;
        // Assign the sum terms to the repetition nodes for
        // this particular sum breakdown.
        for (let j = 0; j < rns.length; j++) {
          rns[j].repeat = sum_breakdowns[i][j];
          if ("OneOrMore" in rns[j] && rns[j].repeat == 0)
            valid = false;
        }
        if (valid) { // This breakdown is valid.
          var designs_new = designs_enumerate(categories, ast);

          // Add new designs to the aggregate list.
          for (let j = 0; j < designs_new.length; j++) {
            if (!inside(designs_new[j], designs)) {
            designs.push(designs_new[j]);
            }
          }
        }
      } // End if |designs| < numDesigns.
    }
  } else {
    designs = designs_enumerate(categories, ast);
  }

  // Leave only the specified number of designs.
  if (numDesigns != 'all')
    designs = designs.slice(0, numDesigns);

  // Present designs as comma-separated lists of parts.
  designs = designs.map(function(d) { return d.join(','); });

  return designs;
}

module.exports = {
  enumerateDesigns
};
