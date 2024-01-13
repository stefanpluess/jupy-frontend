import React, { useCallback } from 'react';
import ReactFlow, {
  useReactFlow,
  Edge,
  Node,
  Panel,
  MarkerType,
} from 'reactflow';
import 'reactflow/dist/style.css';
import ExecutionGraphNode from './ExecutionGraphNode';
import ExecutionGraphEdge from './ExecutionGraphEdge';

const nodeTypes = { exeGraphNode: ExecutionGraphNode };
const edgeTypes = { ExecutionGraphEdge: ExecutionGraphEdge };

const defaultNodes: Node[] = [
    {
      id: '1',
      data: {
        node_id: 1,
        execution_count: 1,
        type: 'NormalExecution',
        // code?
      },
      position: { x: 0, y: 0 },
      type: 'exeGraphNode',
    },
    {
      id: '2',
      data: {
        node_id: 2,
        execution_count: 2,
        type: 'NormalExecution',
        // code?
      },
      position: { x: 0, y: 50 },
      type: 'exeGraphNode',
    },
    {
      id: '3',
      data: {
        node_id: 3,
        execution_count: 3,
        type: 'PropagateExecution',
      },
      position: { x: 0, y: 100 },
      type: 'exeGraphNode',
    },
    {
      id: '4',
      data: {
        node_id: 4,
        execution_count: 4,
        type: 'LoadParent',
      },
      position: { x: 0, y: 150 },
      type: 'exeGraphNode',
    },
    {
      id: '5',
      data: {
        node_id: 5,
        execution_count: 5,
        type: 'Export',
      },
      position: { x: 0, y: 200 },
      type: 'exeGraphNode',
    },
    {
      id: '6', // 
      data: {
        node_id: 6,
        execution_count: 6,
        type: 'NormalExecution',
        // code?
      },
      position: { x: 0, y: 250 },
      type: 'exeGraphNode',
    },
  ];

const proOptions = { hideAttribution: true };

interface ExecutionGraphProps {
  id: string;
}
  
const ExecutionGraph = ({ id }: ExecutionGraphProps) => {
    // const [nodes, setNodes, onNodesChange] = useNodesState(defaultNodes);
    // const [edges, setEdges, onEdgesChange] = useEdgesState(defaultEdges);
    // const onConnect = useCallback((params: any) => setEdges((eds) => addEdge(params, eds)), []);
    // TODO - code displaying
    // TODO - what happens when it is open and we execute a node?
    // TODO - define constants for type
    // TODO - define a function to create nodes & edges from store
    // TODO - add ZoomIn and ZoomOut buttons
    // TODO - add treeHeight slider
    // TODO - add Pan to Top button

    const { setViewport, zoomIn, zoomOut } = useReactFlow();
  
    const handleTransform = useCallback(() => {
      setViewport({ x: 0, y: 0, zoom: 1 }, { duration: 800 });
    }, [setViewport]);


    // create a function that returns defaultEdges where for each node in defaultNodes creates and edge to the next node
    const createEdges = (nodes: Node[]) => {
      let edges: Edge[] = [];
      for (let i = 0; i < nodes.length - 1; i++) {
        edges.push({
          id: `${nodes[i].id}=>${nodes[i+1].id}`,
          source: nodes[i].id,
          target: nodes[i+1].id,
          type: 'ExecutionGraphEdge',
          markerEnd: {
            type: MarkerType.ArrowClosed,
            width: 15,
            height: 15,
          },
        });
      }
      return edges;
    }

    const defaultEdges = createEdges(defaultNodes);

    return (
        <ReactFlow
            className = "exegraph-flow"
            // onNodesChange={onNodesChange}
            // onEdgesChange={onEdgesChange}
            // onConnect={onConnect}
            nodes={defaultNodes}
            edges={defaultEdges}
            nodeTypes={nodeTypes}
            edgeTypes={edgeTypes}
            preventScrolling = {false}
            panOnScroll = {true}
            fitView = {true}
            fitViewOptions = {{padding: 0, minZoom: 1, maxZoom: 1.5,
                // get the size of the group node and adjust how many nodes are shown
                // TODO
                // nodes: defaultNodes.slice(0, 3).map((node) => ({ id: node.id })),
            }}

            // TODO: this needs to be dependen on the amout of nodes we have
            // left corner: [size to the left, size to the top], right corner: [size to the right, size to the bottom]
            translateExtent = {[[-100, -10], [100, 300]]}
            nodeExtent = {[[-100, -10], [100, 300]]}
            proOptions={proOptions}
            nodesDraggable = {false}
            nodesConnectable={false}
            zoomOnDoubleClick={false}
            deleteKeyCode={null}
        >
            {/* TODO: this also needs the zoom to be defined min, max */}
            {/* <Panel position="top-right">
              <button onClick={() => zoomIn({ duration: 800 })}>zoom in</button>
              <button onClick={() => zoomOut({ duration: 800 })}>zoom out</button>
              <button onClick={handleTransform}>pan to center(0,0,1)</button>
            </Panel> */}
        </ReactFlow>
    );
  };

export default ExecutionGraph;