
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


// var conversion_obj = {"one_or_more":{"then":[{"then":[{"one_or_more":[{"then":["prom_f","spacer_f"]}]},"cds_f"]},{"then":[{"zero_or_more":{"then":[{"or":["spacer_f",{"one_or_more":{"then":[{"or":["spacer_f",{"one_or_more":{"then":["spacer_f",{"then":["spacer_f",{"then":["spacer_f","prom_f"]}]}]}}]},"cds_f"]}}]}]}},{"or":{}}]}]}};

function init() {

    var g = new Graph();

    var parsed = imparse.parse(grammer_def, sample_str)

    traverse(parsed);
    // readJSON();

}

function traverse(obj) {
    for (var k in obj) {
        // console.log('a thing',k, obj)
        if ((obj[k].isArray && obj[k] != null) || (typeof obj[k] == 'object' && obj[k] != null)) {
            // console.log(k)
            handleOperator(k, obj[k]);
            traverse(obj[k]);
        }
        else {
            // console.log("ATOM", obj[k])
            // atoms
        }
    }
}

function handleOperator(op, d) {
    
    switch (op) {
        case "OneOrMore":
            // console.log(op);
            break;
        
        case "Then":
            // console.log(op);
            break;
        
        case "Atom":
            console.log(op, d);
             break;

        case "ZeroOrMore":
            // console.log(op);
            break;

        case "Or":
            console.log(op, d);
            break;
        
        case "And":
            // console.log(op);
            break;
        
    }
    


}


var Graph = require('gert').Graph;
console.log(Graph)


// function readJSON() {

//     var req = new XMLHttpRequest();
//     req.open("GET", "./data/sample_conversion.json", false);
//     req.send(null);

//     var obj = JSON.parse(req.responseText);

//     alert(obj.result[0]);
// }



