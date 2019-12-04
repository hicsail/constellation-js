# constellation-js

[![Build Status](https://travis-ci.org/hicsail/constellation-js.svg?branch=master)](https://travis-ci.org/hicsail/constellation-js) [![npm version](https://badge.fury.io/js/constellation-js.svg)](https://badge.fury.io/js/constellation-js)[![Coverage Status](https://coveralls.io/repos/github/hicsail/constellation-js/badge.svg?branch=master)](https://coveralls.io/github/hicsail/constellation-js?branch=master)


## Quickstart

```shell
npm install constellation-js
```

```javascript
const constellation = require('constellation-js');
var langText = '{a . b}';
var categories = {'a': ['a1', 'a2'], 'b': ['b1']};
var numDesigns = 3;
var cycleDepth = 1

var result = constellation(langText, categories, numDesigns, cycleDepth);
```

## Demos

```shell
npm run build && npm run start
```
Then view the demo in a browser at `http://localhost:8082/`.

## Dependencies
- [imparse](http://imparse.org/)
- [reservoir](https://github.com/imbcmdth/reservoir)
- [uuidv4](https://github.com/thenativeweb/uuidv4)

## Supported Operators
```a```  <br />
<img width="86" alt="atom" src="https://user-images.githubusercontent.com/6438622/34654704-86d369c8-f3cd-11e7-8405-96b67a1202f1.png">

```a or b```  <br />
<img width="94" alt="or" src="https://user-images.githubusercontent.com/6438622/34654699-79ac8388-f3cd-11e7-9bce-3b43153281a1.png">

```a then b```  <br />
<img width="102" alt="then" src="https://user-images.githubusercontent.com/6438622/34654706-8805feaa-f3cd-11e7-8a47-dea5cc17efdc.png">

```zero-or-more a```  <br />
<img width="71" alt="zero" src="https://user-images.githubusercontent.com/6438622/34654691-65bfcca4-f3cd-11e7-860b-557168dc36ee.png">

```one-or-more a```  <br />
<img width="104" alt="one" src="https://user-images.githubusercontent.com/6438622/34654707-8ac29702-f3cd-11e7-8e92-7c694241fbd7.png">

## Example
Specification <br/>
```
one-or-more (a or (a then (zero-or-more b)))
```

Part Categories <br/>
```
{"a": ["a1", "a2"],
"b": ["b1", "b2"]}
```
<strong>Results</strong> <br/>
Graph <br/>
<img width="168" alt="screen shot 2018-01-07 at 5 24 17 pm" src="https://user-images.githubusercontent.com/6438622/34654908-165ca382-f3d0-11e7-803d-4bdf7d3c1145.png">

Designs: <br/>
```
[
	"a1,b1",
	"a1,b2",
	"a2,b1",
	"a2,b2",
	"a1",
	"a2"
]
```

## Design Space Representations

### GOLDBAR Concrete Syntax
The supported GOLDBAR concrete syntax for genetic design spaces is presented below using extended BNF notation. Notice that `then` and `.` are equivalent, and the delimiters `(`...`)` and `{`...`}` are equivalent.
```
 <seq> ::= <exp> then <seq>
        |  <exp> . <seq>
        |  <exp>

 <exp> ::= <term> or <exp>
        |  <term> and <exp>
        |  <term> merge <exp>
        |  <term>

<term> ::= one-or-more <term>
        |  zero-or-more <term>
        |  zero-or-one <term>
        |  ( <seq> )
        |  { <seq> }
        |  <atom>

<atom> ::= ([A-Za-z0-9]|-|_)+
```

### Constellation Data Structures

#### GOLDBAR Abstract Syntax Tree

The JSON schema for the GOLDBAR abstract syntax tree representation (parsed from the concrete syntax presented above) can be found in [`schemas/ast.schema.json`](schemas/ast.schema.json).

#### Design Space Graph

The JSON schema for a design space graph can be found in [`schemas/graph.schema.json`](schemas/graph.schema.json). Below is an example of a graph within a single node in JSON format.
```
{
  "604571a7-9e38-4647-afd0-9546399480b5": {
    "id": "604571a7-9e38-4647-afd0-9546399480b5",
    "text": "root",
    "type": "root",
    "edges": [
      "b79407eb-95f0-4b78-99da-779f2c9cad46",
      "7f6ca2fb-ef67-4687-924c-4285de896877"
    ],
    "operator": ["One"]
  }
}
```

#### Boundary Graph
