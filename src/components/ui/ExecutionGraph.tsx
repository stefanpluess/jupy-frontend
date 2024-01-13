import React, { useCallback, useEffect } from 'react';
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
import useExecutionStore from "../../helpers/executionStore";
import { ExecInfo } from "../../config/types";
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { 
  faArrowsDownToLine, 
  faArrowsUpToLine, 
  faMagnifyingGlassMinus, 
  faMagnifyingGlassPlus 
} from '@fortawesome/free-solid-svg-icons';
import Thanos_gif from '../../../public/thanos.gif'; // https://giphy.com/stickers/marvelstudios-oh-thanos-snapped-TfjfIgE9YUgdyz8V1J

// constants and parameters
const nodeTypes = { exeGraphNode: ExecutionGraphNode };
const edgeTypes = { ExecutionGraphEdge: ExecutionGraphEdge };
const proOptions = { hideAttribution: true };
const PADDING = 10;
const MIN_ZOOM = 1;
const MAX_ZOOM = 1.5;
interface ExecutionGraphProps {
  id: string;
}
  
const ExecutionGraph = ({ id }: ExecutionGraphProps) => {
    const { zoomIn, zoomOut, fitView} = useReactFlow();
    const historyPerNode = useExecutionStore((state) => state.historyPerNode[id]); // can be undefined
    const { nodes: initNodes, edges: initEdges, lastY } = createNodesAndEdges(historyPerNode);
    // execute fitView on historyPerNode change
    useEffect(() => {
      fitView({
        padding: PADDING,
        minZoom: MIN_ZOOM,
        maxZoom: MAX_ZOOM,
        nodes: getLastNode(),
        duration: 800
      });
    } , [fitView, initNodes]);

    const getLastNode = useCallback(() => {
      return initNodes.length ? [{ id: initNodes[initNodes.length - 1].id }] : [];
    }, [historyPerNode, initNodes]);

    const jumpToBottom = useCallback(() => {
      fitView({ 
        padding: PADDING,
        minZoom: MIN_ZOOM,
        maxZoom: MAX_ZOOM,
        nodes: getLastNode(),
        duration: 800
        });
    }, [fitView, historyPerNode, initNodes]);

    const jumpToTop = useCallback(() => {
      fitView({ 
        padding: PADDING,
        minZoom: MIN_ZOOM,
        maxZoom: MAX_ZOOM,
        // go to the first node
        nodes: initNodes.length ? [{ id: initNodes[0].id }] : [],
        duration: 800
        });
    }, [fitView, historyPerNode, initNodes]);

    return (
        <ReactFlow
            className = "exegraph-flow"
            nodes={initNodes}
            edges={initEdges}
            nodeTypes={nodeTypes}
            edgeTypes={edgeTypes}
            // COMMENT :: view setting upon initial showing of the graph
            fitView = {true}
            fitViewOptions = {{
              padding: PADDING,
              minZoom: MIN_ZOOM,
              maxZoom: MAX_ZOOM,
              // always show the last node from initNodes
              nodes: getLastNode()
            }}
            // COMMENT :: general flow settings
            // left corner: [size to the left, size to the top], right corner: [size to the right, size to the bottom]
            translateExtent = {[[-100, -160], [100, lastY+160]]}
            nodeExtent = {[[-100, -160], [100, lastY+160]]}
            minZoom={MIN_ZOOM}
            maxZoom={MAX_ZOOM}
            proOptions={proOptions}
            preventScrolling = {false}
            panOnScroll = {true}
            nodesDraggable = {false}
            nodesConnectable={false}
            zoomOnDoubleClick={false}
            deleteKeyCode={null}
        >
            {historyPerNode && 
              <Panel
                className='exegraph-flow-panel'
                position='top-right'>
                  <button
                    title="Jump to the top"
                    className='exegraph-flow-button nodrag' 
                    onClick={jumpToTop}>
                      <FontAwesomeIcon className='exegraph-flow-button-icon' icon={faArrowsUpToLine} />
                  </button>
                  <button
                    title="Zoom in"
                    className='exegraph-flow-button nodrag' 
                    onClick={() => zoomIn({ duration: 50 })}>
                      <FontAwesomeIcon className='exegraph-flow-button-icon' icon={faMagnifyingGlassPlus} />
                  </button>
                  <button
                    title="Zoom out"
                    className='exegraph-flow-button nodrag' 
                    onClick={() => zoomOut({ duration: 50 })}>
                      <FontAwesomeIcon className='exegraph-flow-button-icon' icon={faMagnifyingGlassMinus} />
                  </button>
                  <button
                    title="Jump to the bottom"
                    className='exegraph-flow-button nodrag' 
                    onClick={jumpToBottom}>
                      <FontAwesomeIcon className='exegraph-flow-button-icon' icon={faArrowsDownToLine} />
                  </button>
              </Panel>
            }
            {/* display when execution graph is empty */}
            {historyPerNode === undefined &&
              <Panel
                className='exegraph-flow-panel-empty'
                position='top-center'>
                  <div className="exegraph-flow-panel-empty-text">
                    <img src={Thanos_gif} alt="" style={{ width: '40%', height: 'auto' }} />
                    <p>Execution Graph is empty, execute something!</p>
                  </div>
              </Panel>
            }
        </ReactFlow>
    );
  };

  const createNodes = (historyPerNode: ExecInfo[]) => {
    if (!historyPerNode) {
      return { nodes: [], lastY: 0 };
    }
  
    let nodes: Node[] = [];
    let y = 0;
    for (let i = 0; i < historyPerNode.length; i++) {
      const { node_id, execution_count, type, code } = historyPerNode[i];
      nodes.push({
        id: `${i}`,
        data: {
          node_id,
          execution_count,
          type,
          code
        },
        position: { x: 0, y },
        type: 'exeGraphNode',
      });
      y += 50;
    }
    return { nodes, lastY: y };
  };
  
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

  const createNodesAndEdges = (historyPerNode: ExecInfo[]) => {
    const { nodes, lastY } = createNodes(historyPerNode);
    const edges = createEdges(nodes);
    return { nodes, edges, lastY };
  };

export default ExecutionGraph;