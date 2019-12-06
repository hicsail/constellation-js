import {config} from './config.js';
const LINKDISTANCE = 25;
const CHARGESTRENGTH = -400;
const MAXDISTANCE = 100;
const IMAGESIZE = 30;
const RADIUS = 7;
const INTERMEDIATE = 'intermediate';
const REPRESENTATION = config.representation;

let nodePointer, linkPointer, simulationPointer, svgPointer, circlePointer, imagePointer, textPointer, width, height, sbolDoc, sbolFile;
let designName = 'Constellation';

const ROOT = 'root';
const EPSILON = 'epsilon';
const ACCEPT = 'accept';
const ATOM = 'atom';
const OR_MORE = "OrMore";
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
  svgPointer = d3.select('#graph')
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

  for (let nodeId in stateGraph) {
    let text;
    let node = stateGraph[nodeId];

    if (node.type === graph.ROOT) {
      text = 'Root';
    } else if (node.type === graph.EPSILON) {
      text = 'Epsilon'
    } else if (node.type === graph.ACCEPT) {
      text =  'Accept';
    } else if (node.type === graph.ATOM) {
      text = node.text;
    }
    nodes.push({id: nodeId, type: node.type, component: node.component, text, operator: node.operator});
  }

  // Get edges from stateGraph
  let id = 0;
  for (let node in stateGraph) {
    for (let edge of stateGraph[node].edges) {
      // check if is edge representation
      if (REPRESENTATION === 'NODE') {
        // handle case of self-loop
        if (edge === node) {
          links.push({source: node, target: edge, component: stateGraph[node].component});
        } else {
          nodes.push({id, type: INTERMEDIATE, component: stateGraph[node].component});
          links.push({source: node, target: id, component: stateGraph[node].component});
          links.push({source: id, target: edge, component: stateGraph[node].component});
        }
      } else {
        nodes.push({id, type: INTERMEDIATE, text: edge.text, component: edge.component});
        links.push({source: edge.src, type: edge.type, text: EPSILON, target: id});
        links.push({source: id, type: edge.type, text: edge.text, target: edge.dest});
      }
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
    .attr('refX', 2) // Move away from line's end
    .attr('markerWidth', 20)
    .attr('markerHeight', 20)
    .attr('orient', 'auto')
    .append('svg:path')
    .style('fill', 'rgb(150,150,150)')
    .attr('d', 'M0, -3L3, 0L0,3');

  // Add links
  linkPointer = svgPointer.selectAll('line.link')
    .data(links)
    .enter().append('path')
    .attr('class', 'link')
    .style('stroke', 'rgb(150,150,150)')
    .style( 'stroke-width', 1)
    .style('fill', 'transparent');

  linkPointer.filter( function(d) { return d.source.type  === INTERMEDIATE || d.source === d.target; } )
    .attr('marker-end', 'url(#arrow)');
}

/**
 * Draws nodes on SVG
 * @param nodes D3 nodes object
 */
function drawNodes(nodes) {
  console.log(nodes);
  // Add g component
  nodePointer = svgPointer.selectAll('.node')
    .data(nodes)
    .enter()
    .append('g')
    .attr('class', 'node');

  // Add tooltip for node representation
  if (REPRESENTATION === "NODE") {
    textPointer = nodePointer.filter( function(d) { return d.type !== INTERMEDIATE} )
      .append('text')
      .text( function(d) {return d.operator; })
      .attr('opacity', 0)
      .attr('dx', '20px')
      .attr('dy', '4px')
      .style('fill', 'rgb(100,)')
      .style('font-family', 'Montserrat');
  }

  // Add circles
  circlePointer = nodePointer.filter(function (d) { return d.type !== graph.ATOM; })
    .append('circle')
    .attr('fill', function(d) {
      if (d.type === EPSILON) {
        return 'rgb(240,95,64)';
      } else {
        return '#ffffff';
      }
    })
    .attr('stroke', function(d) {
      if (d.type === ROOT) {
        return 'rgb(5,168,170)';
      } else if (d.type === ACCEPT) {
        return 'rgb(231,29,54)';
      } else if (d.type === EPSILON) {
        return '#ffffff';
      } else {
        return '#ffffff';
      }
    })
    .style( 'stroke-width', 2)
    .attr('title', function(d) {return d.type})
    .attr('r', function(d) {
      if (d.type === INTERMEDIATE) {
        return 0;
      }
      return RADIUS;
    });

  // Add images

  imagePointer = nodePointer.filter(filterByRep)
    .append('g')
    .attr('transform', 'translate(-15 , -30)')
    .append('svg:image')
    .attr('xlink:href', function(d) {
      switch (d.component) {
        // KEEP IN ALPHABETICAL ORDER
        case EPSILON:
        case OR_MORE:
        case 'ZERO':
          return;
        default:
          switch (d.component.role) {
            case 'aptamer':
            case 'assemblyScar':
            case 'bluntRestrictionSite':
            case 'cds':
            case 'dnaStabilityElement':
            case 'engineeredRegion':
            case 'fivePrimeOverhang':
            case 'fivePrimeStickyRestrictionSite':
            case 'insulator':
            case 'nonCodingRna':
            case 'operator':
            case 'originOfReplication':
            case 'originOfTrasnfer':
            case 'polyA':
            case 'promoter':
            case 'proteaseSite':
            case 'proteinStabilityElement':
            case 'ribosomeBindingSite':
            case 'ribozyme':
            case 'signature':
            case 'terminator':
              return './sbol/' + d.component.role + '.svg';
            default:
              return './sbol/' + 'noGlyphAssigned.svg';
          }
      }
    })
    .attr('width', IMAGESIZE);
}

function filterByRep(d) {
  if (REPRESENTATION === 'NODE') {
    return d.type === ATOM;
  } else {
    return d.type === INTERMEDIATE;
  }
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

  // update image positions
  imagePointer.attr('transform', function(d) {
    d.x = Math.max(20, Math.min(width - 20, d.x));
    d.y = Math.max(25, Math.min(height - 10, d.y));
    return 'translate(' + d.x + ',' + d.y + ')'
  });

  // update tooltip positions for node representation
  if (REPRESENTATION === 'NODE') {
    textPointer.attr('transform', function(d) {
      d.x = Math.max(RADIUS, Math.min(width - RADIUS, d.x));
      d.y = Math.max(RADIUS, Math.min(height - RADIUS, d.y));
      return 'translate(' + d.x + ',' + d.y + ')'
    });
  }

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
    normX = 0,
    normY = 0;
  if (dist !== 0) {
    normX = deltaX / dist;
    normY = deltaY / dist;
  }

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
    targetY = d.target.y - normY * targetPadding,
    drx = 0,
    dry = 0,
    xRotation = 0,
    largeArc = 0,
    sweep = 1;
  if (sourceX === targetX && sourceY === targetY) {
      xRotation = -45;
      largeArc = 1;
      drx = 30;
      dry = 20;
      targetX+=5;
      targetY+=10;
    }

  return 'M' + sourceX + ',' + sourceY + 'A' + drx + ',' + dry + ' ' +
    xRotation + ',' + largeArc + ',' + sweep + ' ' + targetX + ',' + targetY;
}

/**
 * Gets new size of SVG after divs are resized
 */
function updateSvgSize() {
  let g = document.getElementById('graph');
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
  if(simulationPointer){
    simulationPointer.stop();
  }
  d3.selectAll('svg').remove();
}

function processSBOLFile(file) {
  return new Promise((resolve) => {
    // Parse file into XML object
    let parser = new DOMParser();
    let reader = new FileReader();
    reader.readAsText(file, "UTF-8");
    reader.onload = function (evt) {
      let data = parser.parseFromString(evt.target.result, "application/xml");
      resolve(data);
    };
  });
}

/* * * * * * */
/*  BROWSER  */
/* * * * * * */
$(document).ready(function() {

  const THEME = 'ambiance';
  let combineMethod;

  const editors = {
    "specEditor": CodeMirror.fromTextArea(document.getElementById('goldbar-input-0'), {
      lineNumbers: true,
      lineWrapping:true
    }),
    "catEditor": CodeMirror.fromTextArea(document.getElementById('categories-0'), {
      lineNumbers: true,
      lineWrapping:true
    }),
    "designsEditor": CodeMirror.fromTextArea(document.getElementById('designs'), {
      lineNumbers: true,
      lineWrapping:true,
      readOnly: true})
  };

  document.getElementById('numDesigns').value = 40;
  document.getElementById('maxCycles').value = 0;

  editors.specEditor.setOption("theme", THEME);
  editors.catEditor.setOption("theme", THEME);
  editors.designsEditor.setOption("theme", THEME);

  /* * * * * * */
  /*    SBOL   */
  /* * * * * * */
  async function processSBOL(file) {
    //read SBOL file
    let sbolXML = await processSBOLFile(file);

    // Parse SBOL and display results
    $.ajax({
      url: 'http://localhost:8082/importSBOL',
      type: 'POST',
      data: sbolXML,
      contentType: "text/xml",
      dataType: "text",
      processData: false,
      success: function(data){
        data = JSON.parse(data);
        displayDiagram(data.stateGraph);
        // Undefined design
        if (String(data.designs).includes('is not defined')) {
          displayDesigns(editors, data.designs);
        } else {
          displayDesigns(editors, JSON.stringify(data.designs, null, "\t"));
        }
      }
    })
      .fail((response) => {
        alert(response.responseText);
      });
  };

  $('#demo-option').on('click', function() {
    document.getElementById('designName').value = "demo-example";
    editors.specEditor[0].setValue('one-or-more(one-or-more(promoter then nonCodingRna)then cds then \n (zero-or-more \n (nonCodingRna or (one-or-more \n (nonCodingRna then promoter then nonCodingRna) then cds)) then \n (terminator or (terminator then nonCodingRna) or (nonCodingRna then terminator)))))')
    editors.catEditor[0].setValue('{"promoter": {"ids": ["BBa_R0040", "BBa_J23100"], "role": "promoter"},\n "ribosomeBindingSite": {"ids": ["BBa_B0032", "BBa_B0034"], "role": "ribosomeBindingSite"}, \n"cds": {"ids": ["BBa_E0040", "BBa_E1010"], "role": "cds"},\n"nonCodingRna": {"ids": ["BBa_F0010"], "role": "nonCodingRna"},\n"terminator": {"ids": ["BBa_B0010"], "role": "terminator"}}');
  });


  $('#debug-option').on('click', function() {
    document.getElementById('designName').value = "debug-example";
    editors.specEditor[0].setValue('one-or-more (promoter or ribosomeBindingSite) then (zero-or-more cds) then terminator');
    editors.catEditor[0].setValue('{"promoter": {"ids": ["BBa_R0040", "BBa_J23100"], "role": "promoter"},\n "ribosomeBindingSite": {"ids": ["BBa_B0032", "BBa_B0034"], "role": "ribosomeBindingSite"}, \n"cds": {"ids": ["BBa_E0040", "BBa_E1010"], "role": "cds"},\n"nonCodingRna": {"ids": ["BBa_F0010"], "role": "nonCodingRna"},\n"terminator": {"ids": ["BBa_B0010"], "role": "terminator"}}');
  });


  $('#exportSBOLBtn').on('click', function() {
    downloadSBOL(sbolDoc, 'constellation_' + designName + '_sbol.xml');
  });

  $('[data-toggle="tooltip"]').tooltip();


  $("#submitBtn").click(function() {
    // Reset UI
    resetDiagram();
    displayDesigns(editors, '');
    $("#exportSBOLBtn").addClass('hidden');
    $('#goldbarSpinner').removeClass('hidden'); // show spinner

    let maxCycles = 0;
    let numDesigns = 10;

    if (editors.specEditor.length > 1) {
      if (combineMethod === null) {
        window.alert('Please select a method to combine your designs');
        return;
      }
    }

    const specification = editors.specEditor.getValue();
    const categories = editors.catEditor.getValue();

    numDesigns = document.getElementById('numDesigns').value;
    maxCycles = document.getElementById('maxCycles').value;
    designName = document.getElementById('designName').value;

    //replace all spaces and special characters for SBOL
    designName = designName.replace(/[^A-Z0-9]/ig, "_");

    $.post('http://localhost:8082/postSpecs', {
      "designName": designName,
      "specification": specification,
      "categories": categories,
      "numDesigns": numDesigns,
      "maxCycles": maxCycles,
      "number": "2.0",
      "name": "specificationname",
      "clientid": "userid",
      "representation": REPRESENTATION
    }, function (data) {
      displayDiagram(data.stateGraph);
      // Undefined design
      if (String(data.designs).includes('is not defined')) {
        displayDesigns(editors, data.designs);
      } else {
        displayDesigns(editors, JSON.stringify(data.designs, null, "\t"));
      }
      sbolDoc = data.sbol;

      $("#exportSBOLBtn").removeClass('hidden'); //show export button
      $("#goldbarSpinner").addClass('hidden');

    }).fail((response) => {
      alert(response.responseText);
      $("#goldbarSpinner").addClass('hidden');
    });

  });

  /*
  Auto check the SBOL radio button when SBOL file is uploaded
   */
  $('#importSBOLBtn').on('change', function() {
    $("#specification-sbol").prop("checked", true).change(); //trigger change
    sbolFile = this.files[0];
  });

  /*
  Enable Next button when a radio selection is made
   */
  $('input[type=radio][name=spec-method]').change(function() {
    $("#nextBtn").attr("disabled", false);
  });

  /*
   Next button shows the step 2 content
   depending on user selection
   */
  $("#nextBtn").click(async function(){
    $('#sbolSpinner').removeClass('hidden'); // show spinner

    let specMethod = $("input[name='spec-method']:checked").val();
    if (specMethod === 'goldbar'){
      showGoldBarStepTwo();
    }

    if(specMethod === 'sbol'){
      if(!sbolFile){
        alert('No file uploaded!');
        resetStepOne();
      }
      await processSBOL(sbolFile);
      showSBOLStepTwo();
    }

    $('#step1-content').addClass('hidden');
  });

  /*
  Back button & Constellation on navbar goes back to step 1 and clears everything
   */
  $("#backBtn").click(function(){
    resetAll();
  });

  $("#navbarBrand").click(function(){
    resetAll();
  });

  function resetAll(){
    resetStepOne();
    resetStepTwo();
    $('#step1-content').removeClass('hidden'); //show step 1
  }

  function resetStepTwo(){
    resetDiagram();
    displayDesigns(editors, '');
    $('#goldbarSpinner').addClass('hidden');
    $("#exportSBOLBtn").addClass('hidden');
    $('#step2-content').addClass('hidden');
    $('#graph-designs-row').addClass('hidden');
    $('#spec-categories-row-0').addClass('hidden');
    $('#goldbar-parameters').addClass('hidden');
    $('#goldbar-btns').addClass('hidden');
  }

});

function resetStepOne(){
  $("#importSBOLBtn").val("");
  $("#nextBtn").attr("disabled", true);
  $('#sbolSpinner').addClass('hidden');
  $("#specification-sbol").prop("checked", false);
  $("#specification-goldbar").prop("checked", false);
}

function showSBOLStepTwo(){
  $('#step2-content').removeClass('hidden');
  $('#graph-designs-col').removeClass('hidden'); //show only graph and designs
}

function showGoldBarStepTwo(){
  $('#step2-content').removeClass('hidden');
  $('#graph-designs-row').removeClass('hidden');
  $('#spec-categories-row-0').removeClass('hidden');
  $('#goldbar-parameters').removeClass('hidden');
  $('#goldbar-btns').removeClass('hidden');
}

function downloadSBOL(text, filename) {
  let element = document.createElement('a');
  element.setAttribute('href', 'data:application/xml,' + encodeURIComponent(text));
  element.setAttribute('download', filename);
  element.style.display = 'none';
  document.body.appendChild(element);
  element.click();
  document.body.removeChild(element);
}

