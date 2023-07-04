import { MouseEvent, DragEvent, useCallback, useRef, useState, useEffect } from 'react';
import ReactFlow, {
  Node,
  ReactFlowProvider,
  useReactFlow,
  Background,
  BackgroundVariant,
  useStoreApi,
  MarkerType,
  useNodesState,
  useEdgesState,
  addEdge,
  Edge,
  Connection,
  MiniMap,
  Controls,
} from 'reactflow';

import Sidebar from '../ui/Sidebar';
import SimpleNode from '../ui/SimpleNode';
import GroupNode from '../ui/GroupNode';
import SimpleOutputNode from '../ui/SimpleOutputNode';
import { nodes as initialNodes, edges as initialEdges } from '../../helpers/initial-elements';
import { sortNodes, getId, getNodePositionInsideParent, createOutputNode } from '../../helpers/utils';
import SelectedNodesToolbar from '../ui/SelectedNodesToolbar';
import { startSession, removeEscapeCodes } from '../../helpers/utils';

import 'reactflow/dist/style.css';
import '@reactflow/node-resizer/dist/style.css';

import '../../styles/views/Home.css';
import { ExecutionCount, ExecutionOutput, CellIdToMsgId, Cell } from '../../helpers/types';


const proOptions = {
  hideAttribution: true,
};

const onDragOver = (event: DragEvent) => {
  event.preventDefault();
  event.dataTransfer.dropEffect = 'move';
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


function DynamicGrouping() {
  const wrapperRef = useRef<HTMLDivElement>(null);
  const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges);
  const onConnect = useCallback((edge: Edge | Connection) => setEdges((eds) => addEdge(edge, eds)), [setEdges]);
  const { project, getIntersectingNodes } = useReactFlow();
  const store = useStoreApi();

  // --------------- ADDED BY DIEGO ---------------
  const [latestExecutionCount, setLatestExecutionCount] = useState({} as ExecutionCount);
  const [latestExecutionOutput, setLatestExecutionOutput] = useState({} as ExecutionOutput);
  const [cellIdToMsgId, setCellIdToMsgId] = useState({} as CellIdToMsgId);
  const [webSocketMap, setWebSocketMap] = useState<{ [id: string]: WebSocket }>({});


  function executeCode(parent_id: string, code:string, msg_id:string, cell_id:string) {
		setCellIdToMsgId({[msg_id]: cell_id});
    // fetch the connection to execute the code on
    const ws = webSocketMap[parent_id];

		// Send code to the kernel for execution
		const message = {
			header: {
				msg_type: 'execute_request',
				msg_id: msg_id,
				username: 'username',
			},
			metadata: {},
			content: {
				code: code,
				silent: false,
				store_history: true,
				user_expressions: {},
				allow_stdin: false, 
				stop_on_error: false
			},
			buffers: [],
			parent_header: {},
			channel: 'shell'
		};
		if (ws.readyState === WebSocket.OPEN) {
			ws.send(JSON.stringify(message));
		} else {
			console.log("websocket is not connected");
		}
	}

  async function createSession() {
    const url = 'http://localhost:8888/';
    const session_name = `Session-${Math.floor(Math.random() * 100000000)}`;
    const token = '3d91a3e0e09f2708ba1f161d0797b57ff70c528f5cac9ee0';
    const session = await startSession(url, token, session_name);
    const ws = startWebsocket(session.session_id, session.kernel_id, token);
    return ws;
	}

  function startWebsocket(session_id: string, kernel_id: string, token: string) {
		const websocketUrl = `ws://localhost:8888/api/kernels/${kernel_id}/channels?session_id=${session_id}&token=${token}`;
		const ws = new WebSocket(websocketUrl);

    // WebSocket event handlers
		ws.onopen = () => {
			console.log('WebSocket connection established');
		};

		// Handle incoming messages from the kernel
		ws.onmessage = (event) => {
			const message = JSON.parse(event.data);
			const msg_type = message.header.msg_type;
			// console.log('Received message from kernel:', message);

			// Handle different message types as needed
			if (msg_type === 'execute_reply') {
				// if (message.content.status === 'error' || message.content.status === 'abort') return;
				const newObj = {
					msg_id: message.parent_header.msg_id,
					execution_count: message.content.execution_count,
				}
				setLatestExecutionCount(newObj);

			} else if (msg_type === 'execute_result') {
				const outputObj = {
					msg_id: message.parent_header.msg_id,
					output: message.content.data['text/plain'],
          isImage: false,
				}
				setLatestExecutionOutput(outputObj);

			} else if (msg_type === 'stream') {
				const outputObj = {
					msg_id: message.parent_header.msg_id,
					output: message.content.text,
          isImage: false,
				}
				setLatestExecutionOutput(outputObj);

			} else if (msg_type === 'display_data') {
				const outputText = message.content.data['text/plain'];
				const outputImage = message.content.data['image/png'];
				console.log(outputImage)
				const outputObj = {
					msg_id: message.parent_header.msg_id,
					output: outputImage,
          isImage: true,
				}
				setLatestExecutionOutput(outputObj);

			} else if (msg_type === 'error') {
        const traceback = message.content.traceback.map(removeEscapeCodes);
				const outputObj = {
					msg_id: message.parent_header.msg_id,
					output: traceback.join('\n'),
          isImage: false,
				}
				setLatestExecutionOutput(outputObj);
			}
		};

		ws.onerror = (error) => {
			console.error('WebSocket error:', error);
		};

		ws.onclose = () => {
			console.log('WebSocket connection closed');
		};
    return ws;
	}

	useEffect(() => {
		// do not trigger on first render
		if (Object.keys(latestExecutionOutput).length === 0) return;
		const output = latestExecutionOutput.output;
    const isImage = latestExecutionOutput.isImage;
    const msg_id_execCount = latestExecutionCount.msg_id;
    const msg_id_output= latestExecutionOutput.msg_id;
    const executionCount = latestExecutionCount.execution_count;
		// TODO: in case of error, change font color
		const cell_id_execCount = cellIdToMsgId[msg_id_execCount];
    const cell_id_output = cellIdToMsgId[msg_id_output];

    const updatedNodes = nodes.map((node) => {
      // if it matches, update the execution count
      if (node.id === cell_id_execCount) {
        return {
          ...node,
          data: {
            ...node.data,
            executionCount: executionCount
          },
        };
      // for the update cell, update the output
      // TODO: if the output is not changed, set it to empty
      } else if (node.id === cell_id_output+"_output") {
        return {
          ...node,
          data: {
            ...node.data,
            output: output,
            isImage: isImage,
          },
        };
      // if nothing matches, return the node without modification
      } else return node;
    });
    const newNodes = [...updatedNodes];
    setNodes(newNodes);

	}, [latestExecutionOutput, latestExecutionCount]);

  // needed so that nodes know all websockets (update the execute function)
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

  const onDrop = async (event: DragEvent) => {
    event.preventDefault();

    if (wrapperRef.current) {
      const wrapperBounds = wrapperRef.current.getBoundingClientRect();
      const type = event.dataTransfer.getData('application/reactflow');
      let position = project({ x: event.clientX - wrapperBounds.x - 20, y: event.clientY - wrapperBounds.top - 20 });
      const nodeStyle = type === 'group' ? { width: 800, height: 500 } : undefined;

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
        const newWebSocket = await createSession();
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

  const onNodeDragStop = useCallback(
    (_: MouseEvent, node: Node) => {
      if ((node.type !== 'node' && node.type !== 'outputNode') && !node.parentNode) {
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
            if (n.id === groupNode.id) {
              return {
                ...n,
                className: '',
              };
            } else if (n.id === node.id) {
              const position = getNodePositionInsideParent(n, groupNode) ?? { x: 0, y: 0 };

              return {
                ...n,
                position,
                parentNode: groupNode.id,
                extent: 'parent' as 'parent',
              };
            }

            return n;
          })
          .sort(sortNodes);

        setNodes(nextNodes);
      }
    },
    [getIntersectingNodes, setNodes, store]
  );

  const onNodeDrag = useCallback(
    (_: MouseEvent, node: Node) => {
      if ((node.type !== 'node' && node.type !== 'outputNode')  && !node.parentNode) {
        return;
      }

      const intersections = getIntersectingNodes(node).filter((n) => n.type === 'group');
      const groupClassName = intersections.length && node.parentNode !== intersections[0]?.id ? 'active' : '';

      setNodes((nds) => {
        return nds.map((n) => {
          if (n.type === 'group') {
            return {
              ...n,
              className: groupClassName,
            };
          } else if (n.id === node.id) {
            return {
              ...n,
              position: node.position,
            };
          }

          return { ...n };
        });
      });
    },
    [getIntersectingNodes, setNodes]
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