const constants = require('./constants');
uuidv4 = require('uuidv4');

/**
 *  @class Abstract class for design space graph representation
 *  @type {Object} See graph.schema.json
 */
class StateGraph {

  constructor() {
    this.graph = {};
    if (this.constructor === StateGraph) {
      throw new TypeError('Abstract class "StateGraph" cannot be instantiated directly.');
    }
  }


  get numNodes() {
    return Object.keys(this.graph).length;
  }

  get numEdges() {
    let count = 0;
    for (let id in this.graph) {
      count += this.graph[id].edges.length;
    }
    return count;
  }

  /**
   * The root node is the start of the graph (there is only one)
   * @returns {string} The root node ID of the graph
   */
  get root() {
    for (let id in this.graph) {
      if (this.graph[id].type === constants.ROOT) {
        return id;
      }
    }
    return null;
  }

  /**
   * An accept node is the last node at the end of a valid path (there can be multiple)
   * @returns {Array} List of all accept node IDs in the graph
   */
  get accepts() {
    let accepts = [];
    for (let id in this.graph) {
      if (this.graph[id].type === constants.ACCEPT) {
        accepts.push(id);
      }
    }
    return accepts;
  }

  get nodes() {
    return Object.keys(this.graph);
  }

  get(id) {
    return this.graph[id];
  }

  getNodeType(node) {
    return this.graph[node].type;
  }

  getNodeText(node) {
    return this.graph[node].text;
  }

  getOperators(node) {
    return this.graph[node].operator;
  }

  getEdges(node) {
    return this.graph[node].edges;
  }

  concat(other) {
    Object.assign(this.graph, other.graph);
  }

  createEpsilonNode() {
    const epsilonId = uuidv4();
    this.graph[epsilonId] = {id: epsilonId, text: constants.EPSILON, component: constants.EPSILON, type: constants.EPSILON, edges: [], operator: []};
    return epsilonId;
  }

  addNode(node) {
    this.graph[node.id] = node;
  }

  addOperator(node, op) {
    if (op === constants.ONE_MORE) {
      this.graph[node].operator.unshift(op);
    } else {
      this.graph[node].operator.push(op);
    }
  }

  setNodeType(node, type) {
    this.graph[node].type = type;
  }

  setNodeText(node, text) {
    this.graph[node].text = text;
  }

  equals(other) {
    return JSON.stringify(this.graph) === JSON.stringify(other.graph);
  }

  removeNodeLabels() {
    let rootNode = this.graph[this.root];
    let accepts = this.accepts;
    rootNode.text = constants.EPSILON;
    rootNode.type = constants.EPSILON;

    for (let acceptID of accepts) {
      let acceptNode = this.graph[acceptID];
      acceptNode.text = constants.EPSILON;
      acceptNode.type = constants.EPSILON;
    }
  }

  removeNode(node) {
    delete this.graph[node];
  }



}

module.exports = StateGraph;
