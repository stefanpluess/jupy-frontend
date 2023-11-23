//COMMENT :: External modules/libraries
import {
  MouseEvent,
  DragEvent,
  useCallback,
  useRef,
  useState,
  useEffect,
} from "react";
import ReactFlow, {
  Node,
  ReactFlowProvider,
  useReactFlow,
  Background,
  BackgroundVariant,
  useStoreApi,
  useNodesState,
  useEdgesState,
  addEdge,
  Edge,
  Connection,
  MiniMap,
  Controls,
  Panel,
  SelectionMode,
} from "reactflow";
import { shallow } from "zustand/shallow";
import { ToastContainer } from 'react-toastify';
import axios from "axios";
import { 
  Alert
} from "react-bootstrap";
//COMMENT :: Internal modules UI
import { 
  Sidebar, 
  SelectedNodesToolbar 
} from "../ui";
//COMMENT :: Internal modules HELPERS
import {
  createInitialElements,
  sortNodes,
  getId,
  getNodePositionInsideParent,
  canRunOnNodeDrag,
  keepPositionInsideParent,
  getConnectedNodeId,
  getSimpleNodeId,
  checkNodeAllowed,
  saveNotebook,
} from "../../helpers/utils";
import { 
  useUpdateNodesExeCountAndOuput, 
  usePath 
} from "../../helpers/hooks";
import {
  useWebSocketStore,
  createSession,
  selectorGeneral,
} from "../../helpers/websocket";
import useNodesStore from "../../helpers/nodesStore";
//COMMENT :: Internal modules CONFIG
import {
  GROUP_NODE,
  NORMAL_NODE,
  MARKDOWN_NODE,
  EXTENT_PARENT,
  DEFAULT_LOCK_STATUS,
  OUTPUT_NODE,
} from "../../config/constants";
import nodeTypes from "../../config/NodeTypes";
import edgeTypes from "../../config/EdgeTypes";
import {
  proOptions,
  defaultEdgeOptions,
  onDragOver,
  serverURL,
} from "../../config/config";
import {
  nodes as initialNodes,
  edges as initialEdges,
} from "../../config/initial-elements";
//COMMENT :: Styles
import "reactflow/dist/style.css";
import "@reactflow/node-resizer/dist/style.css";
import "../../styles/views/Home.scss";
import "../../styles/ui/sidebar.scss";
import "../../styles/ui/canvas.scss";
import "../../styles/components/controls.scss";
import "../../styles/components/minimap.scss";
import 'react-toastify/dist/ReactToastify.css';

/**
 * Home component, which is the main component of the application.
 * This component renders a canvas where the user can move and manipulate nodes.
 * It also includes a sidebar from where the user can drop new nodes onto the canvas.
 * Inside this component we update execution count and output of nodes.
 * It contains the configuration of the elements like:
 * - ReactFlow
 * - Background
 * - MiniMap
 * - Controls
 * Functions like: onNodeDragStart, onNodeDrag and onNodeDragStop are called when a node is being dragged.
 * Function onDrop is called when a node is being dropped from the sidebar onto the canvas.
 */

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
  document.title = path.split("/").pop() + " - Jupy Canvas";
  const isMac = navigator?.platform.toUpperCase().indexOf('MAC') >= 0;
  const { token, setLatestExecutionCount, setLatestExecutionOutput } = useWebSocketStore(selectorGeneral, shallow);
  const setNodeIdToOutputs = useNodesStore((state) => state.setNodeIdToOutputs);
  const setNodeIdToExecCount = useNodesStore((state) => state.setNodeIdToExecCount);

  const [showSuccessAlert, setShowSuccessAlert] = useState(false);
  const [showErrorAlert, setShowErrorAlert] = useState(false);
  // INFO :: needed for lock functionality and moving nodes together:
  const [onDragStartData, setOnDragStartData] = useState({ nodePosition: {x: 0, y: 0}, nodeId: "", connectedNodePosition: {x: 0, y: 0}, connectedNodeId: "", isLockOn: DEFAULT_LOCK_STATUS});
  const getIsLockedForId = useNodesStore((state) => state.getIsLockedForId);

  //INFO :: useEffect -> update execution count and output of nodes
  useUpdateNodesExeCountAndOuput();

  /* on initial render, load the notebook (with nodes and edges) and start websocket connections for group nodes */
  useEffect(() => {
    axios.defaults.headers.common["Authorization"] = `Bearer ${token}`;
    axios.get(`${serverURL}/api/contents/${path}`).then((res) => {
      const notebookData = res.data;
      const { initialNodes, initialEdges } = createInitialElements(
        notebookData.content.cells
      );
      // For each group node, start a websocket connection
      initialNodes.forEach( async (node) => {
        if (node.type === GROUP_NODE) {
          const {ws, session} = await createSession(node.id, path, token, setLatestExecutionOutput, setLatestExecutionCount);
          node.data.ws = ws;
          node.data.session = session;
        } else if (node.type === NORMAL_NODE) {
          setNodeIdToExecCount(node.id, node.data.executionCount.execCount); // put the exec count into the store
        } else if (node.type === OUTPUT_NODE) {
          setNodeIdToOutputs({[node.id]: node.data.outputs}); // put the outputs into the store
        }
      });
      const sortedNodes = initialNodes.sort(sortNodes);
      setNodes(sortedNodes);
      setEdges(initialEdges);
    });
  }, []);

  /* Saving notebook when pressing Ctrl/Cmd + S */
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "s" && (isMac ? e.metaKey : e.ctrlKey)) {
        e.preventDefault();
        saveNotebook(nodes, edges, token, path, setShowSuccessAlert, setShowErrorAlert);
      }
    };
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [nodes, edges]);

  //INFO :: functions
  const onDrop = async (event: DragEvent) => {
    event.preventDefault();
    if (wrapperRef.current) {
      const wrapperBounds = wrapperRef.current.getBoundingClientRect();
      const type = event.dataTransfer.getData("application/reactflow");
      let position = project({
        x: event.clientX - wrapperBounds.x - 20,
        y: event.clientY - wrapperBounds.top - 20,
      });
      const nodeStyle = type === GROUP_NODE ? { width: 800, height: 500 } : 
                        type === (NORMAL_NODE || MARKDOWN_NODE) ? { width: 180, height: 85 } : undefined;

      const intersections = getIntersectingNodes({
        x: position.x,
        y: position.y,
        width: 40,
        height: 40,
      }).filter((n) => n.type === GROUP_NODE);
      const groupNode = intersections[0];

      const newNode: Node = {
        id: getId(type),
        type,
        position,
        data: {},
        style: nodeStyle,
      };

      // prevent from dropping a group node on group node
      if (groupNode && type === GROUP_NODE) return;

      // in case we drop a group, create a new websocket connection
      if (type === GROUP_NODE) {
        const {ws, session} = await createSession(newNode.id, path, token, setLatestExecutionOutput, setLatestExecutionCount);
        newNode.data.ws = ws;
        newNode.data.session = session;
      } else if (type === NORMAL_NODE) {
        newNode.data.executionCount = {
          execCount: '',
          timestamp: new Date()
        };
        setNodeIdToExecCount(newNode.id, ""); // put the exec count into the store
      } else if (type === MARKDOWN_NODE) {
        newNode.data.editMode = true; // on initial render, the markdown node is in edit mode
      }

      if (groupNode) {
        // if we drop a node on a group node, we want to position the node inside the group
        newNode.position = getNodePositionInsideParent(
          {
            position,
            width: 400,
            height: 40,
          },
          groupNode
        ) ?? { x: 0, y: 0 };
        newNode.parentNode = groupNode?.id;
        newNode.extent = groupNode ? EXTENT_PARENT : undefined;
      }

      // we need to make sure that the parents are sorted before the children
      // to make sure that the children are rendered on top of the parents
      const sortedNodes = store
        .getState()
        .getNodes()
        .concat(newNode)
        .sort(sortNodes);
      setNodes(sortedNodes);
    }
  };

  //INFO :: onNodeDrag... Callbacks
  const onNodeDragStop = useCallback(
    (_: MouseEvent, node: Node) => {
      if (!canRunOnNodeDrag(node)) return;
      /* function calculates intersections, i.e., the group nodes 
      that the moved node might now be inside of.*/
      const intersections = getIntersectingNodes(node)
                              .filter((n) => n.type === GROUP_NODE);
      const groupNode = intersections[0];
      const isLockOn = onDragStartData.isLockOn;
      const isNodeAllowed = checkNodeAllowed(node.id);
      /* when there is an intersection on drag stop, we want 
      to attach the node to its new parent */
      if (intersections.length && node.parentNode !== groupNode?.id) {
        /* if dragged node has any intersections on DragStop we need to 
        move it and its connected node to the group node this is not 
        activated if we just drag node within the group node */
        const nextNodes: Node[] = store.getState().getNodes() 
          .map((n) => {
            if (n.id === groupNode.id) {
              return {...n, className: ''};
            } else if (n.id === node.id) {
              const position = getNodePositionInsideParent(n, groupNode) 
                               ?? { x: 0, y: 0 };
              return { 
                ...n,
                position,
                parentNode: groupNode.id,
                extent: EXTENT_PARENT as 'parent',
              };
            }
            // if 🔒 lock is ✅ then update also connected node
            else if (isNodeAllowed && n.id === onDragStartData.connectedNodeId && isLockOn) {
              const position = getNodePositionInsideParent(n, groupNode) ?? { x: 0, y: 0 };
              return {
                ...n,
                position,
                parentNode: groupNode.id,
                extent: EXTENT_PARENT as 'parent',
              };
            }
            return n;
          })
          .sort(sortNodes);
        setNodes(nextNodes);
      }
    },
    [getIntersectingNodes, setNodes, store, onDragStartData]
  );

  const onNodeDragStart = useCallback(
    (_: MouseEvent, node: Node) => {
      if (!canRunOnNodeDrag(node) || !checkNodeAllowed(node.id)) return;
      const draggedNodeId = node.id;
      // find the connected node - could be SimpleNode or SimpleOutputNode
      const connectedNodeId = getConnectedNodeId(draggedNodeId);
      const connectedNode = store.getState().getNodes()
                              .find(n => n.id === connectedNodeId);
      if (!connectedNode) {
        // update the data used in onNodeDrag and onNodeDragStop with default
        setOnDragStartData({
          nodePosition: node.position,
          nodeId: draggedNodeId,
          connectedNodePosition: {x: 0, y: 0},
          connectedNodeId: "",
          isLockOn: DEFAULT_LOCK_STATUS,
        });
        return;
      }
      // update the data used in onNodeDrag and onNodeDragStop
      setOnDragStartData({
        nodePosition: node.position,
        nodeId: draggedNodeId,
        connectedNodePosition: connectedNode.position,
        connectedNodeId: connectedNode.id,
        isLockOn: getIsLockedForId(getSimpleNodeId(draggedNodeId)),
      });
    }, 
    [store]
  );

  const onNodeDrag = useCallback(
    (_: MouseEvent, node: Node) => {
      if (!canRunOnNodeDrag(node)) return;
      const intersections = getIntersectingNodes(node)
                              .filter((n) => n.type === GROUP_NODE);
      /* groupClassName will be 'active' if there is at least one intersection
      and the parent node of the current node is not the first intersection. */
      const groupClassName = intersections.length && 
                             node.parentNode !== intersections[0]?.id
                             ? 'active' 
                             : '';
      const isLockOn = onDragStartData.isLockOn;
      const isNodeAllowed = checkNodeAllowed(node.id);
      // update the nodes
      setNodes((nds) => {
        return nds.map((n) => {
          if (n.type === GROUP_NODE) {
            return { ...n, className: groupClassName};
          } else if (n.id === node.id) {
            return { 
              ...n, 
              position: node.position
            };
          }
          // if 🔒 lock is ✅ then update also connected node
          else if (isNodeAllowed && n.id === onDragStartData.connectedNodeId && isLockOn) {
            const newPosition = {
              x: onDragStartData.connectedNodePosition.x + 
                (node.position.x - onDragStartData.nodePosition.x),
              y: onDragStartData.connectedNodePosition.y + 
                (node.position.y - onDragStartData.nodePosition.y)
            };
            const groupNode = intersections.length &&
                  n.parentNode === intersections[0]?.id
                  ? intersections[0]
                  : undefined;
            if (groupNode) {
              // we have parent and are inside parent
              const position = keepPositionInsideParent(n, groupNode, newPosition) 
                               ?? { x: 0, y: 0 };
              /*keep the connected node inside the group node if 
              it is close to the bounds and has a parent already*/
              return {...n, position: position};
            } else{
              return {...n, position: newPosition};
            }
          }
          return { ...n };
        });
      });
    },
    [getIntersectingNodes, setNodes, onDragStartData]
  );
  

  // ---------- ALERTS ----------
  const SuccessAlert = () => {
    return (
      <Alert variant="success" show={showSuccessAlert} onClose={() => setShowSuccessAlert(false)} dismissible>
        Notebook saved successfully!
      </Alert>
    );
  };
  const ErrorAlert = () => {
    return (
      <Alert variant="danger" show={showErrorAlert} onClose={() => setShowErrorAlert(false)} dismissible>
        Error saving notebook!
      </Alert>
    );
  };
  useEffect(() => {
    if (showSuccessAlert) {
      const successTimeout = setTimeout(() => { setShowSuccessAlert(false) }, 3000);
      return () => { clearTimeout(successTimeout) };
    }
  }, [showSuccessAlert]);
  useEffect(() => {
    if (showErrorAlert) {
      const successTimeout = setTimeout(() => { setShowErrorAlert(false) }, 3000);
      return () => { clearTimeout(successTimeout) };
    }
  }, [showErrorAlert]);


  return (
    <div className={"wrapper"}>
      <div className={"sidebar"}>
        <Sidebar nodes={nodes} edges={edges} setShowSuccessAlert={setShowSuccessAlert} setShowErrorAlert={setShowErrorAlert} />
      </div>
      <div className={"rfWrapper"} ref={wrapperRef}>
        <ReactFlow
          nodes={nodes}
          edges={edges}
          onEdgesChange={onEdgesChange}
          onNodesChange={onNodesChange}
          onConnect={onConnect}
          onNodeDrag={onNodeDrag}
          onNodeDragStart={onNodeDragStart}
          onNodeDragStop={onNodeDragStop}
          onDrop={onDrop}
          onDragOver={onDragOver}
          proOptions={proOptions}
          fitView
          selectNodesOnDrag={false}
          nodeTypes={nodeTypes}
          edgeTypes={edgeTypes}
          defaultEdgeOptions={defaultEdgeOptions}
          selectionMode={SelectionMode.Full}   // Partial = only need to touch a node to select it
          minZoom={0.15}
          maxZoom={4}
          deleteKeyCode={null}
        >
          <Background gap={50} variant={BackgroundVariant.Dots} />
          <SelectedNodesToolbar />
          <MiniMap position={"top-right"} zoomable pannable />
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
          <Panel position="top-left">
            <ToastContainer 
              position="top-left"
              autoClose={7000}
              hideProgressBar={false}
              newestOnTop={false}
              pauseOnFocusLoss={false}
              pauseOnHover={true}
              closeOnClick
              rtl={false}
              theme="dark"
              style={{marginLeft: "80px"}}
            />
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
