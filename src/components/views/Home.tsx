//COMMENT :: External modules/libraries
import { MouseEvent, DragEvent, useCallback, useRef, 
  useState, 
  useEffect
} from 'react';
import ReactFlow, {
  Node, ReactFlowProvider, useReactFlow, Background, BackgroundVariant, 
  useStoreApi, MarkerType, useNodesState, useEdgesState, addEdge, Edge, 
  Connection, MiniMap, Controls,
} from 'reactflow';
import { useParams } from 'react-router-dom';
import { shallow } from 'zustand/shallow';
//COMMENT :: Internal modules UI
import { Sidebar, SimpleNode, GroupNode, SimpleOutputNode, SelectedNodesToolbar 
} from '../ui';
//COMMENT :: Internal modules HELPERS
import { nodes as initialNodes, edges as initialEdges, 
  sortNodes, getId, getNodePositionInsideParent, createOutputNode,
  generateMessage, useUpdateNodesExecute, useUpdateNodesExeCountAndOuput, 
  updateClassNameOrPosition, updateClassNameOrPositionInsideParent,
  canRunOnNodeDrag
} from '../../helpers';
import {GROUP_NODE, EXTENT_PARENT} from '../../helpers/constants';
import { useWebSocketStore, WebSocketState, createSession} from '../../helpers/websocket';
import { createInitialElements, createJSON, updateNotebook } from '../../helpers/utils';
//COMMENT :: Styles
import 'reactflow/dist/style.css';
import '@reactflow/node-resizer/dist/style.css';
import '../../styles/views/Home.css';
import axios from 'axios';
import { NotebookPUT } from '../../helpers/types';


//INFO :: main code
function DynamicGrouping() {
  const wrapperRef = useRef<HTMLDivElement>(null);
  const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges);
  const onConnect = useCallback((edge: Edge | Connection) => setEdges((eds) => addEdge(edge, eds)), [setEdges]);
  const { project, getIntersectingNodes } = useReactFlow();
  const store = useStoreApi();
  const path = useParams()["*"];
  const token = 'e903b5bcd0c78e7867a664d49bd16ed3e083ac5a7b3adff9';
  const isMac = navigator?.platform.toUpperCase().indexOf('MAC') >= 0
  // other 
  const [webSocketMap, setWebSocketMap] = useState<{ [id: string]: WebSocket }>({}); // variable -> executeCode, secondUseEffect, function -> onDrop
  const { cellIdToMsgId, setCellIdToMsgId,
    latestExecutionCount, setLatestExecutionOutput, 
    latestExecutionOutput, setLatestExecutionCount, 
  } = useWebSocketStore(selector, shallow);

  const saveNotebook = () => {
    const notebookData: NotebookPUT = createJSON(nodes, edges);
    updateNotebook(token, notebookData, path);
  }

  //INFO :: useEffect -> update execution count and output of nodes
  useUpdateNodesExeCountAndOuput({latestExecutionCount, latestExecutionOutput}, cellIdToMsgId);
  //INFO :: useEffect -> update the execute function
  useUpdateNodesExecute({webSocketMap}, nodes, executeCode);

  // on initial render, load the notebook
  //TODO: outsource
  useEffect(() => {
    axios.defaults.headers.common['Authorization'] = `Bearer ${token}`
    axios.get(`http://localhost:8888/api/contents/${path}`).then((res) => {
      const notebookData = res.data
      const { initialNodes, initialEdges } = createInitialElements(notebookData.content.cells);
      // add the execute function to each node's data if node is not a group node. For each group node, start a websocket connection
      var websocketNumber = 0;
      initialNodes.forEach( async (node) => { 
        if (node.type !== GROUP_NODE) node.data.execute = executeCode;
        else {
          websocketNumber++;
          const newWebSocket = await createSession(websocketNumber, path, token, setLatestExecutionOutput, setLatestExecutionCount);
          setWebSocketMap((prevMap) => ({ ...prevMap, [node?.id]: newWebSocket }));
          node.data = {
            ...node.data,
            ws: newWebSocket
          }
        }
      });
      setNodes(initialNodes);
      setEdges(initialEdges);
    });
  }, []);

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 's' && (isMac ? e.metaKey : e.ctrlKey)) {
        e.preventDefault();
        saveNotebook();
      }
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [nodes, edges]);


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

  const onDrop = async (event: DragEvent) => {
    event.preventDefault();
    if (wrapperRef.current) {
      const wrapperBounds = wrapperRef.current.getBoundingClientRect();
      console.log("wrapperBounds: ", wrapperBounds);
      const type = event.dataTransfer.getData('application/reactflow');
      let position = project({ x: event.clientX - wrapperBounds.x - 20, y: event.clientY - wrapperBounds.top - 20 });
      console.log("wrapperBounds.x: ", wrapperBounds.x);
      console.log("wrapperBounds.top: ", wrapperBounds.top);
      const nodeStyle = type === GROUP_NODE ? { width: 800, height: 500 } : undefined; // TODO - change to not fixed value


      const intersections = getIntersectingNodes({
        x: position.x,
        y: position.y,
        width: 40, // TODO - change to not fixed value
        height: 40,
      }).filter((n) => n.type === GROUP_NODE);
      const groupNode = intersections[0];

      const newNode: Node = {
        id: getId(),
        type,
        position,
        data: {},
        style: nodeStyle,
      };

      // in case we drop a group, create a new websocket connection
      if (type === GROUP_NODE) {
        const websockerNumber = Object.keys(webSocketMap).length + 1;
        const newWebSocket = await createSession(websockerNumber, path, token, setLatestExecutionOutput, setLatestExecutionCount);
        // BUG - why it is executed twice if we do console.log?
        // console.log("latestExecutionCount: ", latestExecutionCount)
        // console.log("latestExecutionOutput: ", latestExecutionOutput)
        // add the websocket to the id -> websocket map
        setWebSocketMap((prevMap) => ({ ...prevMap, [newNode?.id]: newWebSocket }));
        newNode.data = {
          ...newNode.data,
          ws: newWebSocket
        };
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
        newNode.extent = groupNode ? EXTENT_PARENT : undefined;
      }

      if (type !== GROUP_NODE) {
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
      const intersections = getIntersectingNodes(node).filter((n) => n.type === GROUP_NODE);
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
      const intersections = getIntersectingNodes(node).filter((n) => n.type === GROUP_NODE);
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