const LINKDISTANCE = 25;
const CHARGESTRENGTH = -400;
const MAXDISTANCE = 100;
const IMAGESIZE = 30;
const RADIUS = 7;
const INTERMEDIATE = 'intermediate';

let nodePointer;
let linkPointer;
let simulationPointer;
let svgPointer;
let circlePointer;
let imagePointer;
let textPointer;

let width;
let height;

/* * * * * * */
/*  DESIGNS  */
/* * * * * * */
/**
 * Displays designs returned by Constellation
 * @param editors List of editor text boxes
 * @param designs Designs object returned by Constellation
 */
function displayDesigns(editors, designs) {
  editors.designsEditor.setValue(designs);
}

/* * * * * */
/*  GRAPH  */
/* * * * * */
/**
 * Calls functions to display graph returned by Constellation
 * @param stateGraph Graph object returned by Constellation
 */
function displayDiagram(stateGraph) {
  let {nodes, links} = generateGraph(stateGraph);

  updateSvgSize();
  // Create SVG
  svgPointer = d3.select('#categoryGraph')
    .append('svg')
    .attr('width', width)
    .attr('height', height);

  // Start simulation
  simulationPointer = d3.forceSimulation()
    .nodes(nodes)
    .force('charge', d3.forceManyBody()
      .strength(CHARGESTRENGTH)
      .distanceMax(MAXDISTANCE)
    )
    .force('link', d3.forceLink(links).id(function(d) { return d.id }).distance(LINKDISTANCE))
    .force('collide', d3.forceCollide( function(d){return d.r + 8 }).iterations(16))
    .force('centre', d3.forceCenter(width / 2, height / 2))
    .on('tick', tick);

  drawLinks(links);
  drawNodes(nodes);
  handleDrag();
}

/**
 * Converts graph into a D3 compatible data structure
 * @param stateGraph Current graph
 * @returns {{nodes: Array, links: Array}}
 */
function generateGraph(stateGraph) {
  let nodes = [];
  let links = [];

  for (let node in stateGraph) {
    let text = '';
    if (stateGraph[node].type === graph.ATOM) {
      text = stateGraph[node].text;
    }
    nodes.push({id: node, type: stateGraph[node].type, text});
  }

  // Get edges from stateGraph
  let id = 0;
  for (let node in stateGraph) {
    for (let edge of stateGraph[node].edges) {
      nodes.push({id, type: INTERMEDIATE});
      links.push({source: node, target: id});
      links.push({source: id, target: edge});
      id++;
    }
  }

  return {nodes, links};
}

/**
 * Draws links and arrowheads on SVG
 * @param links D3 links object
 */
function drawLinks(links) {
  // Define arrowhead shape
  svgPointer.append('svg:defs').append('svg:marker')
    .attr('id', 'arrow')
    .attr('viewBox', '0 -5 10 10')
    .attr('refX', 10) // Move away from line's end
    .attr('markerWidth', 10)
    .attr('markerHeight', 10)
    .attr('orient', 'auto')
    .append('svg:path')
    .style('fill', '#585858')
    .attr('d', 'M0, -3L3, 0L0,3');

  // Add links
  linkPointer = svgPointer.selectAll('line.link')
    .data(links)
    .enter().append('path')
    .attr('class', 'link')
    .style('stroke', '#585858')
    .style( 'stroke-width', 2 );

  // Attach arrowhead
  linkPointer.filter( function(d) { return d.source.type  === INTERMEDIATE; } )
    .attr('marker-end', 'url(#arrow)');
}

/**
 * Draws nodes on SVG
 * @param nodes D3 nodes object
 */
function drawNodes(nodes) {
  // Add g component
  nodePointer = svgPointer.selectAll('.node')
    .data(nodes)
    .enter()
    .append('g')
    .attr('class', 'node');

  // Add tooltip
  textPointer = nodePointer.filter( function(d) { return d.type !== INTERMEDIATE} )
    .append('text')
    .text( function(d) {
      if (d.type === graph.ROOT) {
        return 'Root';
      } else if (d.type === graph.EPSILON) {
        return 'Epsilon'
      } else if (d.type === graph.ACCEPT) {
        return 'Accept';
      }
      return d.text;
    })
    .attr('opacity', 0)
    .attr('dx', '20px')
    .attr('dy', '4px');

  // Add circles
  circlePointer = nodePointer.filter(function (d) { return d.type !== graph.ATOM; })
    .append('circle')
    .attr('fill', function(d) {
      if (d.type === graph.ROOT) {
        return '#ff0008';
      } else if (d.type === graph.ACCEPT) {
        return '#00ff00';
      } else if (d.type === graph.EPSILON) {
        return '#ffff00';
      } else if (d.type === INTERMEDIATE) {
        return '#55eeff';
      } else {
        return '#ffffff';
      }
    })
    .attr('title', function(d) {return d.type})
    .attr('r', function(d) {
      if (d.type === INTERMEDIATE) {
        return 0;
      }
      return RADIUS;
    });

  // Add images
  imagePointer = nodePointer.filter(function(d) { return d.type === graph.ATOM; })
    .append('g')
    .attr('transform', 'translate(-15 , -30)')
    .append('svg:image')
    .attr('xlink:href', function(d) {
      switch (d.text) {
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
    .attr('width', IMAGESIZE);
}

/* * * * * * * */
/*   UPDATES   */
/* * * * * * * */
/**
 * Updates sizes and positions of SVG elements
 */
function tick() {
  // Update SVG size
  updateSvgSize();
  svgPointer.attr('height', height)
    .attr('width', width);
  simulationPointer.force('centre', d3.forceCenter(width / 2, height / 2));

  // Update circle positions
  circlePointer.attr('transform', function(d) {
    d.x = Math.max(RADIUS, Math.min(width - RADIUS, d.x));
    d.y = Math.max(RADIUS, Math.min(height - RADIUS, d.y));
    return 'translate(' + d.x + ',' + d.y + ')'
  });

  // Update image positions
  imagePointer.attr('transform', function(d) {
    d.x = Math.max(20, Math.min(width - 20, d.x));
    d.y = Math.max(25, Math.min(height - 10, d.y));
    return 'translate(' + d.x + ',' + d.y + ')'
  });

  // Update text positions
  textPointer.attr('transform', function(d) {
    d.x = Math.max(RADIUS, Math.min(width - RADIUS, d.x));
    d.y = Math.max(RADIUS, Math.min(height - RADIUS, d.y));
    return 'translate(' + d.x + ',' + d.y + ')'
  });

  // Update link positions
  linkPointer.attr('d', updateLinks);
}

/**
 * Updates link positions
 * @param d Link
 * @returns {string} Updated link d attribute
 */
function updateLinks(d) {
  let deltaX = d.target.x - d.source.x,
    deltaY = d.target.y - d.source.y,
    dist = Math.sqrt(deltaX * deltaX + deltaY * deltaY),
    normX = deltaX / dist,
    normY = deltaY / dist;

  let sourcePadding = 10,
    targetPadding = 10;

  if (d.source.type === INTERMEDIATE) {
    sourcePadding = 0;
  } else if (d.target.type === INTERMEDIATE) {
    targetPadding = 0;
  }

  let sourceX = d.source.x + normX * sourcePadding,
    sourceY = d.source.y + normY * sourcePadding,
    targetX = d.target.x - normX * targetPadding,
    targetY = d.target.y - normY * targetPadding;
  return 'M' + sourceX + ',' + sourceY + 'L' + targetX + ',' + targetY;
}

/**
 * Gets new size of SVG after divs are resized
 */
function updateSvgSize() {
  let g = document.getElementById('categoryGraph');
  width = g.clientWidth;
  height = g.clientHeight;
}

/* * * * * */
/*   DRAG  */
/* * * * * */
/**
 * Adds drag handlers to SVG
 */
function handleDrag() {
  svgPointer.call(d3.drag()
    .subject(dragSubject)
    .on('start', dragStarted)
    .on('drag', dragged)
    .on('end', dragEnded));

  nodePointer.on('mouseover', function() {
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

/**
 * Returns object being dragged
 * @returns {*}
 */
function dragSubject() {
  return simulationPointer.find(d3.event.x, d3.event.y);
}

/**
 * Handles start of drag event
 */
function dragStarted() {
  if (!d3.event.active) simulationPointer.alphaTarget(1).restart();
  d3.event.subject.fx = d3.event.subject.x;
  d3.event.subject.fy = d3.event.subject.y;
}

/**
 * Handles middle of drag event
 */
function dragged() {
  d3.event.subject.fx = d3.event.x;
  d3.event.subject.fy = d3.event.y;
}

/**
 * Handles end of drag event
 */
function dragEnded() {
  if (!d3.event.active) simulationPointer.alphaTarget(0.01);
  d3.event.subject.fx = null;
  d3.event.subject.fy = null;
}

/* * * * * * */
/*  CLEANUP  */
/* * * * * * */
/**
 * Resets graph and removes SVG elements
 */
function resetDiagram() {
  d3.selectAll('svg').remove();
}

/* * * * * * */
/*  BROWSER  */
/* * * * * * */
$(document).ready(function() {

  const THEME = "solarized light";

  const editors = {
    "specEditor": CodeMirror.fromTextArea(document.getElementById('langInput'), {lineNumbers: true}),
    "catEditor": CodeMirror.fromTextArea(document.getElementById('categories'), {lineNumbers: true}),
    "designsEditor": CodeMirror.fromTextArea(document.getElementById('designs'), {lineNumbers: true})
  };

  editors.specEditor.setOption("theme", THEME);
  editors.catEditor.setOption("theme", THEME);
  editors.catEditor.setValue('{"promoter": ["BBa_R0040", "BBa_J23100"],\n "rbs": ["BBa_B0032", "BBa_B0034"], \n"cds": ["BBa_E0040", "BBa_E1010"],\n"terminator": ["BBa_B0010"]}');
  editors.designsEditor.setOption("theme", THEME);

  $("#submitBtn").click(function(){
    // Reset UI
    resetDiagram();
    displayDesigns(editors, '');

    const specification = editors.specEditor.getValue();
    const categories = editors.catEditor.getValue();

    $.post('http://localhost:8082/postSpecs', {
      "specification": specification,
      "categories": categories,
      "number": "2.0",
      "name": "specificationname",
      "clientid": "userid"
    }, function (data) {
      if (String(data.designs).includes('Error:')) {
        // Undefined design
        if (String(data.designs).includes('is not defined')) {
          displayDesigns(editors, String(data.designs));
        }
        else {
          alert(data);
          return;
        }
        displayDesigns(editors, JSON.stringify(data.designs, null, "\t"));
      }
      displayDiagram(data.stateGraph);
    })
  });
});
