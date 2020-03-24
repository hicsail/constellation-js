/* eslint-disable no-unused-vars */
'use strict';

// noinspection JSUnusedLocalSymbols
const deepEqualInAnyOrder = require('deep-equal-in-any-order');
const chai = require('chai');
chai.use(deepEqualInAnyOrder);
const { expect } = chai;
// noinspection JSUnusedLocalSymbols
const graph = require('../lib/graphDataOnNodes');
// noinspection JSUnusedLocalSymbols
const imparse = require('imparse');

const edge = require('../lib/graphDataOnEdges');

const stateGraph = {
  "527315f6-f8a3-4951-9e15-e12250c63476": {
    "id": "527315f6-f8a3-4951-9e15-e12250c63476",
    "text": "root",
    "type": "root",
    "edges": [
      {
        "src": "527315f6-f8a3-4951-9e15-e12250c63476",
        "dest": "ec96e2b7-6afc-449a-b2b1-fb7d746f123a",
        "component": "epsilon",
        "type": "epsilon",
        "text": "epsilon"
      },
      {
        "src": "527315f6-f8a3-4951-9e15-e12250c63476",
        "dest": "85521da2-0424-43b8-ab2e-7e1ceaf0a8cf",
        "component": "epsilon",
        "type": "epsilon",
        "text": "epsilon"
      }
    ],
    "operator": [
      "Or",
      "OneOrMore"
    ]
  },
  "85521da2-0424-43b8-ab2e-7e1ceaf0a8cf": {
    "id": "85521da2-0424-43b8-ab2e-7e1ceaf0a8cf",
    "text": "promoter.head",
    "type": "epsilon",
    "edges": [
      {
        "src": "85521da2-0424-43b8-ab2e-7e1ceaf0a8cf",
        "dest": "7fb1be63-a87e-47e1-b43c-ae86f5251795",
        "component": {
          "promoter": [
            "BBa_R0040",
            "BBa_J23100"
          ]
        },
        "type": "atom",
        "text": "promoter"
      }
    ],
    "operator": []
  },
  "7fb1be63-a87e-47e1-b43c-ae86f5251795": {
    "id": "7fb1be63-a87e-47e1-b43c-ae86f5251795",
    "text": "epsilon",
    "type": "epsilon",
    "edges": [
      {
        "src": "7fb1be63-a87e-47e1-b43c-ae86f5251795",
        "dest": "527315f6-f8a3-4951-9e15-e12250c63476",
        "component": "epsilon",
        "type": "OneOrMore",
        "text": "OrMore"
      },
      {
        "src": "7fb1be63-a87e-47e1-b43c-ae86f5251795",
        "dest": "4e925616-769f-499b-b24b-e6249de6fe74",
        "component": "epsilon",
        "type": "epsilon",
        "text": "epsilon"
      }
    ],
    "operator": []
  },
  "ec96e2b7-6afc-449a-b2b1-fb7d746f123a": {
    "id": "ec96e2b7-6afc-449a-b2b1-fb7d746f123a",
    "text": "ribosomeBindingSite.head",
    "type": "epsilon",
    "edges": [
      {
        "src": "ec96e2b7-6afc-449a-b2b1-fb7d746f123a",
        "dest": "2a4ff12b-3244-4e14-ba84-6d5db3db62a5",
        "component": {
          "ribosomeBindingSite": [
            "BBa_B0032",
            "BBa_B0034"
          ]
        },
        "type": "atom",
        "text": "ribosomeBindingSite"
      }
    ],
    "operator": []
  },
  "2a4ff12b-3244-4e14-ba84-6d5db3db62a5": {
    "id": "2a4ff12b-3244-4e14-ba84-6d5db3db62a5",
    "text": "epsilon",
    "type": "epsilon",
    "edges": [
      {
        "src": "2a4ff12b-3244-4e14-ba84-6d5db3db62a5",
        "dest": "527315f6-f8a3-4951-9e15-e12250c63476",
        "component": "epsilon",
        "type": "OneOrMore",
        "text": "OrMore"
      },
      {
        "src": "2a4ff12b-3244-4e14-ba84-6d5db3db62a5",
        "dest": "4e925616-769f-499b-b24b-e6249de6fe74",
        "component": "epsilon",
        "type": "epsilon",
        "text": "epsilon"
      }
    ],
    "operator": []
  },
  "4e925616-769f-499b-b24b-e6249de6fe74": {
    "id": "4e925616-769f-499b-b24b-e6249de6fe74",
    "text": "cds.head",
    "type": "epsilon",
    "edges": [
      {
        "src": "4e925616-769f-499b-b24b-e6249de6fe74",
        "dest": "8403bf0e-ff09-428d-a1e9-5af2084f8a07",
        "component": {
          "cds": [
            "BBa_E0040",
            "BBa_E1010"
          ]
        },
        "type": "atom",
        "text": "cds"
      },
      {
        "src": "4e925616-769f-499b-b24b-e6249de6fe74",
        "dest": "68f81394-b78a-483c-9020-31fa621cc3fe",
        "component": "epsilon",
        "type": "epsilon",
        "text": "epsilon"
      }
    ],
    "operator": [
      "ZeroOrMore",
      "Then"
    ]
  },
  "8403bf0e-ff09-428d-a1e9-5af2084f8a07": {
    "id": "8403bf0e-ff09-428d-a1e9-5af2084f8a07",
    "text": "epsilon",
    "type": "epsilon",
    "edges": [
      {
        "src": "8403bf0e-ff09-428d-a1e9-5af2084f8a07",
        "dest": "4e925616-769f-499b-b24b-e6249de6fe74",
        "component": "epsilon",
        "type": "ZeroOrMore",
        "text": "OrMore"
      }
    ],
    "operator": []
  },
  "68f81394-b78a-483c-9020-31fa621cc3fe": {
    "id": "68f81394-b78a-483c-9020-31fa621cc3fe",
    "text": "epsilon",
    "type": "epsilon",
    "edges": [
      {
        "src": "68f81394-b78a-483c-9020-31fa621cc3fe",
        "dest": "0e558d16-459f-485d-9492-fecece65779a",
        "component": "epsilon",
        "type": "epsilon",
        "text": "epsilon"
      }
    ],
    "operator": []
  },
  "0e558d16-459f-485d-9492-fecece65779a": {
    "id": "0e558d16-459f-485d-9492-fecece65779a",
    "text": "terminator.head",
    "type": "epsilon",
    "edges": [
      {
        "src": "0e558d16-459f-485d-9492-fecece65779a",
        "dest": "a8809dcc-4bbd-4e68-b04f-2456ac00c1a0",
        "component": {
          "terminator": [
            "BBa_B0010"
          ]
        },
        "type": "atom",
        "text": "terminator"
      }
    ],
    "operator": [
      "Then"
    ]
  },
  "a8809dcc-4bbd-4e68-b04f-2456ac00c1a0": {
    "id": "a8809dcc-4bbd-4e68-b04f-2456ac00c1a0",
    "text": "accept",
    "type": "accept",
    "edges": [],
    "operator": []
  }
};

const root = '527315f6-f8a3-4951-9e15-e12250c63476';
const allPaths = [
  [
    {
      "src": "527315f6-f8a3-4951-9e15-e12250c63476",
      "dest": "7fb1be63-a87e-47e1-b43c-ae86f5251795",
      "component": {
        "promoter": [
          "BBa_R0040",
          "BBa_J23100"
        ]
      },
      "type": "atom",
      "text": "promoter"
    },
    {
      "src": "4e925616-769f-499b-b24b-e6249de6fe74",
      "dest": "8403bf0e-ff09-428d-a1e9-5af2084f8a07",
      "component": {
        "cds": [
          "BBa_E0040",
          "BBa_E1010"
        ]
      },
      "type": "atom",
      "text": "cds"
    },
    {
      "src": "0e558d16-459f-485d-9492-fecece65779a",
      "dest": "a8809dcc-4bbd-4e68-b04f-2456ac00c1a0",
      "component": {
        "terminator": [
          "BBa_B0010"
        ]
      },
      "type": "atom",
      "text": "terminator"
    }
  ],
  [
    {
      "src": "527315f6-f8a3-4951-9e15-e12250c63476",
      "dest": "7fb1be63-a87e-47e1-b43c-ae86f5251795",
      "component": {
        "promoter": [
          "BBa_R0040",
          "BBa_J23100"
        ]
      },
      "type": "atom",
      "text": "promoter"
    },
    {
      "src": "0e558d16-459f-485d-9492-fecece65779a",
      "dest": "a8809dcc-4bbd-4e68-b04f-2456ac00c1a0",
      "component": {
        "terminator": [
          "BBa_B0010"
        ]
      },
      "type": "atom",
      "text": "terminator"
    }
  ],
  [
    {
      "src": "527315f6-f8a3-4951-9e15-e12250c63476",
      "dest": "2a4ff12b-3244-4e14-ba84-6d5db3db62a5",
      "component": {
        "ribosomeBindingSite": [
          "BBa_B0032",
          "BBa_B0034"
        ]
      },
      "type": "atom",
      "text": "ribosomeBindingSite"
    },
    {
      "src": "4e925616-769f-499b-b24b-e6249de6fe74",
      "dest": "8403bf0e-ff09-428d-a1e9-5af2084f8a07",
      "component": {
        "cds": [
          "BBa_E0040",
          "BBa_E1010"
        ]
      },
      "type": "atom",
      "text": "cds"
    },
    {
      "src": "0e558d16-459f-485d-9492-fecece65779a",
      "dest": "a8809dcc-4bbd-4e68-b04f-2456ac00c1a0",
      "component": {
        "terminator": [
          "BBa_B0010"
        ]
      },
      "type": "atom",
      "text": "terminator"
    }
  ],
  [
    {
      "src": "527315f6-f8a3-4951-9e15-e12250c63476",
      "dest": "2a4ff12b-3244-4e14-ba84-6d5db3db62a5",
      "component": {
        "ribosomeBindingSite": [
          "BBa_B0032",
          "BBa_B0034"
        ]
      },
      "type": "atom",
      "text": "ribosomeBindingSite"
    },
    {
      "src": "0e558d16-459f-485d-9492-fecece65779a",
      "dest": "a8809dcc-4bbd-4e68-b04f-2456ac00c1a0",
      "component": {
        "terminator": [
          "BBa_B0010"
        ]
      },
      "type": "atom",
      "text": "terminator"
    }
  ]
];

describe('Graph tests', function () {
  it('test', function () {
    expect(edge.enumeratePaths(root, stateGraph, 0)).to.deep.equalInAnyOrder(allPaths);
  });

});
