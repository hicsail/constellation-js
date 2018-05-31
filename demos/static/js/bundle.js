(function(){function r(e,n,t){function o(i,f){if(!n[i]){if(!e[i]){var c="function"==typeof require&&require;if(!f&&c)return c(i,!0);if(u)return u(i,!0);var a=new Error("Cannot find module '"+i+"'");throw a.code="MODULE_NOT_FOUND",a}var p=n[i]={exports:{}};e[i][0].call(p.exports,function(r){var n=e[i][1][r];return o(n||r)},p,p.exports,r,e,n,t)}return n[i].exports}for(var u="function"==typeof require&&require,i=0;i<t.length;i++)o(t[i]);return o}return r})()({1:[function(require,module,exports){
'use strict';

var designEnumeration = require('./designEnumeration');
var graph = require('./graph');
var imparse = require('imparse');

const GRAMMAR_DEF = [{'Seq':[{'Then':[['Exp'],'.',['Seq']]},{'Then':[['Exp'],'then',['Seq']]},{'':[['Exp']]}]},{'Exp':[{'Or':[['Term'],'or',['Exp']]},{'And':[['Term'],'and',['Exp']]},{'':[['Term']]}]},{'Term':[{'OneOrMore':['one-or-more',['Term']]},{'ZeroOrMore':['zero-or-more',['Term']]},{'':['{',['Seq'],'}']},{'':['(',['Seq'],')']},{'Atom':[{'RegExp':'([A-Za-z0-9]|-|_)+'}]}]}];

/* * * * * * */
/*    MAIN   */
/* * * * * * */
const constellation = function (langText, categories, numDesigns) {
  let parsed = '';
  try {
    parsed = imparse.parse(GRAMMAR_DEF, langText);
  } catch (err) {
    console.error('Parsing error!');
    return;
  }

  const gra = graph(parsed);
  const designs = designEnumeration(gra.paths, categories, numDesigns);
  console.log(gra.stateGraph);

  return {stateGraph: gra.stateGraph, designs: designs, paths: gra.paths};
};

if (typeof window === 'undefined') {
  module.exports = constellation;
}

},{"./designEnumeration":2,"./graph":3,"imparse":4}],2:[function(require,module,exports){
'use strict';

var Reservoir = require('reservoir');

/* * * * * * * * * * * * */
/*   PARTS ENUMERATION   */
/* * * * * * * * * * * * */

function cartesianProduct(setA, setB) {
  if (!setA || !setB) {
    return [];
  }
  const newSet = [];

  for (let i = 0; i < setA.length; i++) {
    for (let j = 0; j < setB.length; j++) {
      const combo = setA[i].concat(',').concat(setB[j]);

      newSet.push(combo);
    }
  }
  return newSet;
}

function generateError(error) {
  return ['Error: ' + error];
}

function enumerateDesigns(paths, collection) {
  let designs = [];

  for (let i = 0; i < paths.length; i++) {
    const path = paths[i];

    if (path.length === 0) {
      designs = addDesigns([], designs);
    } else {

      const key = path[1].data.text;
      if (!(key in collection)) {
        return ['Error: key ' + key + ' not in part categories'];
      }

      let product = collection[key];
      for (let j = 1; j < path.length-1; j++) {
        const nextSet = collection[path[j + 1].data.text];
        if (nextSet) {
          product = cartesianProduct(product, nextSet);
        }
      }
      designs = addDesigns(product, designs);
    }
  }
  return designs;
}


/**
 *
 * @param {Object[]} paths - Array of path-objects
 * @param {*} collection
 * @param {*} numDesigns
 */
function combineParts(paths, collection, numDesigns) {

  if (collection === undefined) {
    return null;
  }

  if (numDesigns === 0) {
    return [];
  }

  if (numDesigns > 10000) {
    return generateError('number of designs specified is too large. Must be under 10000');
  }

  let designs = enumerateDesigns(paths, collection);
  designs = removeDuplicates(designs);
  return selectDesigns(designs, numDesigns);
}

function removeDuplicates(designs) {
  const seen = {};
  return designs.filter(function(item) {
    return seen.hasOwnProperty(item) ? false: (seen[item] = true);
  });
}

// Takes all designs, uses reservoir selection to pick a specified number
function selectDesigns(designs, numDesigns) {

  const resrv = Reservoir(numDesigns);

  designs.forEach(function(e) {
    resrv.pushSome(e);
  });

  delete resrv['pushSome'];
  return resrv;
}


function addDesigns(product, designs) {
  for (let i = 0; i < product.length; i++) {
    designs.push(product[i]);
  }
  return designs;
}

const designEnumeration = combineParts;

if (typeof window === 'undefined') {
  module.exports = designEnumeration;
}

},{"reservoir":5}],3:[function(require,module,exports){
'use strict';

let uuidv4 = require('uuidv4');

// Global Constants
const EPSILON = 'o';
const ATOM = 'atom';
const ACCEPT = 'accept';
const ROOT = 'root';

/* * * * * * * * * * */
/*   NODE HANDLING   */
/* * * * * * * * * * */

// Root of the graph should always be the root of the only remaining element in the boundary stack
function getRootNode(stateGraph, boundaryStack) {
  return boundaryStack[0].root;
}

// Adding accept nodes to every leaf remaining on boundary stack
function addAcceptNodes(stateGraph, boundaryStack) {
  const len = boundaryStack[0].leaves.length;

  for (let i = 0; i < len; i++) {
    const atom = boundaryStack[0].leaves.pop();
    const acceptId = uuidv4();

    stateGraph[acceptId] = {text: ACCEPT, dataType: ACCEPT, edges:[]};
    stateGraph[atom].edges.push(acceptId);
  }
}

// New element on boundary stack
function addToBoundaryStack(root, children, boundaryStack) {
  const obj = {root: root, leaves: children};
  boundaryStack.push(obj);
}

/* * * * * * * * * * * */
/*   GRAPH TRAVERSAL   */
/* * * * * * * * * * * */

function enumeratePaths(root, stateGraph) {
  let visited = {};
  let epsilonMap = {}; //{nodeId:(set of parent IDs)}

  const rootEdges = stateGraph[root].edges;

  for (let i = 0; i < rootEdges.length; i++) {
    visited[rootEdges[i]] = false;
  }
  const allPaths = [];
  visitNodes(root, visited, stateGraph, [], allPaths, epsilonMap);
  collapseEpsilons(stateGraph, epsilonMap);
  return allPaths;
}

function populateGraph(parsed, stateGraph, boundaryStack) {

  if (parsed.Atom) {
    handleAtom(parsed.Atom, stateGraph, boundaryStack);
    return;
  }

  if (Array.isArray(parsed)) {
    for (let i = 0; i < parsed.length; i++) {
      populateGraph(parsed[i], stateGraph, boundaryStack);
    }
    return;
  }

  if (Object.keys(parsed).length > 0) {
    for (let k in parsed) {
      const operation = k;
      populateGraph(parsed[k], stateGraph, boundaryStack);
      handleOp(operation, boundaryStack, stateGraph);
    }
  }
}

function printPath(path) {
  let pathStr = 'Path: ';
  for (let i = 0; i < path.length; i++) {
    if (path[i].data.dataType !== EPSILON) {
      pathStr += ' ' + path[i].data.text;
    }
  }
}

function processPath(path, allPaths) {

  const processedPath = [];
  for (let i = 0; i < path.length; i++) {
    if (path[i].data.dataType !== EPSILON) {
      // Deep copy of object
      processedPath.push(JSON.parse(JSON.stringify(path[i])));
    }
  }
  allPaths.push(processedPath);
}

function checkCycle(nodeId, currentPath) {
  for (let i = 0; i < currentPath.length; i++) {
    if (nodeId === currentPath[i].id) {
      return true;
    }
  }
  return false;
}

// returns all edges that are not yet in path
function getUnprocessedEdges(edges, path) {
  const unprocessed = [];
  for (let i = 0; i < edges.length; i++) {
    let inList = false;
    for (let j = 0; j < path.length; j++) {
      if (edges[i] === path[j].id) {
        inList = true;
        break;
      }
    }
    if (!inList) {
      unprocessed.push(edges[i]);
    }
  }
  return unprocessed;
}

function processChildren(children, visited, stateGraph, currentPath, allPaths, epsilonMap) {
  for (let i = 0; i < children.length; i++) {
    const childId = children[i];

    if (stateGraph[childId].dataType === ACCEPT) {
      processPath(currentPath, allPaths);
    } else {
      if (!visited[childId]) {
        visitNodes(childId, visited, stateGraph, currentPath, allPaths, epsilonMap);
      } else {
        if (checkCycle(childId, currentPath)) {
          // process other edges
          let childEdges = stateGraph[childId].edges;
          const unprocessed = getUnprocessedEdges(childEdges, currentPath);
          // TODO: do they need to be processed or can I just call visitNodes?
          processChildren(unprocessed, visited, stateGraph, currentPath, allPaths, epsilonMap)
        }
      }
    }
  }
}

function visitNodes(nodeId, visited, stateGraph, currentPath, allPaths, epsilonMap) {
  visited[nodeId] = true;
  const node = stateGraph[nodeId];

  // store parent for every epsilon
  for (let i =0; i < node.edges.length; i++){
    const edgeId = node.edges[i];
    if (stateGraph[edgeId].dataType === EPSILON){
      if(!(edgeId in epsilonMap)){
        epsilonMap[edgeId] = new Set();
      }
      epsilonMap[edgeId].add(nodeId);
    }
  }

  currentPath.push({id: nodeId, data: node});
  processChildren(node.edges, visited, stateGraph, currentPath, allPaths, epsilonMap);

  currentPath.pop();
  visited[nodeId] = false;
}

//collapse epsilons with one parent
function collapseEpsilons(stateGraph, epsilonMap){
  for (let epsilonId in epsilonMap){
    if (epsilonMap.hasOwnProperty(epsilonId)) {
      let parentIds = Array.from(epsilonMap[epsilonId]);
      // If epsilon has one parent, tranfer children to parent
      if (parentIds.length === 1){
        const parentId = parentIds[0];
        const transferChildren = stateGraph[epsilonId].edges;
        const transferChildrenLen = transferChildren.length;
        for (let i = 0; i < transferChildrenLen; i++){
          const transferChild = transferChildren.pop();
          //Replace parentId in epsilonMap
          if (transferChild in epsilonMap){
            const index = Array.from(epsilonMap[transferChild]).indexOf(epsilonId);
            if (index > -1) {
              epsilonMap[transferChild].delete(epsilonId);
              epsilonMap[transferChild].add(parentId);
            }
          }
          //give children to parent
          stateGraph[parentId].edges.push(transferChild);
        }
        //remove epsilon from parent's edge
        const eIndex = stateGraph[parentId].edges.indexOf(epsilonId);
        if (eIndex > -1) {
          stateGraph[parentId].edges.splice(eIndex, 1);
        }
        //remove epsilon from stategraph
        delete stateGraph[epsilonId];
      }
    }
  }
}


/* * * * * * * * */
/*   OPERATORS   */
/* * * * * * * * */

function handleOp(op, boundaryStack, stateGraph) {
  // Parent must always be added to the graph
  const parentId = uuidv4();
  stateGraph[parentId] = {text: EPSILON, dataType: EPSILON, edges:[]};

  if (op === 'Or') {
    handleOr(boundaryStack, stateGraph, parentId);
  }
  if (op === 'And') {
    handleAnd(boundaryStack, stateGraph, parentId);
  }
  if (op === 'Then') {
    handleThen(boundaryStack, stateGraph, parentId);
  }
  if (op === 'ZeroOrMore') {
    handleZeroOrMore(boundaryStack, stateGraph, parentId);
  }
  if (op === 'OneOrMore') {
    handleOneOrMore(boundaryStack, stateGraph, parentId);
  }
}

function handleOr(boundaryStack, stateGraph, parentId) {
  const a = boundaryStack.pop();
  const b = boundaryStack.pop();

  stateGraph[parentId].edges.push(a.root);
  stateGraph[parentId].edges.push(b.root);

  const children = [];
  for (let i = 0; i < a.leaves.length; i++) {
    children.push(a.leaves.pop());
  }
  for (let i = 0; i < b.leaves.length; i++) {
    children.push(b.leaves.pop());
  }

  addToBoundaryStack(parentId, children, boundaryStack);
}

function handleAnd(boundaryStack, stateGraph, parentId) {
  console.log('AND not yet supported')
}

function handleThen(boundaryStack, stateGraph, parentId) {
  const b = boundaryStack.pop();
  const a = boundaryStack.pop();

  const children = [];

  for (let i = 0; i < a.leaves.length; i++) {
    const leaf = a.leaves.pop();
    stateGraph[leaf].edges.push(parentId);
  }
  for (let i = 0; i < b.leaves.length; i++) {
    children.push(b.leaves.pop());
  }

  stateGraph[parentId].edges.push(b.root);
  addToBoundaryStack(a.root, children, boundaryStack);
}

// Zero or more
function handleZeroOrMore(boundaryStack, stateGraph, parentId) {
  const a = boundaryStack.pop();

  stateGraph[parentId].edges.push(a.root);

  const children = [];

  for (let i = 0; i < a.leaves.length; i++) {
    const leaf = a.leaves.pop();
    children.push(leaf); // children is not used after this assignment?
    stateGraph[leaf].edges.push(parentId);
  }

  addToBoundaryStack(parentId, [parentId], boundaryStack);
}

// parent --> a.root -> leaves --> epsilon --> parent
function handleOneOrMore(boundaryStack, stateGraph, parentId) {
  const a = boundaryStack.pop();

  const epsilonId = uuidv4();
  stateGraph[epsilonId] = {text: EPSILON, dataType: EPSILON, edges:[]};

  stateGraph[parentId].edges.push(a.root);

  for (let i = 0; i < a.leaves.length; i++) {
    const leaf = a.leaves.pop();
    stateGraph[leaf].edges.push(epsilonId);
  }
  stateGraph[epsilonId].edges.push(parentId);
  addToBoundaryStack(parentId, [epsilonId], boundaryStack);
}

function handleAtom(atom, stateGraph, boundaryStack) {
  const epsilonId = uuidv4();
  const atomId = uuidv4();

  stateGraph[epsilonId] = {text: EPSILON, dataType: EPSILON, edges: [atomId]};
  stateGraph[atomId] = {text: atom, dataType: ATOM, edges: []};

  addToBoundaryStack(epsilonId, [atomId], boundaryStack);
}

const graph = function (parsed) {
  const stateGraph = {};
  const boundaryStack = [];

  // stategraph.populate(parsed, boundaryStack);
  populateGraph(parsed, stateGraph, boundaryStack);
  addAcceptNodes(stateGraph, boundaryStack);

  const root = getRootNode(stateGraph, boundaryStack);
  stateGraph[root].text = ROOT;
  stateGraph[root].dataType = ROOT;

  const paths = enumeratePaths(root, stateGraph);

  return {stateGraph: stateGraph, paths: paths};
};

// Ensure constants are accessible externally.
graph.EPSILON = EPSILON;
graph.ATOM = ATOM;
graph.ACCEPT = ACCEPT;
graph.ROOT = ROOT;

if (typeof window === 'undefined') {
  module.exports = graph;
}

},{"uuidv4":7}],4:[function(require,module,exports){
/* ****************************************************************************
** 
** imparse.js
** http://imparse.org
**
** Lightweight infinite-lookahead parser generator that supports basic grammars
** defined in a JSON format.
**
*/

(function (imparse) {

  imparse.tokenize = function (grammar, s) {
    // Extract terminals from grammar.
    var terminals = [];
    for (var i = 0; i < grammar.length; i++) {
      for (var nt in grammar[i]) {
        for (var j = 0; j < grammar[i][nt].length; j++) {
          for (var con in grammar[i][nt][j]) {
            var seq = grammar[i][nt][j][con];
            for (var k = 0; k < seq.length; k++) {
              if (!(seq[k] instanceof Array)) {
                terminals.push(seq[k]);
              }
            }
          }
        }
      }
    };

    var tokens = [], row = 0, col = 0;
    while (s.length > 0) {
      while (s[0] == " " || s[0] == "\n") {
        if (s[0] == "\n") {
          row++;
          col = 0;
        } else {
          col++;
        }
        s = s.slice(1);
      }
      var m = [""], len = 0;
      for (var i = 0; i < terminals.length; i++) {
        if (terminals[i] instanceof Object && 'RegExp' in terminals[i]) {
          var c = s.match(new RegExp('^' + terminals[i]['RegExp']));
          m = (c != null && c[0].length > m[0].length) ? c : m;
        } else {
          var c = s.substr(0,terminals[i].length);
          m = (c == terminals[i]) ? [c] : m;
        }
      }
      if (m[0].length > 0) {
        s = s.slice(m[0].length);
        tokens.push({'str':m[0], 'row':row, 'col':col});
        col += m[0].length;
      } else {
        if (s.length > 0)
          console.log("Did not tokenize entire string.");
        break;
      }
    }
    return tokens;
  };

  imparse.show_tokens = function (ts) {
    var s = "", row = 0, col = 0;
    for (var i = 0; i < ts.length; i++) {
      while (row < ts[i].row) { s += "\n"; row++; col = 0; }
      while (col < ts[i].col) { s += " "; col++; }
      s += ts[i].str;
      col += ts[i].str.length;
    }
    return s;
  };

  imparse.parse_tokens = function (grammar, ts_original, nonterm) {
    // Find the appropriate produciton.
    for (var i = 0; i < grammar.length; i++) {
      if (nonterm in grammar[i]) {
        // For each option in the production.
        for (var j = 0; j < grammar[i][nonterm].length; j++) {
          var ts = ts_original, seq = grammar[i][nonterm][j];
          for (var con in seq) { // Unwrap singleton JSON object.
            var success = true, subtrees = [];
            for (var k = 0; k < seq[con].length; k++) {
              if (ts.length == 0) { // This option failed, but others may succeed.
                success = false;
                break;
              }
              // Handle each type of sequence entry that can appear in the sequence.
              var entry = seq[con][k];
              if (entry instanceof Array) {
                var result = imparse.parse_tokens(grammar, ts, entry[0]);
                if (result instanceof Array && result.length == 2) {
                  subtrees.push(result[0]);
                  ts = result[1];
                } else {
                  return result;
                }
              } else if (entry instanceof Object && 'RegExp' in entry) {
                var c = ts[0].str.match(new RegExp('^' + entry['RegExp']));
                if (c != null && c[0].length == ts[0].str.length) {
                  subtrees.push(ts[0].str);
                  ts = ts.slice(1);
                } else {
                  success = false;
                  break;
                }
              } else {
                if (ts[0].str == entry) {
                  ts = ts.slice(1);
                } else {
                  success = false;
                  break;
                }
              }
            } // for each entry in the sequence

            if (success) {
              if (con.length > 0) { 
                var o = {};
                o[con] = subtrees
                return [o, ts];
              } else { // Pass-through option with only one subtree.
                if (subtrees.length != 1)
                  return {'Error': 'Improperly defined production rule.'};
                return [subtrees[0], ts];
              }
            } // if tokens parsed with option sequence successfully

          } // unwrap JSON object for constructor and sequence
        } // for each possible sequence under the non-terminal
      } // if production is the one specified by argument
    } // for each production in grammar
  };

  imparse.parse = function (grammar, s) {
    if (grammar.length > 0) {
      for (var nonterm in grammar[0]) {
        var tokens = imparse.tokenize(grammar, s);
        var tree_tokens = imparse.parse_tokens(grammar, tokens, nonterm);
        return tree_tokens[0]; // Return only the tree.
      }
    }
    return {'Error': 'Cannot use the supplied grammar object.'};
  };

})(typeof exports !== 'undefined' ? exports : (this.imparse = {}));

},{}],5:[function(require,module,exports){
(function (root, factory) {
		"use strict";

		if (typeof exports === 'object') {
			module.exports = factory();
		} else if (typeof define === 'function' && define.amd) {
			define(factory);
		} else {
			root.Reservoir = factory();
		}
	}(this, function () {
		"use strict";

		// We use the same constant specified in [Vitt85]
		var switchToAlgorithmZConstant = 22;

		// `debug` was used to test for correctness of the more complicated
		// algorithms, X and Z, by comparing their results to baseline R
		var debug = "none";

		function _Reservoir(reservoirSize, randomNumberGen) {
			var rng = randomNumberGen || Math.random;

			// `reservoirSize` must be a number between 1 and 2^32
			var reservoirSize =
				Math.max(1, (Math.floor(reservoirSize) >> 0) || 1);

			// `totalItemCount` contains the total number of items 
			// processed by `pushSome` against the reservoir
			var totalItemCount = 0;

			// `numToSkip` is the total number of elements to skip over
			// before accepting one into the reservoir.
			var numToSkip = -1;

			// `currentAlgorithm` starts with algorithmX and switches to
			// algorithmZ after `switchThreshold` items is reached
			var currentAlgorithm = algorithmX;

			// `switchThreshold` is the `totalItemCount` at which to switch
			// over from algorithm X to Z
			var switchThreshold = 
				switchToAlgorithmZConstant * reservoirSize;

			if(debug === "R") {
				currentAlgorithm = algorithmR;
			} else if(debug === "X") {
				switchThreshold = Infinity;
			} else if(debug === "Z") {
				currentAlgorithm = algorithmZ;
			}

			// `algorithmXCount` is the number of items processed by algorithmX
			//  ie. the `totalItemCount` minus `reservoirSize`
			var algorithmXCount = 0;

			// `W` is used in algorithmZ
			var W = Math.exp(-Math.log(rng()) / reservoirSize);

			// `evictNext` is used only by algorithmR
			var evictNext = null;

			// `targetArray` is the array to be returned by Reservoir()
			var targetArray = [];

			targetArray.pushSome = function() {
				this.length = Math.min(this.length, reservoirSize);

				for(var i = 0; i < arguments.length; i++) {
					addSample.call(this, arguments[i]);
				}

				return this.length;
			};

			// `addSample` adds a single item at a time by using `numToSkip`
			// to determine whether to include it in the reservoir
			var addSample = function(sample) {
				// Prefill the reservoir if it isn't full
				if(totalItemCount < reservoirSize) {
					this.push(sample);
				} else {
					if(numToSkip < 0) {
						numToSkip = currentAlgorithm();
					}
					if(numToSkip === 0) {
						replaceRandomSample(sample, this);
					}
					numToSkip--;
				}
				totalItemCount++;
				return this;
			};

			// `replaceRandomSample` selects a single value from `reservoir`
			// for eviction and replaces it with `sample`
			function replaceRandomSample(sample, reservoir) {
				// Typically, the new sample replaces the "evicted" sample
				// but below we remove the evicted sample and push the
				// new value to ensure that reservoir is sorted in the
				// same order as the input data (ie. iterator or array).
				var randomIndex;
				if(evictNext !== null) {
					randomIndex = evictNext;
					evictNext = null;
				} else {
					randomIndex = Math.floor(rng() * reservoirSize);
				}
				reservoir.splice(randomIndex, 1);
				reservoir.push(sample);
			}

			// From [Vitt85], "Algorithm R"
			// Selects random elements from an unknown-length input.
			// Has a time-complexity of:
			//   O(N)
			// Number of random numbers required:
			//   N - n
			// Where:
			//   n = the size of the reservoir
			//   N = the size of the input
			function algorithmR() {
				var localItemCount = totalItemCount + 1,
				    randomValue = Math.floor(rng() * localItemCount),
				    toSkip = 0;

				while (randomValue >= reservoirSize) {
					toSkip++;
					localItemCount++;
					randomValue = Math.floor(rng() * localItemCount);
				}
				evictNext = randomValue;
				return toSkip;
			}

			// From [Vitt85], "Algorithm X"
			// Selects random elements from an unknown-length input.
			// Has a time-complexity of:
			//   O(N)
			// Number of random numbers required:
			//   2 * n * ln( N / n )
			// Where:
			//   n = the size of the reservoir
			//   N = the size of the input
			function algorithmX() {
				var localItemCount = totalItemCount,
				    randomValue = rng(),
				    toSkip = 0,
				    quotient;

				if (totalItemCount <= switchThreshold) {
					localItemCount++;
					algorithmXCount++;
					quotient = algorithmXCount / localItemCount;

					while (quotient > randomValue) {
						toSkip++;
						localItemCount++;
						algorithmXCount++;
						quotient = (quotient * algorithmXCount) / localItemCount;
					}
					return toSkip;
				} else {
					currentAlgorithm = algorithmZ;
					return currentAlgorithm();
				}
			}

			// From [Vitt85], "Algorithm Z"
			// Selects random elements from an unknown-length input.
			// Has a time-complexity of:
			//   O(n(1 + log (N / n)))
			// Number of random numbers required:
			//   2 * n * ln( N / n )
			// Where:
			//   n = the size of the reservoir
			//   N = the size of the input
			function algorithmZ() {
				var term = totalItemCount - reservoirSize + 1,
				    denom,
				    numer,
				    numer_lim;

				while(true) {
					var randomValue = rng();
					var x = totalItemCount * (W - 1);
					var toSkip = Math.floor(x);

					var subterm = ((totalItemCount + 1) / term);
					subterm *= subterm;
					var termSkip = term + toSkip;
					var lhs = Math.exp(Math.log(((randomValue * subterm) * termSkip)/ (totalItemCount + x)) / reservoirSize); 
					var rhs = (((totalItemCount + x) / termSkip) * term) / totalItemCount;

					if(lhs <= rhs) {
						W = rhs / lhs;
						break;
					}

					var y = (((randomValue * (totalItemCount + 1)) / term) * (totalItemCount + toSkip + 1)) / (totalItemCount + x);

					if(reservoirSize < toSkip) {
						denom = totalItemCount;
						numer_lim = term + toSkip;
					} else {
						denom = totalItemCount - reservoirSize + toSkip;
						numer_lim = totalItemCount + 1;
					}

					for(numer = totalItemCount + toSkip; numer >= numer_lim; numer--) {
						y = (y * numer) / denom;
						denom--;
					}

					W = Math.exp(-Math.log(rng()) / reservoirSize);

					if(Math.exp(Math.log(y) / reservoirSize) <= (totalItemCount + x) / totalItemCount) {
						break;
					}
				}
				return toSkip;
			}
			return targetArray;
		}

		return _Reservoir;

		// REFERENCES
		// [Vitt85] Vitter, Jeffery S. "Random Sampling with a Reservoir." ACM
		//          Transactions on Mathematical Software, Vol. 11, No. 1, March
		//          1985, pp. 37-57. Retrieved from
		//          http://www.cs.umd.edu/~samir/498/vitter.pdf
}));
},{}],6:[function(require,module,exports){
(function(){
    var root = this;

    //消息填充位，补足长度。
    function fillString(str){
        var blockAmount = ((str.length + 8) >> 6) + 1,
            blocks = [],
            i;

        for(i = 0; i < blockAmount * 16; i++){
            blocks[i] = 0;
        }
        for(i = 0; i < str.length; i++){
            blocks[i >> 2] |= str.charCodeAt(i) << (24 - (i & 3) * 8);
        }
        blocks[i >> 2] |= 0x80 << (24 - (i & 3) * 8);
        blocks[blockAmount * 16 - 1] = str.length * 8;

        return blocks;
    }

    //将输入的二进制数组转化为十六进制的字符串。
    function binToHex(binArray){
        var hexString = "0123456789abcdef",
            str = "",
            i;

        for(i = 0; i < binArray.length * 4; i++){
            str += hexString.charAt((binArray[i >> 2] >> ((3 - i % 4) * 8 + 4)) & 0xF) +
                    hexString.charAt((binArray[i >> 2] >> ((3 - i % 4) * 8  )) & 0xF);
        }

        return str;
    }

    //核心函数，输出为长度为5的number数组，对应160位的消息摘要。
    function coreFunction(blockArray){
        var w = [],
            a = 0x67452301,
            b = 0xEFCDAB89,
            c = 0x98BADCFE,
            d = 0x10325476,
            e = 0xC3D2E1F0,
            olda,
            oldb,
            oldc,
            oldd,
            olde,
            t,
            i,
            j;

        for(i = 0; i < blockArray.length; i += 16){  //每次处理512位 16*32
            olda = a;
            oldb = b;
            oldc = c;
            oldd = d;
            olde = e;

            for(j = 0; j < 80; j++){  //对每个512位进行80步操作
                if(j < 16){
                    w[j] = blockArray[i + j];
                }else{
                    w[j] = cyclicShift(w[j-3] ^ w[j-8] ^ w[j-14] ^ w[j-16], 1);
                }
                t = modPlus(modPlus(cyclicShift(a, 5), ft(j, b, c, d)), modPlus(modPlus(e, w[j]), kt(j)));
                e = d;
                d = c;
                c = cyclicShift(b, 30);
                b = a;
                a = t;
            }

            a = modPlus(a, olda);
            b = modPlus(b, oldb);
            c = modPlus(c, oldc);
            d = modPlus(d, oldd);
            e = modPlus(e, olde);
        }

        return [a, b, c, d, e];
    }

    //根据t值返回相应得压缩函数中用到的f函数。
    function ft(t, b, c, d){
        if(t < 20){
            return (b & c) | ((~b) & d);
        }else if(t < 40){
            return b ^ c ^ d;
        }else if(t < 60){
            return (b & c) | (b & d) | (c & d);
        }else{
            return b ^ c ^ d;
        }
    }

    //根据t值返回相应得压缩函数中用到的K值。
    function kt(t){
        return (t < 20) ?  0x5A827999 :
                (t < 40) ? 0x6ED9EBA1 :
                (t < 60) ? 0x8F1BBCDC : 0xCA62C1D6;
    }

    //模2的32次方加法，因为JavaScript的number是双精度浮点数表示，所以将32位数拆成高16位和低16位分别进行相加
    function modPlus(x, y){
        var low = (x & 0xFFFF) + (y & 0xFFFF),
            high = (x >> 16) + (y >> 16) + (low >> 16);

        return (high << 16) | (low & 0xFFFF);
    }

    //对输入的32位的num二进制数进行循环左移 ,因为JavaScript的number是双精度浮点数表示，所以移位需需要注意
    function cyclicShift(num, k){
        return (num << k) | (num >>> (32 - k));
    }

    //主函数根据输入的消息字符串计算消息摘要，返回十六进制表示的消息摘要
    function sha1(s){
        return binToHex(coreFunction(fillString(s)));
    }

    // support AMD and Node
    if(typeof define === "function" && typeof define.amd){
        define(function(){
            return sha1;
        });
    }else if(typeof exports !== 'undefined') {
        if(typeof module !== 'undefined' && module.exports) {
          exports = module.exports = sha1;
        }
        exports.sha1 = sha1;
    } else {
        root.sha1 = sha1;
    }

}).call(this);
},{}],7:[function(require,module,exports){
'use strict';

var sha1 = require('sha-1');

// See http://stackoverflow.com/a/2117523/1333873 for details.
var uuidv4 = function uuidv4() {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (character) {
    /* eslint-disable no-bitwise */
    var randomNumber = Math.random() * 16 | 0,
        result = character === 'x' ? randomNumber : randomNumber & 0x3 | 0x8;
    /* eslint-enable no-bitwise */

    return result.toString(16);
  });
};

uuidv4.regex = /^[a-f0-9]{8}-[a-f0-9]{4}-4[a-f0-9]{3}-[89aAbB][a-f0-9]{3}-[a-f0-9]{12}$/;

uuidv4.is = function (value) {
  if (!value) {
    throw new Error('Value is missing.');
  }

  return uuidv4.regex.test(value);
};

uuidv4.empty = function () {
  return '00000000-0000-0000-0000-000000000000';
};

uuidv4.fromString = function (text) {
  if (!text) {
    throw new Error('Text is missing.');
  }

  var hash = sha1(text),
      uuid = hash.substring(0, 8) + '-' + hash.substring(8, 12) + '-4' + hash.substring(13, 16) + '-8' + hash.substring(17, 20) + '-' + hash.substring(20, 32);

  return uuid;
};

module.exports = uuidv4;
},{"sha-1":6}]},{},[1]);
