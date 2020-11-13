const constants = require('./constants');
StateGraph = require('./stateGraph');
handleOp = require('./handleOperators');
combineGraphs = require('./combineGraphs');

/**
 *  @class Class for edge-based design space graph representation
 *  @type {Object} See graph.schema.json
 */
class EdgeGraph extends StateGraph {

  constructor() {
    super();
  }

  addEpsilonEdge(src, dest) {
    let newEdge = {
      src: src,
      dest: dest,
      component: constants.EPSILON,
      type: constants.EPSILON,
      text: constants.EPSILON,
      orientation: constants.NONE
    };
    this.graph[src].edges.push(newEdge);
    return newEdge;
  }

  addAtomEdge(src, dest, component, text) {
    let newEdge = {
      src: src,
      dest: dest,
      component: component,
      type: constants.ATOM,
      text: text,
      orientation: constants.INLINE
    };
    this.graph[src].edges.push(newEdge);
    return newEdge;
  }

  deepCopy() {
    let copy = new EdgeGraph();
    copy.graph = JSON.parse(JSON.stringify(this.graph));
    return copy;
  }

  removeNodeFromEdges(newDest, deleted) {
    for (let id in this.graph) {
      let node = this.graph[id];
      for (let edge of node.edges) {
        if (edge.dest === deleted) {
          if (newDest === null) {
            node.edges = node.edges.filter(e => JSON.stringify(e) !== JSON.stringify(edge));
          } else {
            edge.dest = newDest;
          }
        }
      }
    }
  }

  removeDuplicatesEdges() {
    for (let id in this.graph) {
      this.removeDuplicatesFromNode(this.graph[id]);
    }
  }

  removeDuplicatesFromNode(node) {
    for (let i = 0; i < node.edges.length; i++) {
      for (let j = i+1; j < node.edges.length; j++) {
        let edgeOneInfo = [node.edges[i].src, node.edges[i].dest, node.edges[i].component];
        let edgeTwoInfo = [node.edges[j].src, node.edges[j].dest, node.edges[j].component];
        if (JSON.stringify(edgeOneInfo) === JSON.stringify(edgeTwoInfo)) {
          node.edges.splice(j, 1);
        }
      }
    }
  }


  /* * * * * * * * * * */
  /*   NODE HANDLING   */
  /* * * * * * * * * * */

  /**
   * Adds accept nodes to all remaining leaf nodes
   * @param boundaryStack Boundary stack
   */
  addAcceptNodes(boundaryStack) {
    const leaves = boundaryStack[0].leaves;

    for (let leafId of leaves) {
      this.setNodeType(leafId, constants.ACCEPT);
      this.setNodeText(leafId, constants.ACCEPT);
    }
  }

  /**
   * Chooses root node. Boundary stack should only have one connected element remaining when called
   * @param boundaryStack Boundary stack
   * @returns {*} Root node
   */
  generateRootNode(boundaryStack) {
    if (boundaryStack.length !== 1) {
      throw new Error('Error generating graph');
    }

    let root = boundaryStack[0].head;

    if (this.getNodeType(root) === constants.ACCEPT) {
      this.setNodeText(root, constants.ROOT);
    } else {
      this.setNodeType(root, constants.ROOT);
      this.setNodeText(root, constants.ROOT);
    }
    return root;
  }

  /**
   * Adds a connected component to the boundary stack
   * @param head The head of the component
   * @param leaves
   * @param boundaryStack The boundary stack
   */
  addToBoundaryStack(head, leaves, boundaryStack) {
    let obj = {head: head, leaves: leaves};
    boundaryStack.push(obj);
  }



  /* * * * * * * * */
  /*   OPERATORS   */
  /* * * * * * * * */

  /**
   * Handles or operator
   * @param boundaryStack Boundary stack
   * @param representation NODE or EDGE
   * @param populateArgs arguments to populateGraph from graphGOLDBAR
   */
  handleOr(boundaryStack, representation, populateArgs) {
    let parentId = this.createEpsilonNode();
    let leaves = [];
    let partialBoundaryStack = [];
    // find partial stateGraphs for each half of the And
    for (let i = 0; i < populateArgs.parsed.length; i++) {
      let partialBoundary = [];
      handleOp.populateGraph(populateArgs.parsed[i], this, partialBoundary, representation, populateArgs.categories,
        populateArgs.maxCycles, populateArgs.andFlag, populateArgs.mergeFlag);
      partialBoundaryStack = partialBoundaryStack.concat(partialBoundary);
    }

    while (partialBoundaryStack.length > 0) {
      let orObj = partialBoundaryStack.pop();
      this.addEpsilonEdge(parentId, orObj.head);
      for (let leaf of orObj.leaves) {
        leaves.push(leaf);
      }
    }

    this.addOperator(parentId, constants.OR);
    this.addToBoundaryStack(parentId, leaves, boundaryStack);
  }

  /**
   * Handles or operator when parsing SBOL
   * @param partialBoundary Boundary stack
   */
  handleOrSBOL(partialBoundary) {
    let parentId = this.createEpsilonNode();
    let children = [];

    // everything on the partial boundary stack is something to be OR-ed
    while (partialBoundary.length > 0) {
      let orPart = partialBoundary.pop();
      this.addEpsilonEdge(parentId, orPart.head);
      children.push(...orPart.leaves)
    }

    this.addOperator(parentId, constants.OR);
    this.addToBoundaryStack(parentId, children, partialBoundary);
  }


  /**
   * Handles and operator
   * @param boundaryStack Boundary stack
   * @param representation String: Which kind of graph to build
   * @param populateArgs Object: arguments to populateGraph (from graphGOLDBAR)
   * @param tolerance number: tolerance level of AND
   */
  handleAnd(boundaryStack, representation, populateArgs, tolerance) {
    let partialStateGraphs = {};
    let partialBoundaryStacks = [];
    let artificialCategories = {}; // repeat the categories for every partial graph (to work with existing combineGraphs)
    // find partial stateGraphs for each half of the And
    for (let i = 0; i < populateArgs.parsed.length; i++) {
      let partialGraph = new EdgeGraph();
      let partialBoundary = [];
      handleOp.populateGraph(populateArgs.parsed[i], partialGraph, partialBoundary, representation, populateArgs.categories,
        populateArgs.maxCycles, populateArgs.andFlag, populateArgs.mergeFlag);
      partialStateGraphs[i] = partialGraph;
      partialBoundaryStacks.push(partialBoundary);
      artificialCategories[i] = populateArgs.categories;
    }
    // add accept and root nodes to the partial graphs (to work with existing combineGraphs)
    for (let i = 0; i < Object.keys(partialStateGraphs).length; i++) {
      let partial = partialStateGraphs[i];
      partial.addAcceptNodes(partialBoundaryStacks[i]);
      partial.generateRootNode(partialBoundaryStacks[i]);
      partial.collapseEpsilons();
    }
    // combine the graphs and add them to the larger stateGraph of the whole expression
    let combined = combineGraphs.combineGraphs(constants.AND, partialStateGraphs, artificialCategories, tolerance);

    if (combined.graph.equals(new EdgeGraph())) {
      return;
    }

    let combinedRoot = combined.graph.root;
    let combinedAccepts = combined.graph.accepts;

    // remove root and accept labels since this is an intermediate graph
    combined.graph.removeNodeLabels();
    // removeLabelsFromAndGraph(combined.graph, combinedRoot, combinedAccepts);
    // add the combined graph information into stateGraph and boundaryStack
    this.concat(combined.graph);
    this.addToBoundaryStack(combinedRoot, combinedAccepts, boundaryStack);

    // put the combined categories back into the original categories
    Object.assign(populateArgs.categories, combined.categories);
  }

  /**
   * Handles and operator
   * @param boundaryStack Boundary stack
   * @param representation String: Which kind of graph to build
   * @param populateArgs Object: arguments to populateGraph (from graphGOLDBAR)
   */
  handleMerge(boundaryStack, representation, populateArgs) {
    let partialStateGraphs = {};
    let partialBoundaryStacks = [];
    let artificialCategories = {}; // repeat the categories for every partial graph (to work with existing combineGraphs)
    // find partial stateGraphs for each half of the And
    for (let i = 0; i < populateArgs.parsed.length; i++) {
      // let partialGraph = {};
      let partialGraph = new EdgeGraph();
      let partialBoundary = [];
      handleOp.populateGraph(populateArgs.parsed[i], partialGraph, partialBoundary, representation, populateArgs.categories,
        populateArgs.maxCycles, populateArgs.andFlag, populateArgs.mergeFlag);
      partialStateGraphs[i] = partialGraph;
      partialBoundaryStacks.push(partialBoundary);
      artificialCategories[i] = populateArgs.categories;
    }
    // add accept and root nodes to the partial graphs (to work with existing combineGraphs)
    for (let i = 0; i < Object.keys(partialStateGraphs).length; i++) {
      let partial = partialStateGraphs[i];
      partial.addAcceptNodes(partialBoundaryStacks[i]);
      partial.generateRootNode(partialBoundaryStacks[i]);
      partial.collapseEpsilons();
    }
    // combine the graphs and add them to the larger stateGraph of the whole expression
    let combined = combineGraphs.combineGraphs(constants.MERGE, partialStateGraphs, artificialCategories);

    if (JSON.stringify(combined.graph) === JSON.stringify({})) {
      return;
    }

    let combinedRoot = combined.graph.root;
    let combinedAccepts = combined.graph.accepts;

    // remove root and accept labels since this is an intermediate graph
    combined.graph.removeNodeLabels();
    // removeLabelsFromAndGraph(combined.graph, combinedRoot, combinedAccepts);
    // add the combined graph information into stateGraph and boundaryStack
    this.concat(combined.graph);
    this.addToBoundaryStack(combinedRoot, combinedAccepts, boundaryStack);

    // put the combined categories back into the original categories
    Object.assign(populateArgs.categories, combined.categories);
  }


  /**
   * Handles then operator
   * @param boundaryStack Boundary stack
   */
  handleThen(boundaryStack) {
    const b = boundaryStack.pop();
    const a = boundaryStack.pop();

    // if the head of 'a' is an OR, it will have multiple leaves, so you need an epsilon edge to connect 'a' and 'b'
    if (this.getOperators(a.head).includes(constants.OR)) {
      let lenA = a.leaves.length;
      for (let i = 0; i < lenA; i++) {
        const leaf = a.leaves.pop();
        this.addEpsilonEdge(leaf, b.head);
      }
      this.addOperator(b.head, constants.THEN);
    } else {
      // if head of 'a' is not an OR, then there will only be one leaf
      const leaf = a.leaves[0];
      for (let edge of this.getEdges(b.head)) {
        edge.src = leaf;
        this.getEdges(leaf).push(edge);
      }
      this.addOperator(leaf, constants.THEN);
      for (let op of this.getOperators(b.head)) {
        this.addOperator(leaf, op);
      }
      this.removeNodeFromEdges(leaf, b.head);
      this.removeNode(b.head);
    }

    // get all children of 'b' to add back to boundary stack
    const children = [];
    let lenB = b.leaves.length;
    for (let i = 0; i < lenB; i++) {
      children.push(b.leaves.pop());
    }
    this.addToBoundaryStack(a.head, children, boundaryStack);
  }


  /**
   * Handles zero-or-more operator
   * Generates the following graph: parent -> a.head -> ... -> leaves -> parent
   * @param boundaryStack Boundary stack
   */

  handleZeroOrMore(boundaryStack) {
    const a = boundaryStack.pop();
    const tail = this.createEpsilonNode();

    this.addEpsilonEdge(a.head, tail);

    for (let leaf of a.leaves) {
      this.addEpsilonEdge(leaf, a.head);
    }

    this.addOperator(a.head, constants.ZERO_MORE);
    this.addToBoundaryStack(a.head, [tail], boundaryStack);
  }

  /**
   * Handles zero-or-one operator
   * @param boundaryStack Boundary stack
   */

  handleZeroOrOne(boundaryStack) {

    const a = boundaryStack.pop();

    for (let leaf of a.leaves) {
      this.addEpsilonEdge(a.head, leaf);
    }

    this.addOperator(a.head, constants.ZERO_ONE);
    this.addToBoundaryStack(a.head, a.leaves, boundaryStack);
  }

  /**
   * Handles one-or-more operator
   * Generates the following graph: parent -> a.head -> ... -> leaves -> epsilon -> a.head
   * @param boundaryStack Boundary stack
   */
  handleOneOrMore(boundaryStack) {

    const a = boundaryStack.pop();

    // check if one-or-more (zero-or-more (....))
    for (let edge of this.getEdges(a.leaves[0])) {
      if (edge.dest === a.head) {
        this.addToBoundaryStack(a.head, a.leaves, boundaryStack);
        return;
      }
    }
    for (let leaf of a.leaves) {
      this.addEpsilonEdge(leaf, a.head);
    }

    this.addOperator(a.head, constants.ONE_MORE);
    this.addToBoundaryStack(a.head, a.leaves, boundaryStack);
  }

  /**
   * Makes a reverse complemented atom
   * @param atom
   * @param boundaryStack
   * @param categories
   */
  handleRevComp(atom, boundaryStack, categories) {
    // This operator should never be around anything other than an atom name (same level as Atom)
    const epsilon0 = this.createEpsilonNode();

    const epsilon1 = this.createEpsilonNode();

    this.setNodeText(epsilon0, atom[0] + ".head");
    let atomEdge = this.addAtomEdge(epsilon0, epsilon1, categories[atom[0]], atom[0]);
    atomEdge.orientation = constants.REV_COMP; // because default is INLINE
    this.addToBoundaryStack(epsilon0, [epsilon1], boundaryStack);
  }


  /**
   * Adds a single atom to the graph
   * @param atom Atom to add
   * @param boundaryStack Boundary stack
   * @param categories Object: categories that the user input
   */
  handleAtom(atom, boundaryStack, categories) {
    const epsilon0 = this.createEpsilonNode();

    const epsilon1 = this.createEpsilonNode();

    this.setNodeText(epsilon0, atom[0] + ".head");
    let atomEdge = this.addAtomEdge(epsilon0, epsilon1, categories[atom[0]], atom[0]);
    atomEdge.orientation = constants.INLINE;
    this.addToBoundaryStack(epsilon0, [epsilon1], boundaryStack);
  }


  /* * * * * * * * * * * */
  /*   GRAPH TRAVERSAL   */
  /* * * * * * * * * * * */
  /**
   * Generates all paths through the graph
   * @param root The root node
   * @param maxCycles number of times to repeat through an orMore
   * @returns {object} Array of paths through graph
   */
  enumeratePaths(root, maxCycles) {
    // collapse a copy and save the original for SBOL generation
    let collapsed = this.deepCopy();
    let old = collapsed.deepCopy();
    collapsed.collapseEpsilons();

    while (!collapsed.equals(old)) {
      old = collapsed.deepCopy();
      collapsed.collapseEpsilons();
    }

    root = collapsed.root;

    let dummyEdge = {'src': 'dummy',
      'dest': root,
      'component': constants.EPSILON,
      'type': constants.EPSILON,
      'text': constants.EPSILON
    };
    let allPaths = collapsed.visitEdges(dummyEdge, maxCycles);
    allPaths = this.removeDuplicatePaths(allPaths);

    for (let path of allPaths) {
      this.printPath(path);
    }

    return {graph: this, paths: allPaths, collapsed: collapsed};
  }

  /**
   * Returns all valid paths through graph
   * (Adapted from https://www.geeksforgeeks.org/print-paths-given-source-destination-using-bfs/)
   * @param dummy
   * @param maxCycles
   */
  visitEdges(dummy, maxCycles) {
    let queue = [];
    let path = [];
    let allPaths = [];
    maxCycles = parseInt(maxCycles);

    // first path just starts with the dummy edge, put it in the queue
    path.push(dummy);
    queue.push(path);

    // continue to shift paths off the queue to see if they can continue
    while (queue.length > 0) {
      path = queue.shift();
      let last = path[path.length - 1];
      // if you hit an accept, process the path
      if (this.getNodeType(last.dest) === constants.ACCEPT) {
        // if (stateGraph[last.dest].type === constants.ACCEPT) {
        this.processPath(path, allPaths);
      }

      // find all the valid next edges from this edge, if there are any, visit them
      let next = this.nextEdges(last, path, maxCycles);
      for (let nextEdge of next) {
        let newPath = [...path];
        newPath.push(nextEdge);
        queue.push(newPath);
      }
    }
    return allPaths;
  }


  /**
   * Returns a list of valid next edges that one can take from the current edge to form a valid path
   * @param edge
   * @param path
   * @param maxCycles
   * @return {Array|*}
   */
  nextEdges(edge, path, maxCycles) {
    let edges = [];
    for (let nextEdge of this.getEdges(edge.dest)) {
      let visitedN = this.countNodeVisits(nextEdge.dest, path);
      let visitedE = this.countEdgeVisits(nextEdge, path);
      // if a one-or-more node is in the path more than maxCycles times don't include
      if (this.getOperators(nextEdge.dest).includes(constants.ONE_MORE)) {
        if (visitedN > maxCycles) {
          continue;
        }
      }
      if (visitedE > maxCycles) { // if an edge is in the path more than maxCycles times, don't include
        continue;
      }
      if (visitedN > maxCycles+1) { // if a regular node is in the path more than maxCycles+1 times, don't include
        continue;
      }
      // else include the edge
      edges.push(nextEdge);
    }
    return edges;
  }

  countNodeVisits(id, path) {
    let count = 0;
    for (let e of path) {
      if (e.dest === id) {
        count += 1;
      }
    }
    return count;
  }

  countEdgeVisits(edge, path) {
    let count = 0;
    for (let e of path) {
      if (JSON.stringify(e) === JSON.stringify(edge)) {
        count += 1;
      }
    }
    return count;
  }

  /**
   * Adds a path to array of final paths
   * Ignores epsilon and root nodes
   * @param path Path to add
   * @param allPaths Array of final paths
   */
  processPath(path, allPaths) {
    let processedPath = [];
    for (let edge of path) {
      if (edge.component === constants.EPSILON) {
        continue;
      }
      processedPath.push(JSON.parse(JSON.stringify(edge)));
    }
    if (!processedPath.length) {
      return;
    }
    allPaths.push(processedPath);
  }

  /**
   * Simplify graph by removing unnecessary nodes and edges
   */
  collapseEpsilons() {
    let pMap = this.pMap;

    for (let node in this.graph) {
      // take action only if node is an epsilon and has no operators
      if (this.graph[node].type === constants.EPSILON) {
        this.collapseNode(pMap, node);
      }
    }
    this.removeDuplicatesEdges();
  }

  /**
   * Determines whether or not the node and its edges can be safely removed
   * @param pMap A dictionary of all nodes and their parents
   * @param node The current node we are traversing
   */
  collapseNode(pMap, node) {
    const parentIds = Array.from(pMap[node]);
    // if node has one parent and parent is epsilon, transfer children and operator
    if (parentIds.length === 1) {
      let parent = this.graph[parentIds[0]];
      let edges = parent.edges.filter(e => e.dest === node);
      if ((edges.length === 1) && (edges[0].component === constants.EPSILON)) {
        for (let edge of this.graph[node].edges) {
          edge.src = parentIds[0];
          parent.edges.push(edge);
          pMap[edge.dest].add(parentIds[0]);
          pMap[edge.dest].delete(node);
        }
        parent.operator.push(...this.graph[node].operator);
        parent.edges = parent.edges.filter(e => e.dest !== node);
        delete this.graph[node];
        delete pMap[node];
        return;
      }
    }

    // if node has operators, ignore
    if (this.graph[node].operator.length > 0) {
      return;
    }

    // if the node doesn't have any operators:
    // if one of its children is the same as one of its parent's children, delete that child edge
    for (let edge of this.graph[node].edges) {
      for (let pid of parentIds) {
        for (let pEdge of this.graph[pid].edges) {
          // parent edge dest equals node edge's dest
          if (pEdge.dest === edge.dest) {
            // both edges are epsilons
            if ((pEdge.component === constants.EPSILON) && (edge.component === constants.EPSILON)) {
              this.graph[node].edges = this.graph[node].edges.filter(e => JSON.stringify(e) !== JSON.stringify(edge));
              // remove from pMap
              pMap[edge.dest].delete(node);
            }
          }
        }
      }
    }

    if (this.graph[node].edges.length === 0) {
      delete this.graph[node];
      this.removeNodeFromEdges(null, node);
      return;
    }

    // if node has multiple children, ignore
    if (this.graph[node].edges.length > 1) {
      return;
    }

    const childId = this.graph[node].edges[0].dest;

    for (let i = 0; i < parentIds.length; i++) {
      let pid = parentIds[i];

      // don't collapse an or-more loop
      if (childId === pid) {
        return;
      }

      // find and move the edge that has the atom
      if (this.graph[node].edges[0].type === constants.ATOM){
        //transfer child edge to the parent
        let newEdge = this.graph[node].edges[0];
        newEdge.src = pid;
        this.graph[pid].edges.push(newEdge);
        this.graph[pid].edges = this.graph[pid].edges.filter(e => e.dest !== node); //delete the old edge
      } else {
        //else we'll just redirect the parent edge
        let atomEdges = this.graph[pid].edges.filter(e => e.dest === node);
        atomEdges.forEach((e) => {
          e.dest = childId;
        }); // this still references the original object
      }

      //update parent map
      pMap[childId].add(pid);
      pMap[childId].delete(node);
    }

    // Remove epsilon from state graph
    delete this.graph[node];
  }

  /**
   * Returns a dictionary of all nodes and their parents
   * @returns {{node id: []}}
   */
  get pMap() {
    let pMap = {};
    for (let id in this.graph) {
      this.graph[id].edges.forEach((edge) => {
        if(!(edge.dest in pMap)) {
          pMap[edge.dest] = new Set();
        }
        pMap[edge.dest].add(edge.src);
      });
    }
    return pMap;
  }

  /**
   * Prints a path to the console
   * @param path The path to print
   */
  printPath(path) { // eslint-disable-line no-unused-vars
    let pathStr = 'Path: ';
    for (let i = 0; i < path.length; i++) {
      pathStr += ' ' + path[i].text;
    }
    console.log(pathStr);
  }

  pathString(path) {
    let pathStr = 'Path: ';
    for (let i = 0; i < path.length; i++) {
      pathStr += ' ' + path[i].text;
    }
    return pathStr;
  }


  removeDuplicatePaths(allPaths) {
    let pathStrs = [];
    for (let path of allPaths) {
      pathStrs.push(this.pathString(path));
    }
    let unique = [];
    for (let i = 0; i < pathStrs.length; i++) {
      let add = true;
      for (let j = i+1; j < pathStrs.length; j++) {
        if (pathStrs[i] === pathStrs[j]) {
          add = false;
        }
      }
      if (add) {
        unique.push(allPaths[i])
      }
    }
    return unique;
  }

}


module.exports = EdgeGraph;
