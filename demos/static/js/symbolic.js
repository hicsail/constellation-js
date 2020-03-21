function eq(d1, d2) {
  if (d1.length != d2.length)
    return false;
  for (var i = 0; i < d1.length; i++)
    if (d1[i] != d2[i])
      return false;
  return true;
}
  
function inside(d, ds) {
  for (var i = 0; i < ds.length; i++)
    if (eq(d, ds[i]))
      return true;
  return false;
}

function product(ds1, ds2) {
  var ds = [];
  for (var i = 0; i < ds1.length; i++) {
    for (var j = 0; j < ds2.length; j++) {
      ds.push(ds1[i].concat(ds2[j])) 
    }
  }
  return ds;
}

function union(ds1, ds2) {
  var ds = ds1;
  for (var i = 0; i < ds2.length; i++)
    if (!inside(ds2[i], ds))
      ds.push(ds2[i]);
  return ds;
}

function intersection(ds1, ds2) {
  var ds = [];
  for (var i = 0; i < ds1.length; i++)
    if (inside(ds1[i], ds2))
      ds.push(ds1[i]);
  return ds;
}

function designs_enumerate(cat_to_parts, ast_node) {
  if ("Atom" in ast_node) {
    if (ast_node["Atom"][0] in cat_to_parts)
      return cat_to_parts[ast_node["Atom"][0]].map(function(p) { return [p]; });
    else
      return [[]];
  } else if ("Then" in ast_node) {
    var ds1 = designs_enumerate(cat_to_parts, ast_node["Then"][0]);
    var ds2 = designs_enumerate(cat_to_parts, ast_node["Then"][1]);
    return product(ds1, ds2);
  } else if ("Or" in ast_node) {
    var ds1 = designs_enumerate(cat_to_parts, ast_node["Or"][0]);
    var ds2 = designs_enumerate(cat_to_parts, ast_node["Or"][1]);
    return union(ds1, ds2);
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

function designs_count(cat_to_parts, ast_node) {
  if ("Atom" in ast_node) {
    if (ast_node["Atom"][0] in cat_to_parts)
      return cat_to_parts[ast_node["Atom"][0]].length;
    else
      return 0;
  } else if ("Then" in ast_node) {
    var c1 = designs_count(cat_to_parts, ast_node["Then"][0]);
    var c2 = designs_count(cat_to_parts, ast_node["Then"][1]);
    return c1 * c2;
  } else if ("Or" in ast_node) {
    var c1 = designs_count(cat_to_parts, ast_node["Or"][0]);
    var c2 = designs_count(cat_to_parts, ast_node["Or"][1]);
    return c1 + c2;
  } else if ("And" in ast_node) {
    var c1 = designs_count(cat_to_parts, ast_node["And"][0]);
    var c2 = designs_count(cat_to_parts, ast_node["And"][1]);
    return Math.max(c1, c2);
  } else if ("ZeroOrOne" in ast_node) {
    return 1 + designs_count(cat_to_parts, ast_node["ZeroOrOne"][0]);
  } else if ("ZeroOrMore" in ast_node) {
    var c = designs_count(cat_to_parts, ast_node["ZeroOrMore"][0]);
    var total = 0;
    for (var k = 0; k <= ast_node.repeat; k++)
      total += Math.pow(c, k)
    return total;
  } else if ("OneOrMore" in ast_node) {
    var c = designs_count(cat_to_parts, ast_node["OneOrMore"][0]);
    var total = 0;
    for (var k = 1; k <= ast_node.repeat; k++)
      total += Math.pow(c, k)
    return total;
  }
}

function repetition_nodes(ast_node) {
  if ("Then" in ast_node) {
    var rns1 = repetition_nodes(ast_node["Then"][0]);
    var rns2 = repetition_nodes(ast_node["Then"][1]);
    return rns1.concat(rns2);
  } else if ("Or" in ast_node) {
    var rns1 = repetition_nodes(ast_node["Or"][0]);
    var rns2 = repetition_nodes(ast_node["Or"][1]);
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
  
function repetition_nodes_min_total(rns) {
  var total = 0;
  for (var i = 0; i < rns.length; i++)
    total += ("OneOrMore" in rns[i]) ? 1 : 0;
  return total;
}

function generate(editors, cat_to_parts) {
  document.getElementById("designs").value = "";
  var rep_bound = 4; //parseInt(document.getElementById('bound').value);
  var rns = repetition_nodes(ast);
  var designs = [];
  if (rns.length > 0) {
    var sum_breakdowns = summations.sumLen(rep_bound, rns.length);
    generate_step(editors, sum_breakdowns, cat_to_parts, ast, rns, 0, designs);
  } else {
    designs = designs_enumerate(cat_to_parts, ast);
    console.log(designs);
    var designs_output = "";
    for (var i = 0; i < designs.length; i++) {
      designs_output += JSON.stringify(designs[i]) + "\n";
      editors.designsEditor.setValue(designs_output);
    }
    //document.getElementById("designs_count").innerHTML = " (" + designs.length + ")";
  }
}

function generate_step(editors, sum_breakdowns, cat_to_parts, ast, rns, k, designs) {
  if (k < sum_breakdowns.length) {
    var valid = true;
    // Assign the sum terms to the repetition nodes for
    // this particular sum breakdown.
    for (var h = 0; h < rns.length; h++) {
      rns[h].repeat = sum_breakdowns[k][h];
      if ("OneOrMore" in rns[h] && rns[h].repeat == 0)
        valid = false;
    }
    if (valid) { // This breakdown is valid.
      var designs_new = designs_enumerate(cat_to_parts, ast);
      for (var i = 0; i < designs_new.length; i++) {
        if (!inside(designs_new[i], designs)) {
          //document.getElementById("designs").value += JSON.stringify(designs_new[i]) + "\n";
          editors.designsEditor.setValue(designs.map(JSON.stringify).join("\n"));
          designs.push(designs_new[i]);
        }
      }
    }
    //document.getElementById("designs_count").innerHTML = " (" + designs.length + ")";
    setTimeout( function () { generate_step(editors, sum_breakdowns, cat_to_parts, ast, rns, k+1, designs); }, 100);
  } else {
    //document.getElementById("btn_gen").disabled = false;
  }
}

var ast = {};

function parse(str) {
  if (str.length == 0) {
    // Do nothing.
  } else {
    var grammar = [
      {"Seq": [
        {"Then": [["Exp"], "then", ["Seq"]]},
        {"": [["Exp"]]}
      ]},
      {"Exp": [
        {"Or": [["Term"], "or", ["Exp"]]},
        {"And": [["Term"], "and", ["Exp"]]},
        {"": [["Term"]]}
      ]},
      {"Term": [
        {"OneOrMore": ["one-or-more", ["Term"]]},
        {"ZeroOrMore": ["zero-or-more", ["Term"]]},
        {"ZeroOrOne": ["zero-or-one", ["Term"]]},
        {"": ["(", ["Seq"], ")"]},
        {"Atom": [{"RegExp":"([A-Za-z0-9]|-|_)+"}]}
      ]}
    ];
    ast = imparse.parse(grammar, str);
    return ast;
  }
}

function update(editors, ast, categories) {
  if (ast == null) {
    // Do nothing.
  } else {
    var cat_to_parts_raw = JSON.parse(categories);
    
    var cat_to_parts = {};
    for (var cat in cat_to_parts_raw) {
      cat_to_parts[cat] = cat_to_parts_raw[cat]["ids"];
    }
    
    var rep_bound = 4; //parseInt(document.getElementById('bound').value);
    var rns = repetition_nodes(ast);
    //document.getElementById("repops_count").innerHTML = " (must be >= " + repetition_nodes_min_total(rns) + ")";
    var sum_breakdowns = summations.sumLen(rep_bound, rns.length);
    var design_count = 0;
    for (var k = 0; k < sum_breakdowns.length; k++) {
      var valid = true;
      for (var h = 0; h < rns.length; h++) {
        rns[h].repeat = sum_breakdowns[k][h];
        if ("OneOrMore" in rns[h] && rns[h].repeat == 0)
          valid = false;
      }
      if (valid) { // This breakdown is valid.
        design_count += designs_count(cat_to_parts, ast);
      }
    }
    if (rns.length == 0)
      design_count = designs_count(cat_to_parts, ast);
    generate(editors, cat_to_parts);
    //document.getElementById('candidates').value = design_count;
  }
}
