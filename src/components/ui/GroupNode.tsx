//COMMENT :: External modules/libraries
import { 
  memo, 
  useCallback, 
  useEffect, 
  useState 
} from "react";
import {
  getNodesBounds,
  Handle,
  NodeProps,
  NodeToolbar,
  Position,
  useReactFlow,
  useStore,
  useStoreApi,
  Node,
  ReactFlowProvider
} from "reactflow";
import { NodeResizer } from "@reactflow/node-resizer";
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faTrashArrowUp,
  faTrashAlt,
  faSquare,
  faArrowRotateRight,
  faPowerOff,
  faCirclePlay,
  faNetworkWired,
  faFileExport,
  faCircleChevronDown,
  faCircleXmark,
  faSpinner,
  faForward,
  faCircleInfo,
  faArrowDownUpAcrossLine,
  faForwardFast,
  faCodeCommit
} from "@fortawesome/free-solid-svg-icons";
import axios from "axios";
import { v4 as uuidv4 } from "uuid";
import withReactContent from "sweetalert2-react-content";
import Swal from "sweetalert2";
import Spinner from 'react-bootstrap/Spinner';
//COMMENT :: Internal modules HELPERS
import { 
  useDetachNodes, 
  useBubbleBranchClick, 
  usePath, 
  useDeleteOutput, 
  useHasBusySuccessors, 
  useHasBusyPredecessor, 
  useResetExecCounts, 
  useRunAll, 
  useRemoveGroupNode, 
  useCellBranch,
  useCellBranchReset,
  useUpdateHistory,
} from "../../helpers/hooks";
import { 
  exportToJupyterNotebook, 
  generateMessage,
  passParentState, 
  sortNodes
} from "../../helpers/utils";
import useNodesStore from "../../helpers/nodesStore";
import useExecutionStore from "../../helpers/executionStore";
import { useWebSocketStore } from "../../helpers/websocket";
import { 
  startWebsocket, 
  createSession, 
  onInterrupt 
} from "../../helpers/websocket/websocketUtils";
//COMMENT :: Internal modules UI
import { 
  CustomConfirmModal, 
  CustomInformationModal,
  ExecutionGraph
} from "../ui";
//COMMENT :: Internal modules CONFIG
import {
  KERNEL_IDLE,
  KERNEL_INTERRUPTED,
  KERNEL_BUSY,
  KERNEL_BUSY_FROM_PARENT,
  MIN_WIDTH_GROUP,
  MIN_HEIGHT_GROUP,
  RUNALL_ACTION,
  EXPORT_ACTION,
  RUNBRANCH_ACTION,
  NORMAL_NODE,
  ExecInfoT,
  PADDING
} from "../../config/constants";
import {
  lineStyle,
  handleStyle,
  initialModalStates,
  serverURL,
} from "../../config/config";
import { InstalledPackages, OutputNodeData } from "../../config/types";
import useSettingsStore from "../../helpers/settingsStore";

/**
 * Renders a group node on the canvas that allows a connection to the kernel in 
 * order to execute code cells and may contain:
 * - a number of simple nodes with or without the respective output nodes
 * - a number of markdown nodes
 *
 * @param id The ID of the group node.
 * @param data The data object of the group node - contains the websocket connection, session object, and predecessor
 * 
 *  It has functionalities like:
 * - Websocket Connection: shows the status of the websocket connection and allows for code execution
 * - Queueing: queue the execution of code cells
 * - Kernel Info: shows information about the kernel and the installed packages
 * - Knowledge Passing: allows for the passing of the kernel state from the parent to the child
 * 
 *  Toolbar above the node defines addtional functionalities like:
 * - Delete Kernel: deletes the group node and all its child nodes
 * - Branch Out: creates a new group node with the selected node as the predecessor
 * - Restart Kernel: restarts the kernel
 * - Shutdown Kernel: shuts down the kernel
 * - Interrupt Kernel: interrupts the kernel
 * - Reconnect Kernel: reconnects the kernel
 * - Run All: runs all code cells in the group node
 * - Run Branch: runs all code cells in all successeors up until this group node
 * - Export to Jupyter Notebook: exports the group node to a Jupyter Notebook
 */

function GroupNode({ id, data }: NodeProps) {
  const store = useStoreApi();
  const token = useWebSocketStore((state) => state.token);
  const path = usePath();
  const setLatestExecutionCount = useWebSocketStore((state) => state.setLatestExecutionCount);
  const setLatestExecutionOutput = useWebSocketStore((state) => state.setLatestExecutionOutput);
  const { getNode, getNodes, setNodes, fitView} = useReactFlow();
  const predecessor = getNode(data.predecessor);
  const [modalStates, setModalStates] = useState(initialModalStates);
  const [isBranching, setIsBranching] = useState(false);
  const [isReconnecting, setIsReconnecting] = useState(false);
  const [showKernelInfo, setShowKernelInfo] = useState(false);
  const [installedPackages, setInstalledPackages] = useState({} as InstalledPackages);
  const detachNodes = useDetachNodes();
  const removeGroupNode = useRemoveGroupNode();
  const hasBusySucc = useHasBusySuccessors();
  const hasBusyPred = useHasBusyPredecessor();
  // INFO :: running ws and parents influence children functionality
  const ws = useNodesStore((state) => state.nodeIdToWebsocketSession[id]?.ws); // can be undefined
  const session = useNodesStore((state) => state.nodeIdToWebsocketSession[id]?.session); // can be undefined
  const getNodeIdToWebsocketSession = useNodesStore((state) => state.getNodeIdToWebsocketSession);
  const setNodeIdToWebsocketSession = useNodesStore((state) => state.setNodeIdToWebsocketSession);
  const wsRunning = useNodesStore((state) => state.getWsRunningForNode(id));
  const predecessorRunning = useNodesStore((state) => state.getWsRunningForNode(data.predecessor) ?? false);
  const getWsRunningForNode = useNodesStore((state) => state.getWsRunningForNode);
  const setPassStateDecisionForGroupNode = useNodesStore((state) => state.setPassStateDecisionForGroupNode);
  // INFO :: 0️⃣ empty output type functionality
  const setOutputTypeEmpty = useNodesStore((state) => state.setOutputTypeEmpty);
  // INFO :: queue 🚶‍♂️🚶‍♀️🚶‍♂️functionality
  const queues = useNodesStore((state) => state.queues[id]); // listen to the queues of the group node
  const executionState = useNodesStore((state) => state.groupNodesExecutionStates[id]); // can be undefined
  const setExecutionStateForGroupNode = useNodesStore((state) => state.setExecutionStateForGroupNode);
  const setmsgIdToExecInfo = useWebSocketStore((state) => state.setMsgIdToExecInfo);
  const deleteOutput = useDeleteOutput();
  // INFO :: 🛑INTERRUPT KERNEL
  const clearQueue = useNodesStore((state) => state.clearQueue);
  const getExecutionStateForGroupNode = useNodesStore((state) => state.getExecutionStateForGroupNode);
  const resetExecCounts = useResetExecCounts();
  // INFO :: show order
  const setShowOrder = useNodesStore((state) => state.setShowOrder);
  const exportOrderSetting = useSettingsStore((state) => state.exportOrder);
  // INFO :: 🧫 CELL BRANCH
  const onCellBranchOut = useCellBranch(id);
  const resetCellBranch= useCellBranchReset();
  const setIsCellBranchActive = useNodesStore((state) => state.setIsCellBranchActive);
  const isCellBranchActive = useNodesStore((state) => state.isCellBranchActive);
  const getClickedNodeOrder = useNodesStore((state) => state.getClickedNodeOrder);
  // INFO :: RUN BRANCH
  const runBranchActive = useNodesStore((state) => state.groupNodesRunBranchActive[id]); // can be undefined
  const setRunBranchActiveForGroupNodes = useNodesStore((state) => state.setRunBranchActiveForGroupNodes);
  const setInfluenceStateForGroupNode = useNodesStore((state) => state.setInfluenceStateForGroupNode);
  const getOutputsForNodeId = useNodesStore((state) => state.getOutputsForNodeId);
  const [, forceUpdate] = useState<{}>();
  // INFO :: execution graph
  const [showExecutionGraph, setShowExecutionGraph] = useState(false);
  // INFO :: HISTORY
  const updateExportImportHistory = useUpdateHistory();
  const addToHistory = useExecutionStore((state) => state.addToHistory);
  const clearHistory = useExecutionStore((state) => state.clearHistory);
  const addDeletedNodeIds = useExecutionStore((state) => state.addDeletedNodeIds);

  useEffect(() => {
    const addEventListeners = async () => {
      // add a open and a close listener (for initial render, ensure correct ws status is known)
      ws.addEventListener("open", () => forceUpdate({}) );
      ws.addEventListener("close", () => forceUpdate({}) );
      return () => { // remove them when component unmounts
        ws.removeEventListener("open", () => forceUpdate({}) );
        ws.removeEventListener("close", () => forceUpdate({}) );
      };
    }
    if (ws) addEventListeners();
  }, [ws]);

  /* function to know if any code cell in the given node_id group node had an error */
  const anyChildHasError = useCallback((node_id: string) => {
    const children = getNodes().filter((n) => n.parentNode === node_id && n.type === NORMAL_NODE);
    for (const child of children) {
      const outputs = getOutputsForNodeId(child.id+"_output");
      if (!outputs) continue;
      if (outputs.some((output: OutputNodeData) => output.outputType === "error")) return true;
    }
    return false;
  }, [getOutputsForNodeId, getNodes]);

  const { minWidth, minHeight, hasChildNodes } = useStore((store) => {
    const childNodes = Array.from(store.nodeInternals.values()).filter(
      (n) => n.parentNode === id
    );
    const rect = getNodesBounds(childNodes);
    const node = getNode(id);
    if (childNodes.length === 0) {
      // if there are no child nodes, return the default width and height
      return {
        minWidth: MIN_WIDTH_GROUP,
        minHeight: MIN_HEIGHT_GROUP,
        hasChildNodes: childNodes.length > 0,
      };
    } else {
      return {
        minWidth: (rect.x - node!.position.x) + rect.width + PADDING * 2,
        minHeight: (rect.y - node!.position.y) + rect.height + PADDING * 2,
        hasChildNodes: childNodes.length > 0,
      };
    }
  }, isEqual);

  // initially, set the kernel to IDLE
  useEffect(() => {
    setExecutionStateForGroupNode(id, {nodeId: "", state: KERNEL_IDLE});
  }, []);

  // Function to set a modal state
  const setModalState = (modalName: string, newValue: boolean) => {
    setModalStates((prevState) => ({
      ...prevState,
      [modalName]: newValue,
    }));
  };

  // INFO :: queue 🚶‍♂️🚶‍♀️🚶‍♂️functionality
  useEffect(() => {
    if (queues){
      // if the queue is empty, do nothing
      if (queues && queues.length === 0) {
        return;
      }
      // if the queue is not empty and the current status is busy, do nothing
      else if (executionState && executionState.state === KERNEL_BUSY) {
        return;
      // if the queue is not empty and the current status is not busy, execute the next item in the queue
      } else {
        // execute next item in the queue
        const [simpleNodeId, code] = queues[0];
        // set the current status to busy
        setExecutionStateForGroupNode(id, {nodeId: simpleNodeId, state: KERNEL_BUSY});
        // execute the next item
        const msg_id = uuidv4();
        const message = generateMessage(msg_id, code);
        setmsgIdToExecInfo({ [msg_id]: { nodeId: simpleNodeId, executedParent: id, code: code } });
        if (wsRunning) {
          const outputNodeId= simpleNodeId + "_output";
          deleteOutput(outputNodeId);
          // INFO :: 0️⃣ empty output type functionality
          setOutputTypeEmpty(outputNodeId, false); 
          ws.send(JSON.stringify(message));
        } else {
          console.error("websocket is not connected");
        }
      }
    }
  }, [queues]);

  /* DELETE */
  const onDelete = async () => setModalState("showConfirmModalDelete", true);

  const deleteGroup = async () => {
    removeGroupNode(id, true);
    setModalState("showConfirmModalDelete", false);
    // get the deleted id for the execution graph
    const childNodeIds = Array.from(store.getState().nodeInternals.values())
    .filter((n) => n.parentNode === id)
    .map((n) => n.id);
    // create and array with id and childNodeIds
    const deletedIds = [id, ...childNodeIds];
    addDeletedNodeIds(deletedIds);
  };

  /* BRANCH OUT */
  const handleBranchOut = useBubbleBranchClick(id);

  const onBranchOut = async () => {
    setIsBranching(true);
    await handleBranchOut();
    setIsBranching(false);
  };

  const MySwal = withReactContent(Swal);
  const showAlertBranchOutOff = (message: string) => {
    MySwal.fire({ 
      title: <strong>Branch out warning!</strong>,
      html: <i>{message}</i>,
      icon: "warning",
    });
  };

  // INFO :: 🧫 CELL BRANCH
  useEffect(() => {
    const onCellBranchEnd = async () => {
      setIsBranching(true);
      const pickedNodeIds: NodeProps['id'][] = getClickedNodeOrder();
      // create new group node
      try {
        const newGroupNodeId: string = await onCellBranchOut();
        if (newGroupNodeId === '') return;
        // assignment of picked nodes to the new group node 
        await new Promise(resolve => setTimeout(resolve, 500)); // wait until branching is done
        // if no nodes were picked, return (should never happen, because button is disabled)
        if (pickedNodeIds.length === 0) return;
        // assign the picked nodes to the new group node
        const allNodes: Node[] = store.getState().getNodes()
            .map((n) => {
                if (pickedNodeIds.includes(n.id)) return {...n, parentNode: newGroupNodeId};
                return n;
            })
            .sort(sortNodes);
        setNodes(allNodes);
        // execute selected nodes on the new group node
        await new Promise(resolve => setTimeout(resolve, 1000)); // wait until websocket is connected
        fitView({ padding: 0.4, duration: 800, nodes: [{ id: newGroupNodeId }] }); // zoom to the new group node
        await runAllInGroup(newGroupNodeId, pickedNodeIds, true);
        setIsBranching(false); // end of cell branch
        resetCellBranch(); // reset cell branch state back to default
        // when the kernel is idle, set the influence state to true (make edge flow again by default)
        while (getExecutionStateForGroupNode(newGroupNodeId).state !== KERNEL_IDLE) {
          // console.log('Waiting for kernel ' + newGroupNodeId + ' to be idle');
          await new Promise(resolve => setTimeout(resolve, 50));
        }
        setInfluenceStateForGroupNode(id, true); 
      } catch (error) {
          console.error("An error occurred during the cell branch:", error);
      }
    };
    // check if this group node is eligible to conduct cell branch
    if (isCellBranchActive.id === id){
      // start branching out
      onCellBranchEnd();
    }
  }, [isCellBranchActive.isConfirmed]);

  const onCellBranchStart = useCallback(async () => {
    setIsCellBranchActive(id, true);
    fitView({ padding: 0.4, duration: 800, nodes: [{ id: id }] });
    // make the group node not selected to get rid of the toolbar above it
    setNodes((nds) => {
      return nds.map((n) => {
        if (n.id === id) {
          return { ...n, selected: false };
        }
        return { ...n };
      });
    });
  }, [setIsCellBranchActive, fitView, setNodes]);

  /* RESTART */
  const onRestart = async () => setModalState("showConfirmModalRestart", true);

  /** 
   * restarts the kernel (call to /restart) and creates a new websocket connection 
   * By default, restart THIS kernel. If node_id is given, restart the kernel of the node with the given id.
  */
  const restartKernel = async (fetchParent: boolean = false, node_id: string | null = null) => {
    console.log('Restarting kernel')
    axios.defaults.headers.common['Authorization'] = `Bearer ${token}`
    setIsReconnecting(true);
    setModalState("showConfirmModalRestart", false);

    // Restart the kernel of either THIS node or the given node
    const oldWs = node_id ? getNodeIdToWebsocketSession(node_id)?.ws : ws;
    const activeSession = node_id ? getNodeIdToWebsocketSession(node_id)?.session! : session;
    await axios.post(`${serverURL}/api/kernels/${activeSession.kernel.id}/restart`);
    oldWs.close();
    clearHistory(node_id ?? id);
    const newWs = await startWebsocket(activeSession.id!, activeSession.kernel.id!, token, setLatestExecutionOutput, setLatestExecutionCount);
    setNodeIdToWebsocketSession(node_id ?? id, newWs, undefined); // only update the ws, keep the session

    await fetchFromParentOrNot(fetchParent, node_id);
  };

  const startNewSession = async (fetchParent: boolean = false, node_id: null | string = null) => {
    setIsReconnecting(true);
    setModalState("showConfirmModalReconnect", false);
    console.log('Starting new session')
    // start new session for either THIS node or the given node
    const {ws, session} = await createSession(node_id ?? id, path, token, setLatestExecutionOutput, setLatestExecutionCount);
    setNodeIdToWebsocketSession(node_id ?? id, ws, session); // update both ws and session

    await fetchFromParentOrNot(fetchParent, node_id);
    // isReconnecting = false at end of fetchFromParentOrNot
  };

  const fetchFromParentOrNot = async (fetchParent: boolean, node_id: string | null = null) => {
    // wait until the websocket is connected
    while (getWsRunningForNode(node_id ?? id) !== true) {
      // console.log('Waiting for websocket in node ' + (node_id ?? id) + ' to be connected');
      await new Promise(resolve => setTimeout(resolve, 50));
    }
    // fetch parent state if fetchParent is true
    if (fetchParent) {
      // console.log("LOAD PARENT")
      await fetchParentState(node_id);
      setPassStateDecisionForGroupNode(node_id ?? id, true); // turn the incoming edge ON if the parent was loaded
    } else if (predecessor && predecessorRunning) {
      // console.log("DON'T LOAD PARENT")
      setPassStateDecisionForGroupNode(node_id ?? id, false); // // turn the incoming edge OFF if the parent was not loaded (should always just be id)
    }
    setIsReconnecting(false);
  }

  /* SHUTDOWN */
  const onShutdown = async () => setModalState("showConfirmModalShutdown", true);

  const shutdownKernel = async () => {
    console.log('Shutting kernel down')
    ws.close();
    axios.defaults.headers.common['Authorization'] = `Bearer ${token}`
    await axios.delete(`${serverURL}/api/sessions/`+session.id);
    clearHistory(id);
    setModalState("showConfirmModalShutdown", false);
  };

  /* RECONNECT */
  const onReconnect = async () => {
    if (predecessor && predecessorRunning) setModalState("showConfirmModalReconnect", true);
    else startNewSession();
  }

  /* RUN ALL */
  const runAllInGroup = useRunAll();
  const onRunAll = async () => setModalState("showConfirmModalRunAll", true);

  const runAll = async (restart: boolean = false, fetchParent: boolean = false) => {
    if (restart) await restartKernel(fetchParent);
    setModalState("showConfirmModalRunAll", false);
    runAllInGroup(id, [], false); // keep edges how they are
  };

  /* RUN BRANCH */
  const onRunBranch = async () => setModalState("showConfirmModalRunBranch", true);
  const runBranch = async (restart: boolean = false) => {
    // for all successors, turn influence state off immediately
    if (data.successors) for (const succ of data.successors) setInfluenceStateForGroupNode(succ, false);
    const groupNodes = getGroupNodesOrdered();
    setRunBranchActiveForGroupNodes(groupNodes, true);
    for (const groupNodeId of groupNodes) {
      console.log('Running group node: ' + groupNodeId);
      // check if node is running
      const isRunning = getWsRunningForNode(groupNodeId);
      if (!isRunning) await startNewSession(true, groupNodeId); // fetchParent is always true
      else if (restart) await restartKernel(true, groupNodeId); // fetchParent is always true when restarting in run branch
      else {
        await fetchFromParentOrNot(true, groupNodeId); // if neither shutdown nor restart, fetch parent state anyways
        setInfluenceStateForGroupNode(groupNodeId, true); // since there was no restart, manually triggering the influence state to be on
      }

      setModalState("showConfirmModalRunBranch", false); // close modal rather quickly
      await runAllInGroup(groupNodeId, [], true);
      // wait until the kernel is idle
      while (getExecutionStateForGroupNode(groupNodeId).state !== KERNEL_IDLE) {
        // console.log('Waiting for kernel ' + groupNodeId + ' to be idle');
        await new Promise(resolve => setTimeout(resolve, 50));
      }
      setRunBranchActiveForGroupNodes([groupNodeId], false);
      // if any child has an error, stop running the branch
      if (anyChildHasError(groupNodeId)) {
        setRunBranchActiveForGroupNodes(groupNodes, false);
        break;
      }
    };
  };

  const getGroupNodesOrdered = () => {
    const groupNodes: string[] = [id];
    let currentPredecessor = predecessor;
    while (currentPredecessor) {
      groupNodes.push(currentPredecessor.id);
      currentPredecessor = getNode(currentPredecessor.data.predecessor);
    }
    groupNodes.reverse();
    return groupNodes;
  }

  /* EXPORT */
  const onExporting = async () => {
    const fileName = path.split('/').pop()!;
    await exportToJupyterNotebook(getNodes(), id, fileName, exportOrderSetting);
  };

  /* Cancel method for all modals */
  const continueWorking = () => {
    if (modalStates.showConfirmModalRestart) setModalState("showConfirmModalRestart", false);
    if (modalStates.showConfirmModalShutdown) setModalState("showConfirmModalShutdown", false);
    if (modalStates.showConfirmModalDelete) setModalState("showConfirmModalDelete", false);
    if (modalStates.showConfirmModalReconnect) setModalState("showConfirmModalReconnect", false);
    if (modalStates.showConfirmModalRunAll) setModalState("showConfirmModalRunAll", false);
    if (modalStates.showConfirmModalRunBranch) setModalState("showConfirmModalRunBranch", false);
  };

  const fetchParentState = async (node_id: string | null = null) => {
    var parentId, childId;
    // fetch parent state for the given node
    if (node_id) {
      const node = getNode(node_id);
      if (!node || !node.data.predecessor) return;
      parentId = node.data.predecessor;
      childId = node_id;
    // fetch parent state for THIS node
    } else {
      if (!predecessor || !predecessorRunning) return;
      parentId = predecessor.id;
      childId = id;
    }
    const parentKernel = getNodeIdToWebsocketSession(parentId)?.session?.kernel.id!;
    const childKernel = getNodeIdToWebsocketSession(childId)?.session?.kernel.id!;
    const dill_path = path.split('/').slice(0, -1).join('/');
    const {parent_exec_count, child_exec_count} = await passParentState(token, dill_path, parentKernel, childKernel);
    updateExportImportHistory({
      parent_id: parentId,
      parent_exec_count: parent_exec_count ?? 0,
      child_id: childId,
      child_exec_count: child_exec_count ?? 0,
    });
  };

  // INFO :: 🛑INTERRUPT KERNEL
  const interruptKernel = () => {
    if (wsRunning && executionState && executionState.state !== KERNEL_IDLE) {
      onInterrupt(token, session?.kernel.id!);
      clearQueue(id);
      const nodeRunning = getExecutionStateForGroupNode(id).nodeId;
      setExecutionStateForGroupNode(id, {nodeId: nodeRunning, state: KERNEL_INTERRUPTED});
      resetExecCounts(id, nodeRunning);
    }
  };

  // INFO :: Kernel Info
  const toggleKernelInfo = () => {
    if (Object.keys(installedPackages).length === 0) fetchInstalledPackages();
    setShowKernelInfo(!showKernelInfo);
  }

  const fetchInstalledPackages = async () => {
    setInstalledPackages({});
    axios.defaults.headers.common['Authorization'] = `Bearer ${token}`
    const requestBody = { "kernel_id": session?.kernel.id };
    const response = await axios.post(`${serverURL}/canvas_ext/installed`, requestBody);
    setInstalledPackages(response.data.packages);
    addToHistory(id, {
      node_id: id, // provide the group node itself in case of installed packages
      execution_count: response.data.execution_count,
      type: ExecInfoT.LoadLibraries,
    });
  }

  const renderKernelInfo = () => {
    return (
      <div className="kernelinfo nowheel">
        <div className="infoicon" onClick={fetchInstalledPackages}>
          <FontAwesomeIcon className="icon" icon={faArrowRotateRight} />
        </div>
        <div className="header">Kernel Information</div>
        <table>
          <tbody>
            <tr>
              <td>Name</td>
              <td>{session?.kernel.name}</td>
            </tr>
            <tr>
              <td>Running On&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;</td>
              <td>Local Machine</td>
            </tr>
          </tbody>
        </table>
        <div className="header" style={{marginTop: '6px'}}>Installed Packages</div>
        {Object.keys(installedPackages).length !== 0 ? (
        <table>
          <thead>
            <tr>
              <th>Name</th>
              <th>Version</th>
            </tr>
          </thead>
          <tbody>
            {Object.keys(installedPackages).map((key) => (
              <tr key={key}>
                <td>{key}</td>
                <td>{installedPackages[key]}</td>
              </tr>
            ))}
          </tbody>
        </table>
        ) : (
          <Spinner
            style={{marginLeft: '62px', marginTop: '10px'}}
            as="span"
            animation="border"
            size="sm"
            role="status"
            aria-hidden="true"
          />
        )}
      </div>
    )
  }

  // INFO :: execution graph
  const toggleExecutionGraph = () => {
    if (showExecutionGraph) setShowExecutionGraph(false);
    else setShowExecutionGraph(true);
  };

  const renderToggleExecutionGraph = () => {
    return (
      // COMMENT :: button to show execution graph
      <button
        className="exegraph-button nodrag"
        title="Show execution graph"
        onClick={toggleExecutionGraph}
      >
        <FontAwesomeIcon className="exegraph-button-icon" icon={faCodeCommit}/>
      </button>
    )
  };
 
  const renderExecutionGraph = () => {
    return (
      showExecutionGraph &&
      (
      <div className = "exegraph-flow-container">
        <ReactFlowProvider>
          <ExecutionGraph id={id} />
        </ReactFlowProvider>
      </div>
      )
    )
  };

  const displayExecutionState = useCallback(() => {
    if (runBranchActive) return <div className="kernelBusy"><FontAwesomeIcon icon={faSpinner} spin /> Running Branch...</div>
    if (wsRunning) {
      if (executionState?.state === KERNEL_IDLE) {
        if (hasBusySucc(id)) {
          return <div className="kernelBusy"><FontAwesomeIcon icon={faSpinner} spin /> Influenced child busy...</div>
        } else if (hasBusyPred(id)) {
          return <div className="kernelBusy"><FontAwesomeIcon icon={faSpinner} spin /> Influence happening...</div>
        } else {
          return <div className="kernelOn"><FontAwesomeIcon icon={faCircleChevronDown} /> Idle</div>
        }
      } else if (executionState?.state === KERNEL_BUSY) {
        return <div className="kernelBusy"><FontAwesomeIcon icon={faSpinner} spin /> Busy...</div>
      } else if (executionState?.state === KERNEL_BUSY_FROM_PARENT) {
        return <div className="kernelBusy"><FontAwesomeIcon icon={faSpinner} spin /> Busy from Parent...</div>
      } else if (executionState?.state === KERNEL_INTERRUPTED) {
        return <div className="kernelBusy"><FontAwesomeIcon icon={faSpinner} spin /> Interrupting...</div>
      }
    } else if (isReconnecting) {
      return <div className="kernelBusy"><FontAwesomeIcon icon={faSpinner} spin /> Reconnecting...</div>
    } else if (!wsRunning && executionState?.state === KERNEL_IDLE) {
      return <div className="kernelOff"><FontAwesomeIcon icon={faCircleXmark} /> Shutdown</div>
    }
    // Return null if none of the conditions are met
    return null;
  }, [wsRunning, executionState, runBranchActive, isReconnecting, hasBusySucc, hasBusyPred]);

  return (
     <div> 
      {displayExecutionState()}
      <NodeResizer
        lineStyle={lineStyle}
        handleStyle={handleStyle}
        minWidth={minWidth}
        minHeight={minHeight}
      />
      <NodeToolbar className="nodrag">
        <button onClick={onDelete} title="Delete Kernel 🗑️">
          <FontAwesomeIcon className="icon" icon={faTrashAlt} />
        </button>
        {wsRunning && <button onClick={interruptKernel} title="Interrupt Kernel ⛔"> 
          <FontAwesomeIcon className="icon" icon={faSquare} />
        </button>}
        {wsRunning && <button onClick={onRestart} title={"Restart Kernel 🔄"}> 
          <FontAwesomeIcon className="icon" icon={faArrowRotateRight} />
        </button>}
        {wsRunning && <button onClick={onRunAll} title="Run All ⏩"
        onMouseEnter={() => setShowOrder(id, RUNALL_ACTION)} onMouseLeave={() => setShowOrder('', '')}>
          <FontAwesomeIcon className="icon" icon={faForward} />
        </button>}
        {(wsRunning && data.predecessor) && <button onClick={onRunBranch} title="Run Branch up until Kernel ⏩"
        onMouseEnter={() => setShowOrder(id, RUNBRANCH_ACTION)} onMouseLeave={() => setShowOrder('', '')}>
          <FontAwesomeIcon className="icon" icon={faForwardFast} />
        </button>}
        <button onClick={wsRunning ? onShutdown : onReconnect} title={wsRunning ? "Shutdown Kernel ❌" : "Reconnect Kernel ▶️"} disabled={isReconnecting}> 
          <FontAwesomeIcon className="icon" icon={wsRunning ? faPowerOff : faCirclePlay} />
        </button>
        {/* Disable branching out functionality when code is running or kernel is shut */}
        {((wsRunning && executionState?.state !== KERNEL_IDLE) || 
            (hasBusyPred(id))) ? (
          <button onClick={() => showAlertBranchOutOff("Wait until kernel is idle 😴!")} title="Code is running ➡️ Branching disabled 🚫"> 
            <FontAwesomeIcon className="icon-disabled" icon={faNetworkWired}/>
          </button>
        ) : (wsRunning) ? (
          <button onClick={onBranchOut} title="Branch out 🍃"> 
            <FontAwesomeIcon className="icon" icon={faNetworkWired}/>
          </button>
        ) : (
          <button onClick={() => showAlertBranchOutOff("Connect the kernel to enable branching!")} title="Kernel is shut ➡️ Branching disabled 🚫"> 
            <FontAwesomeIcon className="icon-disabled" icon={faNetworkWired}/>
          </button>
        )}
        {/* Disable branching out functionality when code is running or kernel is shut */}
        {((wsRunning && executionState?.state !== KERNEL_IDLE) || 
            (hasBusyPred(id))) ? (
          <button onClick={() => showAlertBranchOutOff("Wait until kernel is idle 😴!")} title="Code is running ➡️ Branching disabled 🚫">
            <FontAwesomeIcon className="icon-disabled" icon={faArrowDownUpAcrossLine}/>
          </button>
        ) : (
          <button onClick={onCellBranchStart} title="Split Kernel: Pick cells and split the kernel ✂️">
            <FontAwesomeIcon className="icon" icon={faArrowDownUpAcrossLine}/>
          </button>
        )}
        <button onClick={onExporting} title="Export to Jupyter Notebook 📩"
        onMouseEnter={() => setShowOrder(id, EXPORT_ACTION)} onMouseLeave={() => setShowOrder('', '')}>
          <FontAwesomeIcon className="icon" icon={faFileExport}/>
        </button>
      </NodeToolbar>
      <Handle className="handle-group-top" type="target" position={Position.Top} isConnectable={false} />
      <Handle className="handle-group-bottom" type="source" position={Position.Bottom} isConnectable={false} />
      <CustomConfirmModal 
        title="Restart Kernel?" 
        message={"Are you sure you want to restart the kernel? All variables will be lost!" + 
                 ((predecessor && predecessorRunning) ? " If yes, do you want to load the parent state?" : "")} 
        show={modalStates.showConfirmModalRestart} 
        onHide={continueWorking} 
        onConfirm={() => restartKernel(false)}
        confirmText={"Restart"}
        onConfirm2={() => restartKernel(true)}
        confirmText2={(predecessor && predecessorRunning) ? "Restart (Load Parent)" : ""}
      />
      <CustomConfirmModal 
        title="Load parent state?" 
        message="Do you want to load the parent state when reconnecting?" 
        show={modalStates.showConfirmModalReconnect} 
        denyText="Cancel"
        onHide={continueWorking} 
        onConfirm={() => startNewSession(true)}
        confirmText={"Load parent"}
        onConfirm2={() => startNewSession(false)}
        confirmText2={"Don't load parent"}
        variants={["success", "success"]}
      />
      <CustomConfirmModal 
        title="Shutdown Kernel?" 
        message="Are you sure you want to shutdown the kernel? All variables will be lost!" 
        show={modalStates.showConfirmModalShutdown} 
        onHide={continueWorking} 
        onConfirm={shutdownKernel} 
        confirmText="Shutdown"
      />
      <CustomConfirmModal 
        title="Delete Kernel?" 
        message={"Are you sure you want to delete the group" + (wsRunning ? " and shutdown the kernel?" : "?") + " All cells will be deleted" + (wsRunning ? " and all variables will be lost!" : "!")}
        show={modalStates.showConfirmModalDelete} 
        onHide={continueWorking} 
        onConfirm={deleteGroup} 
        confirmText="Delete"
      />
      <CustomConfirmModal 
        title="Restart Kernel before Run All?" 
        message="Do you want to restart the kernel before running all? If yes, all variables will be lost!" 
        show={modalStates.showConfirmModalRunAll} 
        denyText="Cancel"
        onHide={continueWorking} 
        onConfirm={() => runAll(false, false)} 
        confirmText="Just Run"
        onConfirm2={() => runAll(true, false)}
        confirmText2="Restart"
        onConfirm3={() => runAll(true, true)}
        confirmText3={(predecessor && predecessorRunning) ? "Restart (Load Parent)" : ""}
        variants={["success", "danger", "danger"]}
      />
      <CustomConfirmModal 
        title="Restart Kernels before Running Branch?" 
        message="Do you want to restart the kernels before running branch? If yes, all variables will be lost! In case a kernel is not running, it will be started." 
        show={modalStates.showConfirmModalRunBranch} 
        denyText="Cancel"
        onHide={continueWorking} 
        onConfirm={() => runBranch(false)} 
        confirmText="Just Run"
        onConfirm2={() => runBranch(true)}
        confirmText2="Restart"
        variants={["success", "danger"]}
      />
      <CustomInformationModal show={isBranching} text='Branching Out...' />
      {wsRunning && <div className="infoicon nodrag" title="Show kernel info ℹ️" onClick={toggleKernelInfo}>
        <FontAwesomeIcon className="icon" icon={faCircleInfo}/>
      </div>}
      {wsRunning && showKernelInfo && renderKernelInfo()}
      {/* INFO :: execution graph */}
      {renderToggleExecutionGraph()}
      {renderExecutionGraph()}
    </div>
  );
}

type IsEqualCompareObj = {
  minWidth: number;
  minHeight: number;
  hasChildNodes: boolean;
};

function isEqual(prev: IsEqualCompareObj, next: IsEqualCompareObj): boolean {
  return (
    prev.minWidth === next.minWidth &&
    prev.minHeight === next.minHeight &&
    prev.hasChildNodes === next.hasChildNodes
  );
}

export default memo(GroupNode);
