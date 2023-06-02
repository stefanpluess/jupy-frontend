import { Node, Edge } from 'reactflow';

const nodes: Node[] = [
  {
    id: 'group-1',
    type: 'group',
    position: {
      x: 0,
      y: 0,
    },
    data: {},
  },
  {
    id: '1',
    parentNode: 'group-1',
    type: 'node',
    position: {
      x: 35,
      y: 35,
    },
    data: { label: 'Node 1' },
    extent: 'parent',
  }
];

const edges: Edge[] = [
];

export { nodes, edges };
