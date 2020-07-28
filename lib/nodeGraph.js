StateGraph = require('./stateGraph');
uuidv4 = require('uuidv4');
const constants = require('./constants');

/**
 *  @class Class for node-based design space graph representation
 *  @type {Object} See graph.schema.json
 */
class NodeGraph extends StateGraph {

  constructor() {
    super();
  }

  deepCopy() {
    let copy = new NodeGraph();
    copy.graph = JSON.parse(JSON.stringify(this.graph));
    return copy;
  }

  addEdge(node, edge) {
    this.graph[node].edges.push(edge);
  }

  setNodeComponent(node, comp) {
    this.graph[node].component = comp;
  }

  setNodeOrientation(node, orientation) {
    this.graph[node].orientation = orientation;
  }

  /* * * * * * * * * * */
  /*   NODE HANDLING   */
  /* * * * * * * * * * */

  /**
   * Adds accept nodes to all remaining leaf nodes
   * @param boundaryStack Boundary stack
   */
  addAcceptNodes(boundaryStack) {
    const length = boundaryStack[0].leaves.length;
    for (let i = 0; i < length; i++) {
      const atom = boundaryStack[0].leaves.pop();
      const acceptId = this.createEpsilonNode();
      this.setNodeType(acceptId, constants.ACCEPT);
      this.setNodeText(acceptId, constants.ACCEPT);

      this.addEdge(atom, acceptId);
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
    this.setNodeType(root, constants.ROOT);
    this.setNodeText(root, constants.ROOT);
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
   */
  handleOr(boundaryStack) {
    let parentId = this.createEpsilonNode();
    let a = boundaryStack.pop();
    let b = boundaryStack.pop();

    this.addEdge(parentId, a.head);
    this.addEdge(parentId, b.head);

    let children = [];

    let len = a.leaves.length;
    for(let i = 0; i < len; i++) {
      children.push(a.leaves.pop());
    }
    len = b.leaves.length;
    for(let i = 0; i < len; i++) {
      children.push(b.leaves.pop());
    }

    this.addOperator(parentId, constants.OR);
    this.addToBoundaryStack(parentId, children, boundaryStack);
  }

  /**
   * Handles then operator
   * @param boundaryStack Boundary stack
   */
  handleThen(boundaryStack) {
    let parentId = this.createEpsilonNode();
    const b = boundaryStack.pop();
    const a = boundaryStack.pop();
    // Gets all children of a and b to re-add to boundary stack
    const children = [];
    let len = a.leaves.length;
    for (let i = 0; i < len; i++) {
      const leaf = a.leaves.pop();
      this.addEdge(leaf, parentId);
    }
    len = b.leaves.length;
    for (let i = 0; i < len; i++) {
      children.push(b.leaves.pop());
    }
    this.addEdge(parentId, b.head);
    this.addOperator(parentId, constants.THEN);
    this.addToBoundaryStack(a.head, children, boundaryStack);
  }

  /**
   * Handles zero-or-more operator
   * Generates the following graph: parent -> a.head -> ... -> leaves -> parent
   * @param boundaryStack Boundary stack
   */
  handleZeroOrMore(boundaryStack) {
    let parentId = this.createEpsilonNode();
    const a = boundaryStack.pop();
    this.addEdge(parentId, a.head);
    const len = a.leaves.length;

    // Add edges from leaves of a to parent
    for (let i = 0; i < len; i++) {
      const leaf = a.leaves.pop();
      this.addEdge(leaf, parentId);
    }

    this.addOperator(parentId, constants.ZERO_MORE);
    this.addToBoundaryStack(parentId, [parentId], boundaryStack);
  }

  /**
   * Handles zero-or-one operator
   * @param boundaryStack Boundary stack
   */
  handleZeroOrOne(boundaryStack) {
    let parentId = this.createEpsilonNode();
    const a = boundaryStack.pop();
    const epsilonId = this.createEpsilonNode();

    // first append a to parent
    // a == ep --> atom
    this.addEdge(parentId, a.head);

    // then make an epsilon node
    this.setNodeComponent(epsilonId, constants.EPSILON);

    // point a's leaves to epsilon node
    for (let i = 0; i < a.leaves.length; i++ ) {
      this.addEdge(a.leaves[i], epsilonId);
    }
    // point parent to epsilon node
    this.addOperator(parentId, constants.ZERO_ONE);
    this.addEdge(parentId, epsilonId);
    // add parent and epsilon node to boundary stack
    this.addToBoundaryStack(parentId, [epsilonId], boundaryStack);
  }

  /**
   * Handles one-or-more operator
   * Generates the following graph: parent -> a.head -> ... -> leaves -> epsilon -> a.head
   * @param boundaryStack Boundary stack
   */
  handleOneOrMore(boundaryStack) {
    let parentId = this.createEpsilonNode();
    const a = boundaryStack.pop();

    // if operating on a zero-or-more(...), ignore. otherwise, redundant edges are added.
    if (a.leaves.includes(a.head)) {
      this.addToBoundaryStack(a.head, a.leaves, boundaryStack);
      this.removeNode(parentId);
      return;
    }
    this.addEdge(parentId, a.head);

    // Add edges from leaves of a to epsilon
    let tempLeaves = []; // TODO try to not need tempLeaves

    let len = a.leaves.length;
    for (let i = 0; i < len; i++) {
      const leaf = a.leaves.pop();
      tempLeaves.push(leaf);
      this.addEdge(leaf, a.head);
    }

    this.addOperator(a.head, constants.ONE_MORE);
    // stateGraph[parentId].operator.push(ONE_MORE);
    this.addToBoundaryStack(parentId, tempLeaves, boundaryStack);
  }


  /**
   * Adds a single reverse complemented atom to the graph
   * @param atom Atom to add
   * @param boundaryStack Boundary stack
   * @param categories Categories
   */
  handleRevComp(atom, boundaryStack, categories) {
    const epsilonId = this.createEpsilonNode();
    const atomId = this.createEpsilonNode();

    // add edge to atom node
    this.addEdge(epsilonId, atomId);
    // set properties of atom node
    this.setNodeType(atomId, constants.ATOM);
    this.setNodeText(atomId, atom[0]);
    this.setNodeComponent(atomId, categories[atom[0]]);
    this.setNodeOrientation(atomId, constants.REV_COMP);

    this.addToBoundaryStack(epsilonId, [atomId], boundaryStack);
  }

  /**
   * Adds a single atom to the graph
   * @param atom Atom to add
   * @param boundaryStack Boundary stack
   * @param categories Categories
   */
  handleAtom(atom, boundaryStack, categories) {
    const epsilonId = this.createEpsilonNode();
    const atomId = this.createEpsilonNode();

    // add edge to atom node
    this.addEdge(epsilonId, atomId);
    // set properties of atom node
    this.setNodeType(atomId, constants.ATOM);
    this.setNodeText(atomId, atom[0]);
    this.setNodeComponent(atomId, categories[atom[0]]);
    this.setNodeOrientation(atomId, constants.INLINE);

    this.addToBoundaryStack(epsilonId, [atomId], boundaryStack);
  }

  /* * * * * * * * * * * */
  /*   GRAPH TRAVERSAL   */
  /* * * * * * * * * * * */
  /**
   * Generates all paths through the graph
   * @param root The root node
   * @param maxCycles maximum number of times to traverse a cycle
   * @returns {object} Array of paths through graph
   */
  enumeratePaths(root, maxCycles) {
    let visited = {};
    let allPaths = [];

    this.collapseEpsilons(this.getEpsilonParents());

    this.visitNodes(root, visited, [], allPaths, maxCycles);
    return {graph: this, paths: allPaths};
  }

  /**
   * Visits nodes recursively and generates paths
   * @param nodeId Node to visit
   * @param visited Array of visited nodes
   * @param currentPath Current path being checked
   * @param allPaths Array of all final paths
   * @param maxCycles Maximum depth of cycles
   */
  visitNodes(nodeId, visited, currentPath, allPaths, maxCycles) {
    const node = this.graph[nodeId];

    let numCycles = node.operator.filter(value => -1 !== [constants.ONE_MORE].indexOf(value));
    if (numCycles.length !== 0) {
      if (visited[nodeId] > maxCycles) {
        return;
      }
    }

    // Don't let atoms exceed max cycle depth
    if (visited[nodeId] > maxCycles && this.graph[nodeId].type === constants.ATOM) {
      return;
    }
    // Allow epsilon nodes to exceed max cycle depth + 1, in case an atom is stuck in a cycle within a cycle
    if (visited[nodeId] > maxCycles + 1) {
      return;
    }
    // Handle ends of paths
    if (node.type === constants.ACCEPT) {
      this.processPath(currentPath, allPaths);
    }
    // Dead ends should only occur in accept nodes. Dead ends are not valid paths
    if (node.edges.length === 0) {
      return;
    }

    // Update cycle counter
    if (!(nodeId in visited)) {
      visited[nodeId] = 0;
    }
    visited[nodeId]++;
    currentPath.push(node);

    for (let child of node.edges) {
      this.visitNodes(child, visited, currentPath, allPaths, maxCycles);
    }

    // Update cycle counter
    currentPath.pop();
    visited[nodeId]--;
  }

  /**
   * Adds a path to array of final paths
   * Ignores epsilon and root nodes
   * @param path Path to add
   * @param allPaths Array of final paths
   */
  processPath(path, allPaths) {
    let processedPath = [];
    for (let node of path) {
      if (node.type === constants.EPSILON || node.type === constants.ROOT) {
        continue;
      }
      // Deep copy of node
      processedPath.push(JSON.parse(JSON.stringify(node)));
    }

    // Check if path is valid
    if (!processedPath.length) {
      return;
    }
    if (!this.isDuplicatePath(processedPath, allPaths)) {
      return;
    }
    allPaths.push(processedPath);
  }

  /**
   * Checks if an array of paths already contains a path
   * Runs in O(n^2) time
   * @param processedPath Path to check
   * @param allPaths Array of paths
   * @returns {boolean} Whether the path is a duplicate
   */
  isDuplicatePath(processedPath, allPaths) {
    for (let path of allPaths) {
      let equal = true;

      if (path.length !== processedPath.length) {
        equal = false;
      }

      for (let i = 0; i < processedPath.length && equal; i++) {
        if (processedPath[i].id !== path[i].id) {
          equal = false;
        }
      }

      if (equal) {
        return false;
      }
    }
    return true;
  }

  /**
   * Remove all epsilon nodes with exactly one parent from graph
   * @param epsilonMap Map of each epsilon node's parents
   */
  collapseEpsilons(epsilonMap) {
    for (let epsilonId in epsilonMap){
      const parentIds = Array.from(epsilonMap[epsilonId]);
      // Check if epsilon has more than one parent
      if (parentIds.length !== 1) {
        continue;
      }
      // Transfer children to parent
      const parent = this.graph[parentIds[0]];
      const epsilon = this.graph[epsilonId];
      for (let child of epsilon.edges) {
        // Replace child's parent
        if (child in epsilonMap) {
          const index = Array.from(epsilonMap[child]).indexOf(epsilonId);
          if (index > -1) {
            epsilonMap[child].delete(epsilonId);
            epsilonMap[child].add(parentIds[0]);
          }
        }
        this.addEdge(parentIds[0], child);
        if (epsilon.operator !== undefined ) {
          const last = parent.operator.length - 1;
          // Do not add duplicate ORs or ZeroOrOnes
          for (let i = 0; i < epsilon.operator.length; i++) {
            if (epsilon.operator[0] === constants.ZERO_ONE && parent.operator[last] === constants.ZERO_ONE) {
              continue;
            }
            if (parent.operator[last] !== constants.OR || epsilon.operator[0] !== constants.OR) {
              parent.operator.push(epsilon.operator[i]);
            }
          }
        }
      }
      // Remove epsilon from parent's edge
      const edgeIndex = parent.edges.indexOf(epsilonId);
      if (edgeIndex > -1) {
        parent.edges.splice(edgeIndex, 1);
      }
      // Remove epsilon from state graph
      this.removeNode(epsilonId);
    }
  }

  /**
   * Gets each epsilon node's parents
   * @returns {Object} Map of each epsilon node's parents
   */
  getEpsilonParents() {
    let epsilonMap = {};

    for (let nodeId of this.nodes) {
      // Check if node is the parent to any epsilons, then update epsilonMap
      for (let childId of this.graph[nodeId].edges){
        if (this.graph[childId].type === constants.EPSILON){
          if(!(childId in epsilonMap)){
            epsilonMap[childId] = new Set();
          }
          epsilonMap[childId].add(nodeId);
        }
      }
    }

    return epsilonMap;
  }

}

module.exports = NodeGraph;
