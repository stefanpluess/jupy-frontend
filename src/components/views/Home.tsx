//COMMENT :: External modules/libraries
import { MouseEvent, DragEvent, useCallback, useRef, 
  useState, useEffect 
} from 'react';
import ReactFlow, {
  Node, ReactFlowProvider, useReactFlow, Background, BackgroundVariant, 
  useStoreApi, MarkerType, useNodesState, useEdgesState, addEdge, Edge, 
  Connection, MiniMap, Controls,
} from 'reactflow';
import { shallow } from 'zustand/shallow';
//COMMENT :: Internal modules UI
import { Sidebar, SimpleNode, GroupNode, SimpleOutputNode, SelectedNodesToolbar 
} from '../ui';
//COMMENT :: Internal modules HELPERS
import { nodes as initialNodes, edges as initialEdges, 
  sortNodes, getId, getNodePositionInsideParent, createOutputNode,
  useWebSocketStore, WebSocketState, createSession, 
  generateMessage, useUpdateNodes, updateClassNameOrPosition, 
  updateClassNameOrPositionInsideParent,canRunOnNodeDrag
} from '../../helpers';
//COMMENT :: Styles
import 'reactflow/dist/style.css';
import '@reactflow/node-resizer/dist/style.css';
import '../../styles/views/Home.css';


//INFO :: main code
function DynamicGrouping() {
  const wrapperRef = useRef<HTMLDivElement>(null);
  const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges);
  const onConnect = useCallback((edge: Edge | Connection) => setEdges((eds) => addEdge(edge, eds)), [setEdges]);
  const { project, getIntersectingNodes } = useReactFlow();
  const store = useStoreApi();
  // other 
  // TODO - externalize webSocketMap?
  const [webSocketMap, setWebSocketMap] = useState<{ [id: string]: WebSocket }>({}); // variable -> executeCode, secondUseEffect, function -> onDrop
  // needed so that modules can share values and functions from useWebSocketStore
  // other version: const cellIdToMsgId = useWebSocketStore((state) => state.cellIdToMsgId);
  const { cellIdToMsgId, setCellIdToMsgId,
    latestExecutionCount, setLatestExecutionOutput, 
    latestExecutionOutput, setLatestExecutionCount, 
    } = useWebSocketStore(selector, shallow);
  // TODO - extrnalize parts of onDrop function
  // TODO - look at TODOs in the code
  // TODO - use 'group' as constant

  //INFO :: useEffect, depends on passed object
  useUpdateNodes({latestExecutionCount, latestExecutionOutput}, cellIdToMsgId);

  //INFO :: useEffect, needed so that nodes know all websockets (update the execute function)
  // TODO - const { setNodes } = useReactFlow();
  useEffect(() => {
    const newNodes = nodes.map((node) => {
      if (node.type === 'node') {
        return {
          ...node,
          data: {
            ...node.data,
            execute: executeCode
          },
        };
      } else return node;
    });
    setNodes(newNodes);
  }, [webSocketMap]);

  //INFO :: functions
  function executeCode(parent_id: string, code:string, msg_id:string, cell_id:string) {
    setCellIdToMsgId({[msg_id]: cell_id});
    // fetch the connection to execute the code on
    const ws = webSocketMap[parent_id];
    // Send code to the kernel for execution
    const message = generateMessage(msg_id, code); // imported at the top
    if (ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify(message));
    } else {
      console.log("websocket is not connected");
    }
  }

  // TODO - extrnalize parts of this function
  const onDrop = async (event: DragEvent) => {
    event.preventDefault();

    if (wrapperRef.current) {
      const wrapperBounds = wrapperRef.current.getBoundingClientRect();
      const type = event.dataTransfer.getData('application/reactflow');
      let position = project({ x: event.clientX - wrapperBounds.x - 20, y: event.clientY - wrapperBounds.top - 20 });
      const nodeStyle = type === 'group' ? { width: 800, height: 500 } : undefined; // TODO - change to not fixed value

      const intersections = getIntersectingNodes({
        x: position.x,
        y: position.y,
        width: 40,
        height: 40,
      }).filter((n) => n.type === 'group');
      const groupNode = intersections[0];

      const newNode: Node = {
        id: getId(),
        type,
        position,
        data: { label: `${type}` },
        style: nodeStyle,
      };

      // in case we drop a group, create a new websocket connection
      if (type === 'group') {
        const newWebSocket = await createSession(setLatestExecutionOutput, setLatestExecutionCount);
        // BUG - why it is executed twice if we do console.log?
        // console.log("latestExecutionCount: ", latestExecutionCount)
        // console.log("latestExecutionOutput: ", latestExecutionOutput)
        // add the websocket to the id -> websocket map
        setWebSocketMap((prevMap) => ({ ...prevMap, [newNode?.id]: newWebSocket }));
      } else {
        newNode.data = {
          ...newNode.data,
          execute: executeCode,
          executionCount: null
        };
      }

      if (groupNode) {
        // if we drop a node on a group node, we want to position the node inside the group
        newNode.position = getNodePositionInsideParent(
          {
            position,
            width: 40,
            height: 40,
          },
          groupNode
        ) ?? { x: 0, y: 0 };
        newNode.parentNode = groupNode?.id;
        newNode.extent = groupNode ? 'parent' : undefined;
      }

      if (type !== 'group') {
        const newOutputNode: Node = createOutputNode(newNode);
        const sortedNodes = store.getState().getNodes().concat(newNode).concat(newOutputNode).sort(sortNodes);
        setNodes(sortedNodes);
        const newEdge: Edge = {
          id: getId(),
          source: newNode.id,
          target: newOutputNode.id,
        };
        setEdges([...edges, newEdge]);
      } else {
        // we need to make sure that the parents are sorted before the children
        // to make sure that the children are rendered on top of the parents
        const sortedNodes = store.getState().getNodes().concat(newNode).sort(sortNodes);
        setNodes(sortedNodes);
      }
    }
  };

  //INFO :: onNodeDrag... Callbacks
  const onNodeDragStop = useCallback((_: MouseEvent, node: Node) => {
      if (!canRunOnNodeDrag(node)) {
        return;
      }
      const intersections = getIntersectingNodes(node).filter((n) => n.type === 'group');
      const groupNode = intersections[0];
      // when there is an intersection on drag stop, we want to attach the node to its new parent
      if (intersections.length && node.parentNode !== groupNode?.id) {
        const nextNodes: Node[] = store
          .getState()
          .getNodes()
          .map((n) => {
            return updateClassNameOrPositionInsideParent(n, node, groupNode);
          })
          .sort(sortNodes);
        setNodes(nextNodes);
      }
    }, [getIntersectingNodes, setNodes, store]
  );

  const onNodeDrag = useCallback(
    (_: MouseEvent, node: Node) => {
      if (!canRunOnNodeDrag(node)) {
        return;
      }
      const intersections = getIntersectingNodes(node).filter((n) => n.type === 'group');
      setNodes((nds) => {
        return nds.map((n) => {
          return updateClassNameOrPosition(n, node, intersections);
        });
      });
    }, [getIntersectingNodes, setNodes]
  );

  return (
    <div className={'wrapper'}>
      <Sidebar />
      <div className={'rfWrapper'} ref={wrapperRef}>
        <ReactFlow
          nodes={nodes}
          edges={edges}
          onEdgesChange={onEdgesChange}
          onNodesChange={onNodesChange}
          onConnect={onConnect}
          onNodeDrag={onNodeDrag}
          onNodeDragStop={onNodeDragStop}
          onDrop={onDrop}
          onDragOver={onDragOver}
          proOptions={proOptions}
          fitView
          selectNodesOnDrag={false}
          nodeTypes={nodeTypes}
          defaultEdgeOptions={defaultEdgeOptions}
          minZoom={0.2}
        >
          <Background color="#bbb" gap={50} variant={BackgroundVariant.Dots} />
          <SelectedNodesToolbar />
          <MiniMap nodeColor='#b44b9f80' maskStrokeColor='#222' nodeStrokeWidth={3} position={'top-right'} zoomable pannable />
          <Controls />
        </ReactFlow>
      </div>
    </div>
  );
}

export default function Flow() {
  return (
    <ReactFlowProvider>
      <DynamicGrouping />
    </ReactFlowProvider>
  );
}

//INFO :: configuration
const proOptions = {
  hideAttribution: true,
};

const nodeTypes = {
  node: SimpleNode,
  outputNode: SimpleOutputNode,
  group: GroupNode,
};

const defaultEdgeOptions = {
  style: {
    strokeWidth: 2,
  },
  markerEnd: {
    type: MarkerType.ArrowClosed,
  },
};

const onDragOver = (event: DragEvent) => {
  event.preventDefault();
  event.dataTransfer.dropEffect = 'move';
};

const selector = (state: WebSocketState) => ({
  latestExecutionCount: state.latestExecutionCount,
  setLatestExecutionCount: state.setLatestExecutionCount,
  latestExecutionOutput: state.latestExecutionOutput,
  setLatestExecutionOutput: state.setLatestExecutionOutput,
  cellIdToMsgId: state.cellIdToMsgId,
  setCellIdToMsgId: state.setCellIdToMsgId,
});