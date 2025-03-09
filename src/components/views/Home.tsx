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
  Panel,
  SelectionMode,
} from "reactflow";
import { shallow } from "zustand/shallow";
import { ToastContainer } from 'react-toastify';
import axios from "axios";
import { 
  Alert, Button
} from "react-bootstrap";
import withReactContent from "sweetalert2-react-content";
import Swal from "sweetalert2";
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faCircleQuestion,
  faCircleXmark,
} from "@fortawesome/free-solid-svg-icons";
import MonacoEditor from "@uiw/react-monacoeditor";
//COMMENT :: Internal modules UI
import { 
  Sidebar, 
  SelectedNodesToolbar,
  SettingsPopup,
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
  usePath, 
  useChangeExpandParent,
  useChangeFloatingEdges,
  useCellBranchReset
} from "../../helpers/hooks";
import {
  useWebSocketStore,
  createSession,
  selectorGeneral,
} from "../../helpers/websocket";
import useNodesStore from "../../helpers/nodesStore";
import useSettingsStore from "../../helpers/settingsStore";
import useExecutionStore from "../../helpers/executionStore";
//COMMENT :: Internal modules CONFIG
import {
  GROUP_NODE,
  NORMAL_NODE,
  MARKDOWN_NODE,
  EXTENT_PARENT,
  DEFAULT_LOCK_STATUS,
  OUTPUT_NODE,
  FLOATING_EDGE,
  NORMAL_EDGE,
  EXECUTION_GRAPH_PANEL,
  MIN_WIDTH,
  MIN_HEIGHT,
  DEFAULT_WIDTH_GROUP,
  DEFAULT_HEIGHT_GROUP,
  SIDEBAR_NODE_SIZE,
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
import { positionNode } from "../../config/types";
// COMMENT :: buttons
import FlowControls from "../buttons/FlowControls";
//COMMENT :: Styles
import "reactflow/dist/style.css";
import "@reactflow/node-resizer/dist/style.css";
import "../../styles/views/Home.scss";
import "../../styles/ui/sidebar.scss";
import "../../styles/ui/canvas.scss";
import "../../styles/components/controls.scss";
import "../../styles/components/minimap.scss";
import 'react-toastify/dist/ReactToastify.css';
import CopyButton from "../buttons/CopyContentButton";
import {useDocumentStore} from "../../helpers/documentStore";
import CollaborationSessionPopup from "../ui/CollaborationSessionPopup";
import { useUpdateWebSocket } from "../../helpers/websocket/updateWebSocket";
import { useUpdateWebSocketStore } from "../../helpers/websocket/updateWebSocketStore";
import Collaborators from "../ui/Collaborators";

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
  const onConnect = useCallback( // not needed as long as we don't allow for dragging of edges
    (edge: Edge | Connection) => setEdges((eds) => addEdge(edge, eds)),
    [setEdges]
  );
  const { screenToFlowPosition, getIntersectingNodes, fitView } = useReactFlow();
  const store = useStoreApi();
  const path = usePath();
  document.title = path.split("/").pop() + " - Jupy Canvas";
  const isMac = navigator?.platform.toUpperCase().indexOf('MAC') >= 0;
  const { token, setLatestExecutionCount, setLatestExecutionOutput } = useWebSocketStore(selectorGeneral, shallow);
  const setNodeIdToOutputs = useNodesStore((state) => state.setNodeIdToOutputs);
  const setNodeIdToExecCount = useNodesStore((state) => state.setNodeIdToExecCount);
  const showSettings = useSettingsStore((state) => state.showSettings);
  const setShowSettings = useSettingsStore((state) => state.setShowSettings);
  const expandParentSetting = useSettingsStore((state) => state.expandParent);
  const floatingEdgesSetting = useSettingsStore((state) => state.floatingEdges);
  const snapGridSetting = useSettingsStore((state) => state.snapGrid);
  const setNodeIdToWebsocketSession = useNodesStore((state) => state.setNodeIdToWebsocketSession);
  const isInteractive = useSettingsStore((state) => state.isInteractive);
  // INFO :: alerts
  const [showSuccessAlert, setShowSuccessAlert] = useState(false);
  const [showErrorAlert, setShowErrorAlert] = useState(false);
  // INFO :: needed for lock functionality and moving nodes together:
  const [onDragStartData, setOnDragStartData] = useState({ nodePosition: {x: 0, y: 0}, nodeId: "", connectedNodePosition: {x: 0, y: 0}, connectedNodeId: "", isLockOn: DEFAULT_LOCK_STATUS});
  const getIsLockedForId = useNodesStore((state) => state.getIsLockedForId);
  // INFO :: 🧫 CELL BRANCH
  const toggleNode = useNodesStore((state) => state.toggleNode);
  const isCellBranchActive = useNodesStore((state) => state.isCellBranchActive);
  const setConfirmCellBranch = useNodesStore((state) => state.setConfirmCellBranch);
  const resetCellBranch= useCellBranchReset();
  const clickedNodeOrder = useNodesStore((state) => state.clickedNodeOrder);
  const [isVideoVisible, setIsVideoVisible] = useState(false);
  // INFO :: dragging nodes from sidebar
  const setIsDraggedFromSidebar = useNodesStore((state) => state.setIsDraggedFromSidebar)
  const isDraggedFromSidebar = useNodesStore((state) => state.isDraggedFromSidebar)
  //INFO :: useEffects -> update execution count and output of nodes / some settings
  useUpdateNodesExeCountAndOuput();
  useChangeExpandParent();
  useChangeFloatingEdges();
  // INFO :: execution graph
  const fitViewNodeId = useExecutionStore((state) => state.fitViewNodeId);
  const setFitViewNodeId = useExecutionStore((state) => state.setFitViewNodeId);
  const hoveredNodeId = useExecutionStore((state) => state.hoveredNodeId);
  const setHoveredNodeId = useExecutionStore((state) => state.setHoveredNodeId);
  const clickedNodeCode = useExecutionStore((state) => state.clickedNodeCode);
  const setClickedNodeCode = useExecutionStore((state) => state.setClickedNodeCode);
  const [showCode, setShowCode] = useState(false);
  const {setDocument} = useDocumentStore();
  const [showCollaborationSessionPopup, setShowCollaborationSessionPopup] = useState<boolean>(false);
  const [showCollaborators, setShowCollaborators] = useState<boolean>(false);
  const {sendAddTransformation, sendMoveTransformation, sendClickedNode} = useUpdateWebSocket();
  const getUsers = useUpdateWebSocketStore((state) => state.getUsers);
  const userPositions = useUpdateWebSocketStore((state) => state.userPositions);

  // Remove the resizeObserver error
  useEffect(() => {
    const errorHandler = (e: any) => {
      if (e.message.includes("ResizeObserver loop completed with undelivered notifications" ||
            "ResizeObserver loop limit exceeded")) {
        const resizeObserverErr = document.getElementById("webpack-dev-server-client-overlay");
        if (resizeObserverErr) resizeObserverErr.style.display = "none";
      }
    };
    window.addEventListener("error", errorHandler);
    return () => window.removeEventListener("error", errorHandler);
  }, []);

  /* on initial render, load the notebook (with nodes and edges) and start websocket connections for group nodes */
  useEffect(() => {
    axios.defaults.headers.common["Authorization"] = `Bearer ${token}`;
    axios.get(`${serverURL}/api/contents/${path}`).then((res) => {
      const notebookData = res.data;
      const { initialNodes, initialEdges } = createInitialElements(notebookData.content.cells);
      // For each group node, start a websocket connection
      initialNodes.forEach( async (node) => {
        if (node.type === GROUP_NODE) {
          const {ws, session} = await createSession(node.id, path, token, setLatestExecutionOutput, setLatestExecutionCount);
          setNodeIdToWebsocketSession(node.id, ws, session);
        } else {
          if (node.parentNode) expandParentSetting ? node.expandParent = true : node.extent = EXTENT_PARENT;
          if (node.type === NORMAL_NODE) {
            setNodeIdToExecCount(node.id, node.data.executionCount.execCount); // put the exec count into the store
          } else if (node.type === OUTPUT_NODE) {
            setNodeIdToOutputs({[node.id]: node.data.outputs}); // put the outputs into the store
          }
        }
      });
      initialEdges.forEach((edge) => {
        if (!edge.type) floatingEdgesSetting ? edge.type = FLOATING_EDGE : edge.type = NORMAL_EDGE;
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

  /* when dropping a bubble on a code cell, assign the code cell as a child of the bubble */
  const handleBubbleDropOnCodeCell = (groupNode: Node) => {
    const groupNodeIntersections = getIntersectingNodes({
      x: groupNode.position.x,
      y: groupNode.position.y,
      width: groupNode.width ?? DEFAULT_WIDTH_GROUP,
      height: groupNode.height ?? DEFAULT_HEIGHT_GROUP,
    }).filter((n) => n.type !== GROUP_NODE);

    if (groupNodeIntersections.length === 0) return;

    groupNodeIntersections.forEach((node) => {
      if (!node.parentNode){
        // if parentNodes is undefined assign this groupNode as a parent
        const newPosition = getNodePositionInsideParent(
          {
            position: node.position,
            width: node.width ?? DEFAULT_WIDTH_GROUP, // default value if node.width is null or undefined
            height: node.height ?? DEFAULT_HEIGHT_GROUP, // default value if node.height is null or undefined
          } as positionNode,
          {
            position: groupNode.position,
            width: groupNode.width ?? DEFAULT_WIDTH_GROUP,
            height: groupNode.height ?? DEFAULT_HEIGHT_GROUP,
          } as positionNode
        );

        const isLockOn = onDragStartData.isLockOn;
        const isNodeAllowed = checkNodeAllowed(node.id);
        setNodes((nds) => {
          return nds.map((n) => {
            if (n.id === node.id) {
              const updatedNode = { 
                ...n,
                position: newPosition,
                parentNode: groupNode.id,
                className: '',
              };
              expandParentSetting ? updatedNode.expandParent = true : updatedNode.extent = EXTENT_PARENT as 'parent';
              return updatedNode;
            }
            // if 🔒 lock is ✅ then update also connected node
            else if (isNodeAllowed && n.id === onDragStartData.connectedNodeId && isLockOn) {
              const position = getNodePositionInsideParent(n, groupNode) ?? { x: 0, y: 0 };
              const updatedNode = {
                ...n,
                position,
                parentNode: groupNode.id,
                className: '',
              };
              expandParentSetting ? updatedNode.expandParent = true : updatedNode.extent = EXTENT_PARENT as 'parent';
              return updatedNode;
            }
            return { ...n };
          });
        });
      }
    });
  };

  //INFO :: functions
  const onDrop = async (event: DragEvent) => {
    event.preventDefault();
    if (wrapperRef.current) {
      const type = event.dataTransfer.getData("application/reactflow");
      let position = screenToFlowPosition({
        // COMMENT - defines the position of a node respective to the cursor
        x: event.clientX - 20,
        y: event.clientY - 20,
      });

      let nodeStyle;
      if (type === GROUP_NODE) {
          nodeStyle = { width: DEFAULT_WIDTH_GROUP, height: DEFAULT_HEIGHT_GROUP };
      } else if (type === NORMAL_NODE || type === MARKDOWN_NODE) {
          nodeStyle = { width: MIN_WIDTH, height: MIN_HEIGHT };
      } else {
          nodeStyle = undefined;
      }

      const intersections = getIntersectingNodes({
        x: position.x,
        y: position.y,
        width: SIDEBAR_NODE_SIZE,
        height: SIDEBAR_NODE_SIZE,
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
        setNodeIdToWebsocketSession(newNode.id, ws, session);
      } else if (type === NORMAL_NODE) {
        newNode.data.executionCount = {
          execCount: '',
          timestamp: new Date()
        };
        newNode.data.typeable = true; // allow immediate typing
        setNodeIdToExecCount(newNode.id, ""); // put the exec count into the store
      } else if (type === MARKDOWN_NODE) {
        newNode.data.editMode = true; // on initial render, the markdown node is in edit mode
        newNode.data.typeable = true; // allow immediate typing
      }

      if (groupNode) {
        // if we drop a node on a group node, we want to position the node inside the group
        newNode.position = getNodePositionInsideParent(
          {
            position,
            width: MIN_WIDTH,
            height: MIN_HEIGHT,
          },
          groupNode
        ) ?? { x: 0, y: 0 };
        newNode.parentNode = groupNode?.id;
        expandParentSetting ? newNode.expandParent = true : newNode.extent = EXTENT_PARENT;
      }

      // we need to make sure that the parents are sorted before the children
      // to make sure that the children are rendered on top of the parents
      const sortedNodes = store
        .getState()
        .getNodes()
        .concat(newNode)
        .sort(sortNodes);
      setNodes(sortedNodes);

      // INFO :: dragging nodes from sidebar
      setIsDraggedFromSidebar(false);

      // assign the group node as a parent if dropped on a code cell
      if (type === GROUP_NODE) handleBubbleDropOnCodeCell(newNode);
      sendAddTransformation(newNode)
    }
  };

  //INFO :: onNodeDrag... Callbacks
  const onNodeDragStop = useCallback(
    (_: MouseEvent, node: Node) => {
      if (!canRunOnNodeDrag(node)) {
        handleBubbleDropOnCodeCell(node);
        sendMoveTransformation(node.id, node.position, node.parentNode? node.parentNode : undefined);
        return;
      }
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
              const updatedNode = { 
                ...n,
                position,
                parentNode: groupNode.id,
              };
              expandParentSetting ? updatedNode.expandParent = true : updatedNode.extent = EXTENT_PARENT as 'parent';
              return updatedNode;
            }
            // if 🔒 lock is ✅ then update also connected node
            else if (isNodeAllowed && n.id === onDragStartData.connectedNodeId && isLockOn) {
              const position = getNodePositionInsideParent(n, groupNode) ?? { x: 0, y: 0 };
              const updatedNode = {
                ...n,
                position,
                parentNode: groupNode.id,
              };
              expandParentSetting ? updatedNode.expandParent = true : updatedNode.extent = EXTENT_PARENT as 'parent';
              return updatedNode;
            }
            return n;
          })
          .sort(sortNodes);
        setNodes(nextNodes);
      }
      console.log(node)
      sendMoveTransformation(node.id, node.position, node.parentNode);
    },
    [handleBubbleDropOnCodeCell, getIntersectingNodes, setNodes, store, onDragStartData]
  );

  const onNodeDragStart = useCallback(
    (_: MouseEvent, node: Node) => {
      console.log(node)
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
      console.log("onNodeDrag executed")
      /* In case we are dragging a group node, we look for intersecting nodes of other types.
      Else, we look for intersection group nodes. */
      const intersections = getIntersectingNodes(node)
                              .filter((n) => (node.type === GROUP_NODE) ? n.type !== GROUP_NODE : n.type === GROUP_NODE);
      const intersectingNodes = intersections.map((n) => n.id); // highlight the nodes that the node is intersecting with
      // className will be 'active'/'highlighted if there is at least one intersection
      const className = intersections.length && 
                             node.parentNode !== intersections[0]?.id
                             ? (node.type !== GROUP_NODE) ? 'active' : 'highlighted'
                             : '';
      const isLockOn = onDragStartData.isLockOn;
      const isNodeAllowed = checkNodeAllowed(node.id);
      // update the nodes
      setNodes((nds) => {
        return nds.map((n) => {
          if (n.id === node.id) {
            return { 
              ...n, 
              position: node.position
            };
          // if 🔒 lock is ✅ then update also connected node
          } else if (isNodeAllowed && n.id === onDragStartData.connectedNodeId && isLockOn) {
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
              // keep the connected node inside the group node if it is close to the bounds and has a parent already
              return {...n, position: position};
            } else{
              return {...n, position: newPosition};
            }
          } else if (!n.parentNode) {
            // highlight the nodes that the node is intersecting with
            return { ...n, className: intersectingNodes.includes(n.id) ? className : ''};
          }
          return { ...n };
        });
      });
    },
    [getIntersectingNodes, setNodes, onDragStartData]
  );

  // INFO :: 🧫 CELL BRANCH
  const MySwal = withReactContent(Swal);
  const showAlertCellBranchOut = () => {
    MySwal.fire({
      title: <strong>Branch out warning!</strong>,
      html: <i>Select only nodes that belong to the indicated group node!</i>,
      icon: "warning",
    });
  };

  const onNodeClick = useCallback(
    (_: MouseEvent, node: Node) => {
      sendClickedNode(node.id);
      if (!isCellBranchActive.isActive || node.type === GROUP_NODE) return;
      if (node.parentNode !== isCellBranchActive.id) {
        showAlertCellBranchOut();
        return;
      }
      toggleNode(node.id);
      // check if the node has a node connected (output or code node) to it
      let connectedNode: Node | undefined = undefined;
      if (node.type === NORMAL_NODE || node.type === OUTPUT_NODE) {
        connectedNode = store.getState().getNodes()
                          .find(n => n.id === getConnectedNodeId(node.id));
        if (connectedNode) {
          toggleNode(connectedNode.id);
        }
      }
      // update the nodes
      setNodes((nds) => {
        return nds.map((n) => {
          if (n.id === node.id || (connectedNode && n.id === connectedNode.id)) {
            if (n.className === 'selected') {
              return { ...n, className: undefined, selected: false };
            }
            return { ...n, className: 'selected', selected: false };
          }
          return { ...n };
        });
      });
    },
    [setNodes, toggleNode, store, isCellBranchActive]
  );

  const confirmCellBranch = () => {
    // proceed to next step of branching out
    setConfirmCellBranch(true);
  }

  const cancelCellBranch = () => {
    resetCellBranch();
  }

  // INFO :: execution graph
  // transfer to node on click in the execution graph
  useEffect(() => {
    if (fitViewNodeId) {
      fitView({ padding: 0.8, duration: 800, nodes: [{ id: fitViewNodeId }] });
    }
  }, [fitViewNodeId]);

  // enable to user to focus the same node again after the user paned or zoomed the viewport
  const onMoveStart = () => {
    setFitViewNodeId(undefined);
  };
  
  // change the class name of the node that is hovered in the execution graph
  useEffect(() => {
    setNodes((nds) => nds.map((n) => {
      // Check if the node is the hovered one or has the specific class name
      const isHoveredNode = n.id === hoveredNodeId;
      const hasHoveredClass = n.className === 'highlighted';
  
      if (isHoveredNode) {
        return { ...n, className: 'highlighted' };
      } else if (hasHoveredClass) {
        return { ...n, className: undefined };
      }
  
      return n; // Return the node as-is if none of the above conditions are met
    }));
  }, [hoveredNodeId]);

  // show the code of the code cell in <Panel> that was clicked in the execution graph
  useEffect(() => {
    if (clickedNodeCode) {
      setShowCode(true);
    }
  }, [clickedNodeCode]);

  const closeCodePanel = () => {
    setShowCode(false);
    setClickedNodeCode(undefined);
    setHoveredNodeId(undefined);
  }

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

  // INFO :: 🧫 CELL BRANCH
  const toggleHelpCellBranch = () => {
    if (!isVideoVisible) {
      setIsVideoVisible(true);
    } else{
      setIsVideoVisible(false);
    }
  }

  const CellBranchAlert = () => {
    const filteredIds = clickedNodeOrder.filter((id) => !id.includes('output'));
    return (
      <Alert show={isCellBranchActive.isActive && !isCellBranchActive.isConfirmed} variant="secondary">
        <Alert.Heading>Pick code cells and split the kernel ✂️</Alert.Heading>
        <p> <u>New kernel cell</u> will be created as a parent of this kernel.<br/>
        The chosen code cells will run in the specified order on <u>new parent</u>.<br/>
        Output cells are selected automatically. </p>
        <p><strong>Cells selected: {filteredIds.length}</strong></p>
        {isVideoVisible &&  <iframe src="https://www.youtube.com/embed/YjH5eYDD9mI?showinfo=0&autohide=1" style={{ width: '100%', height: '35vh'}} allowFullScreen></iframe>}
        <div className="buttonsAreaCellBranch">
          <Button onClick={cancelCellBranch} as="input" type="button" value="Cancel" variant="danger"/>
          <button
            className="cellButton"
            onClick = {toggleHelpCellBranch}
          >
            <FontAwesomeIcon className="cellBranchHelp-icon" icon={faCircleQuestion} />
          </button>
          <Button onClick={confirmCellBranch} as="input" type="button" value="Confirm" variant="success" disabled={filteredIds.length === 0}/>
        </div>
      </Alert>
    );
  }

  return (
    // onDragOver, onDragEnter is needed for drag and drop from the side bar to not display the "no-drop" cursor
    <div onDragOver={onDragOver} onDragEnter={onDragOver} className={"wrapper"}> 
      <div className={"sidebar"}>
        <Sidebar nodes={nodes} edges={edges} setShowSuccessAlert={setShowSuccessAlert} setShowErrorAlert={setShowErrorAlert} setShowCollaborationSessionPopup={setShowCollaborationSessionPopup} setShowCollaborators={setShowCollaborators}/>
      </div>
      <div className={isDraggedFromSidebar ? "rfWrapper nodeDraggedFromSideBar" : "rfWrapper"} ref={wrapperRef}>
        <ReactFlow
          nodes={nodes}
          edges={edges}
          onEdgesChange={onEdgesChange}
          onNodesChange={onNodesChange}
          onConnect={onConnect} // not needed as long as we don't allow for dragging of edges
          onNodeDrag={onNodeDrag}
          onNodeDragStart={onNodeDragStart}
          onNodeDragStop={onNodeDragStop}
          onDrop={onDrop}
          onNodeClick={onNodeClick}
          onMoveStart={onMoveStart}
          zoomOnDoubleClick={!isCellBranchActive.isActive}
          nodesDraggable={!(isCellBranchActive.isActive) && isInteractive}
          elementsSelectable={!(isCellBranchActive.isActive) && isInteractive}
          onDragOver={onDragOver}
          proOptions={proOptions}
          fitView
          snapToGrid={snapGridSetting}
          snapGrid={[30, 30]}
          selectNodesOnDrag={false}
          nodeTypes={nodeTypes}
          edgeTypes={edgeTypes}
          defaultEdgeOptions={defaultEdgeOptions}
          selectionMode={SelectionMode.Full}   // Partial = only need to touch a node to select it
          minZoom={0.15}
          maxZoom={4}
          deleteKeyCode={null}
        >
          <Background gap={30} variant={BackgroundVariant.Dots} />
          <SelectedNodesToolbar />
          <MiniMap position={"top-right"} zoomable pannable />
          <FlowControls />
          {/* Panel for showing the code from the execution graph */}
          {showCode && (
            <Panel 
              position="top-left"
              className="exegraph-panel-code"
              >
                <div className="exegraph-panel-code-header">
                  <CopyButton 
                    title="Copy Text from Cell"
                    className="cellButton"
                    nodeType={EXECUTION_GRAPH_PANEL}
                    stringToCopy={clickedNodeCode}
                  />
                  <h6 className="exegraph-panel-code-header-title">Past 🐍 Code</h6>
                  <button
                    className="exegraph-panel-code-header-button"
                    onClick={closeCodePanel}
                  >
                    <FontAwesomeIcon className='exegraph-panel-code-header-button-icon' icon={faCircleXmark} />
                  </button>
                </div>
                <div className="exegraph-panel-code-body">
                  <MonacoEditor
                    height="1000px" // ensure it is large enough
                    language="python"
                    theme="vs-dark"
                    value={clickedNodeCode}
                    options={{
                      padding: { top: 3, bottom: 3 },
                      selectOnLineNumbers: true,
                      readOnly: true,
                      automaticLayout: true,
                      scrollbar: {
                        vertical: 'hidden', // Hide vertical scrollbar
                        horizontal: 'hidden', // Hide horizontal scrollbar
                      },
                      minimap: {
                        enabled: false, // Disable the minimap
                      },
                      wordWrap: "on",
                    }}
                    />
                </div>
            </Panel>
          )}
          <Panel position="top-center">
            <SuccessAlert />
            <ErrorAlert />
            <CellBranchAlert />
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
          <SettingsPopup show={showSettings} onClose={() => setShowSettings(false)} />
          <CollaborationSessionPopup show={showCollaborationSessionPopup} handleClose={() => setShowCollaborationSessionPopup(false)}></CollaborationSessionPopup>
          <Collaborators show={showCollaborators} handleClose={() => setShowCollaborators(false)} userPositions={userPositions}></Collaborators>
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
