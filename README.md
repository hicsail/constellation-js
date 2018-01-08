# constellation-js

[![Build Status](https://travis-ci.org/hicsail/constellation-js.svg?branch=master)](https://travis-ci.org/hicsail/constellation-js) [![npm version](https://badge.fury.io/js/constellation-js.svg)](https://badge.fury.io/js/constellation-js)


## Quickstart

```shell
npm install constellation-js
```

```javascript
const constellation = require('constellation-js');
var categories = {'a': ['a1', 'a2'], 'b': ['b1']};
var numDesigns = 3;
var langText = '{a . b}';

var result = constellation(langText, categories, numDesigns);
```


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






