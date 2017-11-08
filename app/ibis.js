const uuidv4 = require('uuid/v4');
var Graph = require('gert').Graph;    


var grammer_def = [
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
      {"": ["(", ["Seq"], ")"]},
      {"Atom": [{"RegExp":"([A-Za-z0-9]|-|_)+"}]}
    ]}
  ];
  

var sample_str = "one-or-more (one-or-more ( prom_f then spacer_f) then cds_f then zero-or-more (spacer_f or one-or-more (spacer_f then prom_f then spacer_f) then cds_f) then term_f or (term_f then spacer_f) or (spacer_f then term_f))"


// var parsed = '{"OneOrMore":[{"Then":[{"OneOrMore":[{"Then":[{"Atom":["prom_f"]},{"Atom":["spacer_f"]}]}]},{"Then":[{"Atom":["cds_f"]},{"Then":[{"ZeroOrMore":[{"Then":[{"Or":[{"Atom":["spacer_f"]},{"OneOrMore":[{"Then":[{"Atom":["spacer_f"]},{"Then":[{"Atom":["prom_f"]},{"Atom":["spacer_f"]}]}]}]}]},{"Atom":["cds_f"]}]}]},{"Or":[{"Atom":["term_f"]},{"Or":[{"Then":[{"Atom":["term_f"]},{"Atom":["spacer_f"]}]},{"Then":[{"Atom":["spacer_f"]},{"Atom":["term_f"]}]}]}]}]}]}]}]}';

var parsed = '{"Or": [{"Then": [{"Atom": ["term_f"]}, {"Atom": ["spacer_f"]}]},{"Then": [{"Atom": ["spacer_f"]}, {"Atom": ["term_f"]}]}]}'

var parsed = '{"And": [{"Atom": ["a"]}, {"Atom": ["b"]}]}'

function init() {

    var g = new Graph({
        directed: true,
        vertices: {
            // a: { labels: ['black'] },
            // b: { labels: ['black'] }
        },
        edges: [
            // ['a', 'b'],
            // { pair: ['b', 'c'], weight: 8 }
        ]
    });

    parsed = JSON.parse(parsed);

    console.log(parsed);
    g.addVertex('root', []);    
    traverse(parsed, 'root', g);
    enumerateDesigns(g);
 
    
}

function traverse(obj, prevNode, g) {
  
    for (var k in obj) {
  
        if ((obj[k].isArray && obj[k] != null) || (typeof obj[k] == 'object' && obj[k] != null)) {
  
            var newNode = handleOperator(k, obj[k], prevNode, g);
            for (var i = 0; i < obj[k].length; i++) {
                traverse(obj[k][i], newNode, g);                
            }
        }
    }
}

function enumerateDesigns(g) {
    // console.log(g.snapshot());
}

function handleOperator(op, d, prevNode, g) {
    // console.log(op, d)
    var id = uuidv4();
    if (op === "Or" || op === "Then" || op === "And" || op === "Atom") {
        g.addVertex(id, {"labels": op, "data": d});
        g.addEdge(prevNode, id); 
    }

    if (op === "OneOrMore") {
        g.addVertex(id, []);
        g.addEdge(id, id, []);
    }
    
    if (op === "ZeroOrMore") {

    }

    return id;


}

module.exports.ibis = init;  