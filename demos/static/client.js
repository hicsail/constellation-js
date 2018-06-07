let node;
let link;
let width;
let height;
let simulation;
let svg;

const linkDistance = 50;
const chargeForceStrength = -100;
const imageSize = 30;
const radius = 7;

// TODO add arrows
// TODO prevent loops from collapsing
// TODO make graph horizontal with root at left

function displayDesigns(editors, designs) {
  editors.designsEditor.setValue(designs);
}

function displayDiagram(stateGraph) {
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

  updateSvgSize();
  svg = d3.select('#graph')
    .append('svg')
    .attr('width', width)
    .attr('height', height);

  simulation = d3.forceSimulation()
    .nodes(nodes)
    .force('charge', d3.forceManyBody().strength(chargeForceStrength))
    .force('link', d3.forceLink(links).id(function(d) { return d.id }).distance(linkDistance))
    .force('collide', d3.forceCollide( function(d){return d.r + 8 }).iterations(16))
    .force('centre', d3.forceCenter(width / 2, height / 2))
    .on('tick', tick);

  link = svg.selectAll('.link')
    .data(links)
    .enter()
    .append('g')
    .attr('class', 'link')
    .append('line');

  node = svg.selectAll('.node')
    .data(nodes)
    .enter()
    .append('g')
    .attr('class', 'node');

  node.filter(function (d) { return d.dataType !== 'atom'; })
    .append('circle')
    .attr('fill', function(d) {
      if (d.text === 'root') {
        return '#ff0008';
      } else if (d.text === 'accept') {
        return '#00ff00';
      } else if (d.text === 'o') {
        return '#ffff00';
      }
    })
    .attr('title', function(d) {return d.dataType})
    .attr('r', radius);

  node.filter(function(d) { return d.dataType === 'atom'; })
    .append('g')
    .attr('transform', 'translate(-5, -30)')
    .append('svg:image')
    .attr('xlink:href', function(d) {
      switch (d.text[0]) {
        case 'promoter':
        case 'terminator':
        case 'CDS':
        case 'restriction_enzyme_assembly_scar':
        case 'restriction_enzyme_recognition_site':
        case 'protein_stability_element':
        case 'blunt_end_restriction_enzyme_cleavage_site':
        case 'ribonuclease_site':
        case 'restriction_enzyme_five_prime_single_strand_overhang':
        case 'ribosome_entry_site':
        case 'five_prime_sticky_end_restriction_enzyme_cleavage_site':
        case 'RNA_stability_element':
        case 'ribozyme':
        case 'insulator':
        case 'signature':
        case 'operator':
        case 'origin_of_replication':
        case 'restriction_enzyme_three_prime_single_strand_overhang':
        case 'primer_binding_site':
        case 'three_prime_sticky_end_restriction_enzyme_cleavage_site':
        case 'protease_site':
          return './sbol/' + d.text + '.svg';
        default:
          return './sbol/' + 'user_defined.svg';
      }
    })
    .attr('width', imageSize);

  node.append('text')
    .text( function(d) {
      if (d.dataType === 'root') {
        return 'Root';
      } else if (d.dataType === 'o') {
        return 'Epsilon'
      } else if (d.dataType === 'accept') {
        return 'Accept';
      }
      return d.text[0];
    })
    .attr('opacity', 0)
    .attr('dx', '20px')
    .attr('dy', '4px');

  svg.call(d3.drag()
    .subject(dragSubject)
    .on('start', dragStarted)
    .on('drag', dragged)
    .on('end', dragEnded));

  node.on('mouseover', function() {
    d3.select(this)
      .select('text')
      .attr('opacity', 1);
  })
    .on('mouseout', function() {
      d3.select(this)
        .select('text')
        .attr('opacity', 0);
    });
}

function tick() {
  updateSvgSize();
  svg.attr('height', height)
    .attr('width', width);
  simulation.force('centre', d3.forceCenter(width / 2, height / 2));

  node.attr('transform', function(d) {
    d.x = Math.max(radius, Math.min(width - radius, d.x));
    d.y = Math.max(radius, Math.min(height - radius, d.y));
    return 'translate(' + d.x + ',' + d.y + ')'
  });

  link.attr('x1', function(d) { return d.source.x; })
    .attr('x2', function(d) { return d.target.x; })
    .attr('y1', function(d) { return d.source.y; })
    .attr('y2', function(d) { return d.target.y; });
}

function dragSubject() {
  return simulation.find(d3.event.x, d3.event.y);
}

function dragStarted() {
  if (!d3.event.active) simulation.alphaTarget(0.3).restart();
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

function updateSvgSize() {
  let g = document.getElementById('graph');
  width = g.clientWidth;
  height = g.clientHeight;
}
