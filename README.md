# constellation-js

[![Build Status](https://travis-ci.org/hicsail/constellation-js.svg?branch=master)](https://travis-ci.org/hicsail/constellation-js)

[![npm version](https://badge.fury.io/js/constellation-js.svg)](https://badge.fury.io/js/constellation-js)


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


