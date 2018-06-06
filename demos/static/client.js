let node;
let link;
let width;
let height; // TODO implement centering and resizing
let simulation;
let svg;
// TODO constrain to rectangle only
// TODO add arrows
// TODO add symbols
// TODO prevent loops from collapsing

function displayDesigns(editors, designs) {
  editors.designsEditor.setValue(designs);
}

function displayDiagram(stateGraph) {
  // alert(JSON.stringify(stateGraph));
  let links = [];
  let nodes = [];

  for (let node in stateGraph) {
    nodes.push({id: node, dataType: stateGraph[node].dataType, text: stateGraph[node].text})
  }

  // Get edges from stateGraph
  for (let node in stateGraph) {
    for (let edge of stateGraph[node].edges) {
      links.push({source: node, target: edge});
    }
  }

  svg = d3.select('#graph').append('svg')
    .attr('width', '100%')
    .attr('height', '100%')
    .attr('preserveAspectRatio', 'none');

  simulation = d3.forceSimulation()
    .nodes(nodes)
    .force('charge', d3.forceManyBody())
    .force('link', d3.forceLink(links).id(function(d) { return d.id }))
    .force('collide', d3.forceCollide( function(d){return d.r + 8 }).iterations(16))
    .force('centre', d3.forceCenter(200, 125))
    .on('tick', tick);

  link = svg.append('g')
    .attr('class', 'link')
    .selectAll('line')
    .data(links)
    .enter()
    .append('line');

  node = svg.selectAll('.node')
    .data(nodes)
    .enter()
    .append('g')
    .attr('class', 'node');

  node.append('circle')
    .attr('fill', function(d) {
      if (d.text === 'root') {
        return '#ff0008';
      } else if (d.text === 'accept') {
        return '#00ff00';
      } else if (d.text === 'o') {
        return '#ffff00';
      }
      return '#0000ff';
    });

  node.append('text')
    .attr('dx', 12)
    .attr('dy', '.35em')
    .text(function(d) {
      if (d.dataType === 'atom') {
        return d.text;
      }
    });

  svg.call(d3.drag()
    .subject(dragSubject)
    .on('start', dragStarted)
    .on('drag', dragged)
    .on('end', dragEnded));

}

function tick() {
  node.attr('transform', function(d) { return 'translate(' + d.x + ',' + d.y + ')'; });

  link.attr('x1', function(d) { return d.source.x; })
    .attr('x2', function(d) { return d.target.x; })
    .attr('y1', function(d) { return d.source.y; })
    .attr('y2', function(d) { return d.target.y; });
}

function dragSubject() {
  return simulation.find(d3.event.x, d3.event.y);
}

function dragStarted() {
  if (!d3.event.active) simulation.alphaTarget(0.1).restart();
  d3.event.subject.fx = d3.event.subject.x;
  d3.event.subject.fy = d3.event.subject.y;
}

function dragged() {
  d3.event.subject.fx = d3.event.x;
  d3.event.subject.fy = d3.event.y;
}

function dragEnded() {
  if (!d3.event.active) simulation.alphaTarget(0.1);
  d3.event.subject.fx = null;
  d3.event.subject.fy = null;
}

function resetDiagram() {
  d3.selectAll('svg').remove();
}
