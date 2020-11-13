const LINKDISTANCE = 25;
const CHARGESTRENGTH = -400;
const MAXDISTANCE = 100;
const IMAGESIZE = 30;
const RADIUS = 7;
const INTERMEDIATE = 'intermediate';
const REPRESENTATION = 'EDGE';

let nodePointer, linkPointer, simulationPointer, svgPointer, circlePointer, imagePointer, textPointer, width, height, sbolDoc;
let sbolFiles = [];
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
        nodes.push({id, type: INTERMEDIATE, text: edge.text, component: edge.component, orientation:edge.orientation});
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
  // Add g component
  nodePointer = svgPointer.selectAll('.node')
    .data(nodes)
    .enter()
    .append('g')
    .attr('class', 'node');

  // Add tooltip for node representation
  textPointer = nodePointer.filter( function(d) { return d.type !== INTERMEDIATE} )
    .append('text')
    .text( function(d) {return d.operator + ',' + d.id; })
    .attr('opacity', 0)
    .attr('dx', '20px')
    .attr('dy', '4px')
    .style('fill', 'rgb(100,)')
    .style('font-family', 'Montserrat');


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
          switch (Object.keys(d.component)[0]) {
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
              return './sbol/' + Object.keys(d.component)[0] + '.svg';
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
    let cenX = imagePointer.node(d).getBBox().width / 2;
    let cenY = imagePointer.node(d).getBBox().height / 2;
    if(d.orientation === "ReverseComp") {
      return `translate(${d.x}, ${d.y}) rotate(180, ${cenX}, ${cenY})`;
    }
    return `translate(${d.x}, ${d.y})`;
  });

  // update tooltip positions for node representation
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
/*  BROWSER  */
/* * * * * * */
$(document).ready(function() {


  $('#playground').on('click', function() {
    $('#demo-space').addClass('hidden');
    $('#step1-content').removeClass('hidden');
  });


  const THEME = 'ambiance';
  let combineMethod, tolerance;

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

  let dropArea = document.getElementById('sbol-drop-area');
  ['dragenter', 'dragover', 'dragleave', 'drop'].forEach(eventName => {
    dropArea.addEventListener(eventName, preventDefaults, false)
  })
  dropArea.addEventListener('drop', handleDrop, false)
  dropArea.addEventListener('dragleave', sbolDragLeave, false)
  dropArea.addEventListener('dragover', sbolDragOver, false)

  $('#and0-option').on('click', function() {
    document.getElementById('designName').value = "cello-AND-example";
    editors.specEditor.setValue(and0GOLDBAR);
    editors.catEditor.setValue(JSON.stringify(celloCategories));
  });

  $('#and1-option-norb').on('click', function() {
    document.getElementById('designName').value = "cello-no-roadblocking-example";
    editors.specEditor.setValue(and1GOLDBAR_NORB);
    editors.catEditor.setValue(JSON.stringify(celloCategories));
  });

  $('#and1-option-rb').on('click', function() {
    document.getElementById('designName').value = "cello-roadblocking-example";
    editors.specEditor.setValue(and1GOLDBAR_RB);
    editors.catEditor.setValue(JSON.stringify(celloCategories));
  });

  $('#and2-option').on('click', function() {
    document.getElementById('designName').value = "cello-AND-example2";
    editors.specEditor.setValue(and2GOLDBAR);
    editors.catEditor.setValue(JSON.stringify(celloCategories));
  });

  $('#merge-option').on('click', function() {
    document.getElementById('designName').value = "rebeccamycin-example";
    editors.specEditor.setValue(rebeccamycinGOLDBAR);
    editors.catEditor.setValue(JSON.stringify(biosynthesisCategories));
  });

  $('#reverse-option').on('click', function() {
    document.getElementById('designName').value = "reverse-complement-example";
    editors.specEditor.setValue(reverseGOLDBAR);
    editors.catEditor.setValue(JSON.stringify(celloCategories));
  });

  let debugCats = '{"promoter": {"promoter": ["BBa_R0040", "BBa_J23100"]},\n ' +
    '"ribosomeBindingSite": {"ribosomeBindingSite": ["BBa_B0032", "BBa_B0034"]}, \n' +
    '"cds": {"cds": ["BBa_E0040", "BBa_E1010"]},\n"nonCodingRna": {"nonCodingRna": ["BBa_F0010"]},\n' +
    '"terminator": {"terminator": ["BBa_B0010"]}}'

  $('#oOM-option').on('click', function() {
    document.getElementById('designName').value = "one-or-more-exampleI";
    editors.specEditor.setValue('one-or-more (promoter or ribosomeBindingSite) then (zero-or-more cds) then terminator');
    editors.catEditor.setValue(debugCats);
  });

  $('#oOM-option2').on('click', function() {
    document.getElementById('designName').value = "one-or-more-exampleII";
    editors.specEditor.setValue('one-or-more (promoter then zero-or-one(ribosomeBindingSite) then cds then terminator)');
    editors.catEditor.setValue(debugCats);
  });

  $('#and').on('click', function() {
    document.getElementById('operationMenu').innerText = 'And';
    combineMethod = 'And';
  });

  $('#merge').on('click', function() {
    document.getElementById('operationMenu').innerText = 'Merge';
    combineMethod = 'Merge';
  });

  $('#zero').on('click', function() {
    document.getElementById('toleranceMenu').innerText = 0;
    tolerance = 0;
  });

  $('#one').on('click', function() {
    document.getElementById('toleranceMenu').innerText = 1;
    tolerance = 1;
  });

  $('#two').on('click', function() {
    document.getElementById('toleranceMenu').innerText = 2;
    tolerance = 2;
  });


  $('#exportSBOLBtn').on('click', function() {
    downloadSBOL(sbolDoc, 'constellation_' + designName + '_sbol.xml');
  });

  $('[data-toggle="tooltip"]').tooltip();


  $("#goldarSubmitBtn").click(function() {
    // Reset UI
    resetDiagram();
    displayDesigns(editors, '');
    $("#exportSBOLBtn").addClass('hidden');
    $('#spinner').removeClass('hidden'); // show spinner

    let numDesigns, maxCycles, andTolerance, mergeTolerance;

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
        if ('exceedsDesigns' in data.messages) {
          // show the tooltip and give it the warning message
          $('#designWarning').removeClass('hidden');
          $("#designWarning").attr("data-original-title", data.messages.exceedsDesigns);
        } else {
          // hide the tooltip
          $('#designWarning').addClass('hidden');
        }

        $("#exportSBOLBtn").removeClass('hidden'); //show export button
        if ('hasMerge' in data.messages) {
          $("#exportSBOLBtn").attr('disabled', true);
          $("#sbolIcon").attr('data-original-title', data.messages.hasMerge);
        } else if ('hasAnd' in data.messages) {
          $("#exportSBOLBtn").attr('disabled', true);
          $("#sbolIcon").attr('data-original-title', data.messages.hasAnd);
        } else {
          $("#exportSBOLBtn").attr('disabled', false);
          $("#sbolIcon").attr('data-original-title', 'Export design as SBOL');
        }
        displayDesigns(editors, JSON.stringify(data.designs, null, "\t"));
      }

      // if no numDesigns provided
      if (numDesigns === '') {
        document.getElementById('numDesigns').value = 20;
      }
      // if no maxCycles provided
      if (maxCycles === '') {
        document.getElementById('maxCycles').value = 0;
      }
      // if no andTolerance provided
      if (andTolerance === '') {
        document.getElementById('andTolerance').value = 0;
      }
      // if no mergeTolerance provided
      if (mergeTolerance === '') {
        document.getElementById('mergeTolerance').value = 0;
      }
      sbolDoc = data.sbol;

      $("#spinner").addClass('hidden');

    }).fail((response) => {
      alert(response.responseText);
      $("#spinner").addClass('hidden');
    });

  });

  /*
  Update list of sbol files when upload button is clicked or when file is dragged and dropped
   */
  $('#importSBOLBtn').on('change', function() {
    $("#specification-sbol").prop("checked", true).change(); //trigger change
    if (this.files) {
      updateSBOLFiles(this.files);
    }
  });

  $('#clearSBOLBtn').click(function () {
    clearAllFiles();
  })

  $("#SBOLSubmitBtn").click(async function(){
    resetDiagram();
    displayDesigns(editors, '');
    if(sbolFiles.length === 0) {
      alert('No file uploaded!');
      resetStepOne();
      return;
    }
    await processSBOL(editors, sbolFiles, combineMethod, tolerance);
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
      showSBOLStepTwo();
    }

    $('#step1-content').addClass('hidden');
  });

  /*
  Back button & Constellation on navbar goes back to step 1 and clears everything
   */
  $("#backBtn").click(function(){
    resetAll(editors);
  });

  $("#navbarBrand").click(function(){
    resetAll(editors);
    $('#demo-space').removeClass('hidden');
    $('#step1-content').addClass('hidden');
  });

});






/* * * * * * */
/*  CLEANUP  */
/* * * * * * */

/**
 * Removes all uploaded SBOL files
 */
function clearAllFiles(){
  sbolFiles = [];
  $('#sbol-filenames').empty();
  $("#operationMenu").attr("disabled", true);
  $("#toleranceMenu").attr("disabled", true);
}

function resetDiagram() {
  if(simulationPointer){
    simulationPointer.stop();
  }
  d3.selectAll('svg').remove();
}

function resetAll(editors){
  resetStepOne();
  resetStepTwo(editors);
  $('#step1-content').removeClass('hidden'); //show step 1
}

function resetStepOne(){
  $("#importSBOLBtn").val("");
  $("#nextBtn").attr("disabled", true);
  $('#sbolSpinner').addClass('hidden');
  $("#specification-sbol").prop("checked", false);
  $("#specification-goldbar").prop("checked", false);
}

function resetStepTwo(editors){
  $('#designName').val('');
  resetDiagram();
  clearAllFiles();
  //clear CodeMirror editors
  Object.values(editors).forEach(function(cm) {
    cm.setValue("");
    cm.clearHistory();
  });

  $('#spinner').addClass('hidden');
  $("#exportSBOLBtn").addClass('hidden');
  $('#step2-content').addClass('hidden');
  $('#graph-designs-row').addClass('hidden');
  $('#spec-categories-row-0').addClass('hidden');
  $('#goldbar-parameters').addClass('hidden');
  $('#sbol-parameters').addClass('hidden');
  $('#goldarSubmitBtn').addClass('hidden');
  $('#SBOLSubmitBtn').addClass('hidden');
  $('#goldbar-btns').addClass('hidden');
  $('#designWarning').addClass('hidden');
}







/* * * * * * */
/*  STEP TWO  */
/* * * * * * */

function showSBOLStepTwo(){
  $('#step2-content').removeClass('hidden');
  $('#sbol-parameters').removeClass('hidden');
  $('#graph-designs-row').removeClass('hidden'); //show only graph and designs
  $('#goldbar-btns').removeClass('hidden');
  $('#SBOLSubmitBtn').removeClass('hidden');

}

function showGoldBarStepTwo(){
  $('#step2-content').removeClass('hidden');
  $('#graph-designs-row').removeClass('hidden');
  $('#spec-categories-row-0').removeClass('hidden');
  $('#goldbar-parameters').removeClass('hidden');
  $('#goldbar-btns').removeClass('hidden');
  $('#goldarSubmitBtn').removeClass('hidden');
}









/* * * * * * */
/*    SBOL   */
/* * * * * * */

function downloadSBOL(text, filename) {
  let element = document.createElement('a');
  element.setAttribute('href', 'data:application/xml,' + encodeURIComponent(text));
  element.setAttribute('download', filename);
  element.style.display = 'none';
  document.body.appendChild(element);
  element.click();
  document.body.removeChild(element);
}

function preventDefaults (e) {
  e.preventDefault()
  e.stopPropagation()
}

function sbolDragOver(ev) {
  ev.stopPropagation();
  ev.preventDefault();
  ev.dataTransfer.dropEffect = 'copy';
  $('#sbol-drop-area').removeClass('dragdefault');
  $('#sbol-drop-area').addClass('dragenter');
}

function sbolDragLeave() {
  $('#sbol-drop-area').removeClass('dragenter');
}


function handleDrop(ev) {
  ev.preventDefault();
  $('#sbol-drop-area').removeClass('dragenter');
  if (ev.dataTransfer.files.length >= 10) {
    alert('Error: Too many files');
    return;
  }
  if (!ev.dataTransfer.files[0].name.endsWith(".sbol") && !ev.dataTransfer.files[0].name.endsWith(".xml")) {
    alert('Error: Invalid file type');
    return;
  }
  let dt = ev.dataTransfer
  let files = dt.files
  updateSBOLFiles(files)
}

function updateSBOLFiles(files) {
  if (sbolFiles.length >= 10) {
    alert('You have uploaded the maximum number of files.');
  }
  for (let file of files) {
    sbolFiles.push(file);
    $('#sbol-filenames').append(file.name + '<br>');
  }
  if (sbolFiles.length > 1) {
    $("#operationMenu").attr("disabled", false);
    $("#toleranceMenu").attr("disabled", false);
  }
}

function processSBOLFile(file) {
  return new Promise((resolve) => {
    // Parse file into XML object
    let parser = new DOMParser();
    let reader = new FileReader();
    reader.readAsText(file, "UTF-8");
    reader.onload = function (evt) {
      let data = evt.target.result;
      // let data = parser.parseFromString(evt.target.result, "application/xml");
      resolve(data);
    };
  });
}

async function processSBOL(editors, files, combineMethod, tolerance) {
  $("#spinner").removeClass('hidden');

  //read SBOL file
  let sbolXMLs = [];
  for (let i = 0; i < files.length; i++) {
    let file = files[i];
    let xmlString = await processSBOLFile(file);
    sbolXMLs.push(xmlString);
  }

  let data = {
    sbol: sbolXMLs,
    combineMethod: combineMethod,
    tolerance: tolerance,
    representation: REPRESENTATION
  }
  // Parse SBOL and display results
  $.ajax({
    url: 'http://localhost:8082/importSBOL',
    type: 'POST',
    data: JSON.stringify(data),
    contentType: "application/json; charset=utf-8",
    dataType: "json",
    processData: false,
    success: function(data){
      // data = JSON.parse(data);
      displayDiagram(data.stateGraph);
      // Undefined design
      if (String(data.designs).includes('is not defined')) {
        displayDesigns(editors, data.designs);
      } else {
        displayDesigns(editors, JSON.stringify(data.designs, null, "\t"));
      }
      $("#spinner").addClass('hidden');
    }
  })
    .fail((response) => {
      alert(response.responseText);
      $("#spinner").addClass('hidden');
    });
};

