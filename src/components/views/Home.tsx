//COMMENT :: External modules/libraries
import { MouseEvent, DragEvent, useCallback, useRef, 
  useState, useEffect
} from 'react';
import ReactFlow, {
  Node, ReactFlowProvider, useReactFlow, Background, BackgroundVariant, 
  useStoreApi, useNodesState, useEdgesState, addEdge, Edge, 
  Connection, MiniMap, Controls, Panel,
} from 'reactflow';
import { shallow } from 'zustand/shallow';
//COMMENT :: Internal modules UI
import { Sidebar, SelectedNodesToolbar } from '../ui';
//COMMENT :: Internal modules HELPERS
import { createInitialElements, createJSON, updateNotebook, 
  sortNodes, getId, getNodePositionInsideParent, createOutputNode,
  updateClassNameOrPosition, updateClassNameOrPositionInsideParent, 
  canRunOnNodeDrag, } from '../../helpers/utils';
import {useUpdateNodesExeCountAndOuput, usePath} from '../../helpers/hooks';
import { useWebSocketStore, createSession, selectorHome} from '../../helpers/websocket';
//COMMENT :: Internal modules CONFIG
import {GROUP_NODE, EXTENT_PARENT} from '../../config/constants';
import nodeTypes from '../../config/NodeTypes';
import {proOptions, defaultEdgeOptions, onDragOver} from '../../config/config';
import { nodes as initialNodes, edges as initialEdges } from '../../config/initial-elements';

//COMMENT :: Styles
import 'reactflow/dist/style.css';
import '@reactflow/node-resizer/dist/style.css';
import '../../styles/views/Home.scss';
import '../../styles/ui/sidebar.scss';
import '../../styles/ui/canvas.scss';
import '../../styles/components/controls.scss';
import '../../styles/components/minimap.scss';
import axios from 'axios';
import { NotebookPUT } from '../../config/types';
import { Alert } from 'react-bootstrap';


//INFO :: main code
function DynamicGrouping() {
  const wrapperRef = useRef<HTMLDivElement>(null);
  const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges);
  const onConnect = useCallback(
    (edge: Edge | Connection) => setEdges((eds) => addEdge(edge, eds)),
    [setEdges]
  );
  const { project, getIntersectingNodes } = useReactFlow();
  const store = useStoreApi();
  const path = usePath();
  const isMac = navigator?.platform.toUpperCase().indexOf('MAC') >= 0 // BUG - 'platform' is deprecated.ts(6385) lib.dom.d.ts(15981, 8): The declaration was marked as deprecated here.
  // other 
  const { cellIdToMsgId,
    latestExecutionCount, setLatestExecutionOutput, 
    latestExecutionOutput, setLatestExecutionCount,
    token
  } = useWebSocketStore(selectorHome, shallow);
  const [showSuccessAlert, setShowSuccessAlert] = useState(false);
  const [showErrorAlert, setShowErrorAlert] = useState(false);

  // this hook call ensures that the layout is re-calculated every time the graph changes
  // useLayout(); // TODO?

  //INFO :: useEffect -> update execution count and output of nodes
  useUpdateNodesExeCountAndOuput({latestExecutionCount, latestExecutionOutput}, cellIdToMsgId);

  /* on initial render, load the notebook (with nodes and edges) and start websocket connections for group nodes */
  //TODO: outsource
  useEffect(() => {
    axios.defaults.headers.common['Authorization'] = `Bearer ${token}`
    axios.get(`http://localhost:8888/api/contents/${path}`).then((res) => {
      const notebookData = res.data
      const { initialNodes, initialEdges } = createInitialElements(notebookData.content.cells);
      // For each group node, start a websocket connection
      initialNodes.forEach( async (node) => { // BUG - Promise returned in function argument where a void return was expected.
        if (node.type === GROUP_NODE) {
          const {ws, session} = await createSession(node.id, path, token, setLatestExecutionOutput, setLatestExecutionCount);
          node.data.ws = ws;
          node.data.session = session;
        }
      });
      setNodes(initialNodes);
      setEdges(initialEdges);
    });
  }, []);

  /* add and update eventListener for Ctrl/Cmd + S */
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 's' && (isMac ? e.metaKey : e.ctrlKey)) {
        e.preventDefault();
        saveNotebook();
      }
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [nodes, edges]);


  //INFO :: functions
  const saveNotebook = async () => {
    const notebookData: NotebookPUT = createJSON(nodes, edges);
    try {
      await updateNotebook(token, notebookData, path);
      setShowSuccessAlert(true);
    } catch (error) {
      setShowErrorAlert(true);
      console.error('Error saving notebook:', error);
    }
  };


  const onDrop = async (event: DragEvent) => {
    event.preventDefault();
    if (wrapperRef.current) {
      const wrapperBounds = wrapperRef.current.getBoundingClientRect();
      const type = event.dataTransfer.getData('application/reactflow');
      let position = project({ x: event.clientX - wrapperBounds.x - 20, y: event.clientY - wrapperBounds.top - 20 }); // TODO - change to not fixed value / export to constant
      const nodeStyle = type === GROUP_NODE ? { width: 800, height: 500 } : undefined; // TODO - change to not fixed value / export to constant

      const intersections = getIntersectingNodes({
        x: position.x,
        y: position.y,
        width: 40, // TODO - change to not fixed value / export to constant
        height: 40,// TODO - change to not fixed value / export to constant
      }).filter((n) => n.type === GROUP_NODE);
      const groupNode = intersections[0];

      const newNode: Node = {
        id: getId(type),
        type,
        position,
        data: {},
        style: nodeStyle,
      };

      // in case we drop a group, create a new websocket connection
      if (type === GROUP_NODE) {
        const {ws, session} = await createSession(newNode.id, path, token, setLatestExecutionOutput, setLatestExecutionCount);
        newNode.data.ws = ws;
        newNode.data.session = session;
      } else {
        newNode.data.executionCount = null;
      }

      if (groupNode) {
        // if we drop a node on a group node, we want to position the node inside the group
        newNode.position = getNodePositionInsideParent(
          {
            position,
            width: 400, // TODO - change to not fixed value / export to constant
            height: 40, // TODO - change to not fixed value / export to constant
          },
          groupNode
        ) ?? { x: 0, y: 0 };
        newNode.parentNode = groupNode?.id;
        newNode.extent = groupNode ? EXTENT_PARENT : undefined;
      }

      if (type !== GROUP_NODE) {
        const newOutputNode: Node = createOutputNode(newNode);
        const sortedNodes = store
          .getState()
          .getNodes()
          .concat(newNode)
          .concat(newOutputNode)
          .sort(sortNodes);
        setNodes(sortedNodes);
        const newEdge: Edge = {
          id: getId('edge'),
          source: newNode.id,
          target: newOutputNode.id,
        };
        setEdges([...edges, newEdge]);
      } else {
        // we need to make sure that the parents are sorted before the children
        // to make sure that the children are rendered on top of the parents
        const sortedNodes = store
          .getState()
          .getNodes()
          .concat(newNode)
          .sort(sortNodes);
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

  const SuccessAlert = () => {
    // BUG - Do not define components during render. React will see a new component type on every render and destroy the entire subtree\u8217s DOM nodes and state. Instead, move this component definition out of the parent component \u8220DynamicGrouping\u8221 and pass data as props.
    return (<Alert variant="success" show={showSuccessAlert} onClose={() => setShowSuccessAlert(false)} dismissible>Notebook saved successfully!</Alert>);
  };
  const ErrorAlert = () => {
    // BUG - Do not define components during render. React will see a new component type on every render and destroy the entire subtree\u8217s DOM nodes and state. Instead, move this component definition out of the parent component \u8220DynamicGrouping\u8221 and pass data as props.
    return (<Alert variant="danger" show={showErrorAlert} onClose={() => setShowErrorAlert(false)} dismissible>Error saving notebook.</Alert>);
  };

  return (
    <div className={"wrapper"}>
      <div className={"sidebar"}>
        <Sidebar />
      </div>
      <div className={"rfWrapper"} ref={wrapperRef}>
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
          <Background gap={50} variant={BackgroundVariant.Dots} />
          <SelectedNodesToolbar />
          <MiniMap
            position={"top-right"}
            zoomable
            pannable
          />
          <Controls
            showFitView={true}
            showZoom={true}
            showInteractive={true}
            position="bottom-right"
          />
          <Panel position="top-center">
            <SuccessAlert />
            <ErrorAlert />
          </Panel>
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