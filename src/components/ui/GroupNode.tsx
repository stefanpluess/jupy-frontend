import { memo, useCallback, useEffect, useState } from "react";
import {
  getRectOfNodes,
  Handle,
  NodeProps,
  NodeToolbar,
  Position,
  useReactFlow,
  useStore,
  useStoreApi,
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
  faForward
} from "@fortawesome/free-solid-svg-icons";
import { useDetachNodes, useBubbleBranchClick, usePath, useDeleteOutput, useHasBusySuccessors, useHasBusyPredecessor, useResetExecCounts, useRunAll } from "../../helpers/hooks";
import { useWebSocketStore } from "../../helpers/websocket";
import axios from "axios";
import { startWebsocket, createSession, onInterrupt } from "../../helpers/websocket/websocketUtils";
import CustomConfirmModal from "./CustomConfirmModal";
import CustomInformationModal from "./CustomInformationModal";
import useNodesStore from "../../helpers/nodesStore";
import { v4 as uuidv4 } from "uuid";
import { exportToJupyterNotebook, generateMessage, passParentState } from "../../helpers/utils";
import {
  KERNEL_IDLE,
  KERNEL_INTERRUPTED,
  KERNEL_BUSY,
  KERNEL_BUSY_FROM_PARENT,
  MIN_WIDTH_GROUP,
  MIN_HEIGHT_GROUP,
  PADDING
} from "../../config/constants";
import withReactContent from "sweetalert2-react-content";
import Swal from "sweetalert2";

const lineStyle = { borderColor: "white" }; // OPTIMIZE - externalize
const handleStyle = { height: 8, width: 8 }; // OPTIMIZE - externalize
const initialModalStates = { // OPTIMIZE - externalize
  showConfirmModalRestart: false,
  showConfirmModalShutdown: false,
  showConfirmModalDelete: false,
  showConfirmModalDetach: false,
  showConfirmModalReconnect: false,
  showConfirmModalRunAll: false,
};


function GroupNode({ id, data }: NodeProps) {
  const [nodeData, setNodeData] = useState(data);
  const store = useStoreApi();
  const token = useWebSocketStore((state) => state.token);
  const path = usePath();
  const setLatestExecutionCount = useWebSocketStore((state) => state.setLatestExecutionCount);
  const setLatestExecutionOutput = useWebSocketStore((state) => state.setLatestExecutionOutput);
  const { deleteElements, getNode, getNodes } = useReactFlow();
  const predecessor = getNode(data.predecessor);
  const [modalStates, setModalStates] = useState(initialModalStates);
  const [isBranching, setIsBranching] = useState(false);
  const [isReconnecting, setIsReconnecting] = useState(false);
  const detachNodes = useDetachNodes();

  const { minWidth, minHeight, hasChildNodes } = useStore((store) => {
    const childNodes = Array.from(store.nodeInternals.values()).filter(
      (n) => n.parentNode === id
    );
    const rect = getRectOfNodes(childNodes);
    const node = getNode(id);
    if (childNodes.length === 0) {
      // if there are no child nodes, return the default width and height
      return {
        minWidth: MIN_WIDTH_GROUP + PADDING * 2,
        minHeight: MIN_HEIGHT_GROUP + PADDING * 2,
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

  // INFO :: running ws and parents influence children functionality
  const wsRunning = useNodesStore((state) => state.groupNodesWsStates[id]);
  const predecessorRunning = useNodesStore((state) => state.groupNodesWsStates[data.predecessor] ?? false);
  const setWsStateForGroupNode = useNodesStore((state) => state.setWsStateForGroupNode);
  const setPassStateDecisionForGroupNode = useNodesStore((state) => state.setPassStateDecisionForGroupNode);

// INFO :: 0️⃣ empty output type functionality
  const setOutputTypeEmpty = useNodesStore((state) => state.setOutputTypeEmpty);

  // INFO :: queue 🚶‍♂️🚶‍♀️🚶‍♂️functionality
  const queues = useNodesStore((state) => state.queues[id]); // listen to the queues of the group node
  const executionState = useNodesStore((state) => state.groupNodesExecutionStates[id]); // can be undefined
  const setExecutionStateForGroupNode = useNodesStore((state) => state.setExecutionStateForGroupNode);
  const setCellIdToMsgId = useWebSocketStore((state) => state.setCellIdToMsgId);
  const deleteOutput = useDeleteOutput();

  const hasBusySucc = useHasBusySuccessors();
  const hasBusyPred = useHasBusyPredecessor();

  // initially, set the ws state to true and execution state to IDLE (only needed bc sometimes, it's not immediately set)
  useEffect(() => {
    setWsStateForGroupNode(id, true);
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
        setCellIdToMsgId({ [msg_id]: simpleNodeId });
        const ws = data.ws;
        if (ws.readyState === WebSocket.OPEN) {
          const outputNodeId= simpleNodeId + "_output";
          deleteOutput(outputNodeId);
          const outputNode = getNode(outputNodeId);
          if (outputNode === undefined) {
            // console.log("outputNode is undefined");
            setTimeout(() => {
              // INFO :: 0️⃣ empty output type functionality
              setOutputTypeEmpty(outputNodeId, false);
              ws.send(JSON.stringify(message));
            }, 25);
          }else{
            // INFO :: 0️⃣ empty output type functionality
            setOutputTypeEmpty(outputNodeId, false); 
            ws.send(JSON.stringify(message));
          }
        } else {
          console.log("websocket is not connected");
        }
      }
    }
  }, [queues]);

  useEffect(() => {
    const handleWebSocketOpen = () => {
      setWsStateForGroupNode(id, true);
      setIsReconnecting(false);
    };
    const handleWebSocketClose = () => setWsStateForGroupNode(id, false);
    if (nodeData.ws) {
      // Add event listeners to handle WebSocket state changes
      nodeData.ws.addEventListener('open', handleWebSocketOpen);
      nodeData.ws.addEventListener('close', handleWebSocketClose);
      // Remove event listeners when the component unmounts
      return () => {
        nodeData.ws.removeEventListener('open', handleWebSocketOpen);
        nodeData.ws.removeEventListener('close', handleWebSocketClose);
      };
    }
  }, [nodeData.ws?.readyState]);

  // from the predecessor, remove the current node from its successors
  const removeFromPredecessor = () => {
    if (predecessor) {
      const updatedSuccessors = predecessor.data.successors.filter((successor: string) => successor !== id);
      predecessor.data.successors = updatedSuccessors;
    }
  };

  /* DELETE */
  const onDelete = async () => setModalState("showConfirmModalDelete", true);

  const deleteGroup = async () => {
    deleteElements({ nodes: [{ id }] });
    if (wsRunning) {
      nodeData.ws.close();
      axios.defaults.headers.common['Authorization'] = `Bearer ${token}`
      await axios.delete('http://localhost:8888/api/sessions/'+nodeData.session.id)
    }
    removeFromPredecessor();
    setModalState("showConfirmModalDelete", false);
  };

  /* DETACH */
  const onDetach = async () => setModalState("showConfirmModalDetach", true);

  const detachGroup = async () => {
    const childNodeIds = Array.from(store.getState().nodeInternals.values())
      .filter((n) => n.parentNode === id)
      .map((n) => n.id);
    detachNodes(childNodeIds, id);
    if (wsRunning) {
      nodeData.ws.close();
      data.ws.close();
      axios.defaults.headers.common['Authorization'] = `Bearer ${token}`
      await axios.delete('http://localhost:8888/api/sessions/'+nodeData.session.id)
    }
    removeFromPredecessor();
    setModalState("showConfirmModalDetach", false);
  };

  /* BRANCH OUT */
  const handleBranchOut = useBubbleBranchClick(id);

  const onBranchOut = async () => {
    setIsBranching(true);
    await handleBranchOut();
    setIsBranching(false);
  };

  const MySwal = withReactContent(Swal);
  const showAlertBranchOutOff = () => {
    MySwal.fire({ 
      title: <strong>Branch out warning!</strong>,
      html: <i>Wait until kernel is idle 😴!</i>,
      icon: "warning",
    });
  };

  /* RESTART */
  const onRestart = async () => setModalState("showConfirmModalRestart", true);

  /* restarts the kernel (call to /restart) and creates a new websocket connection */
  const restartKernel = async (fetchParent: boolean = false) => {
    console.log('Restarting kernel')
    axios.defaults.headers.common['Authorization'] = `Bearer ${token}`
    await axios.post(`http://localhost:8888/api/kernels/${nodeData.session.kernel.id}/restart`)
    // and also restart the websocket connection
    nodeData.ws.close();
    data.ws.close();
    const ws = await startWebsocket(nodeData.session.id, nodeData.session.kernel.id, token, setLatestExecutionOutput, setLatestExecutionCount);
    setNodeData({...nodeData, ws: ws});
    data.ws = ws;
    await fetchFromParentOrNot(fetchParent);
    await new Promise(resolve => setTimeout(resolve, 200));
    setModalState("showConfirmModalRestart", false);
  };

  const startNewSession = async (fetchParent: boolean = false) => {
    setIsReconnecting(true);
    console.log('Starting new session')
    const {ws, session} = await createSession(id, path, token, setLatestExecutionOutput, setLatestExecutionCount);
    setNodeData({...nodeData, ws: ws, session: session});
    data.ws = ws;
    data.session = session;
    await fetchFromParentOrNot(fetchParent);
    setModalState("showConfirmModalReconnect", false);
    // isReconnecting = false when wsState changes (see useEffect)
  };

  const fetchFromParentOrNot = async (fetchParent: boolean) => {
    if (fetchParent) {
      // console.log("LOAD PARENT")
      await fetchParentState();
      setPassStateDecisionForGroupNode(id, true);
    } else {
      // console.log("DON'T LOAD PARENT")
      setTimeout(() => { // setTimeout needed for ws state to update before
        if (predecessor && predecessorRunning) setPassStateDecisionForGroupNode(id, false);
      }, 150);
    }
  }

  /* SHUTDOWN */
  const onShutdown = async () => setModalState("showConfirmModalShutdown", true);

  const shutdownKernel = async () => {
    console.log('Shutting kernel down')
    nodeData.ws.close();
    data.ws.close();
    axios.defaults.headers.common['Authorization'] = `Bearer ${token}`
    await axios.delete('http://localhost:8888/api/sessions/'+nodeData.session.id);
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
    runAllInGroup(id);
  };

  /* EXPORT */
  const onExporting = async () => {
    const fileName = path.split('/').pop()!;
    await exportToJupyterNotebook(getNodes(), id, fileName);
  };

  /* Cancel method for all modals */
  const continueWorking = () => {
    if (modalStates.showConfirmModalRestart) setModalState("showConfirmModalRestart", false);
    if (modalStates.showConfirmModalShutdown) setModalState("showConfirmModalShutdown", false);
    if (modalStates.showConfirmModalDelete) setModalState("showConfirmModalDelete", false);
    if (modalStates.showConfirmModalDetach) setModalState("showConfirmModalDetach", false);
    if (modalStates.showConfirmModalReconnect) setModalState("showConfirmModalReconnect", false);
    if (modalStates.showConfirmModalRunAll) setModalState("showConfirmModalRunAll", false);
  };

  const fetchParentState = async () => {
    if (predecessor && predecessorRunning) {
      await new Promise(resolve => setTimeout(resolve, 200));
      const parentKernel = predecessor.data.session?.kernel.id;
      const childKernel = data.session?.kernel.id;
      const dill_path = path.split('/').slice(0, -1).join('/');
      await passParentState(token, dill_path, parentKernel, childKernel);
    }
  };

  // INFO :: 🛑INTERRUPT KERNEL
  const clearQueue = useNodesStore((state) => state.clearQueue);
  const getExecutionStateForGroupNode = useNodesStore((state) => state.getExecutionStateForGroupNode);
  const resetExecCounts = useResetExecCounts();
  const interruptKernel = () => {
    if (wsRunning && executionState && executionState.state !== KERNEL_IDLE) {
      onInterrupt(token, data.session.kernel.id);
      clearQueue(id);
      const nodeRunning = getExecutionStateForGroupNode(id).nodeId;
      setExecutionStateForGroupNode(id, {nodeId: nodeRunning, state: KERNEL_INTERRUPTED});
      resetExecCounts(id, nodeRunning);
    } else {
      console.log("executionState.state: ", executionState.state)
    }
  };

  const displayExecutionState = useCallback(() => {
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
    } else if (!wsRunning && executionState?.state === KERNEL_IDLE) {
      return <div className="kernelOff"><FontAwesomeIcon icon={faCircleXmark} /> Shutdown</div>
    }
    // Return null if none of the conditions are met
    return null;
  }, [wsRunning, executionState, hasBusySucc, hasBusyPred]);

  return (
    // <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'flex-start', minWidth: '100%', minHeight: '100%' }}></div>
     <div> 
      {displayExecutionState()}
      <NodeResizer
        lineStyle={lineStyle}
        handleStyle={handleStyle}
        minWidth={minWidth}
        minHeight={minHeight}
      />
      {/* TODO: either remove or keep */}
      {/* <NodeResizeControl
        style={CONTROL_STLYE}
        minWidth={minWidth}
        minHeight={minHeight}
      >
        <ResizeIcon />
      </NodeResizeControl> */}
      <NodeToolbar className="nodrag">
        <button onClick={onDelete} title="Delete Group 👥">
          <FontAwesomeIcon className="icon" icon={faTrashAlt} />
        </button>
        {hasChildNodes && <button onClick={onDetach} title="Delete Bubble 🫧">
            <FontAwesomeIcon className="icon" icon={faTrashArrowUp} />
          </button>}
        {wsRunning && <button onClick={interruptKernel} title="Interrupt Kernel ⛔"> 
          <FontAwesomeIcon className="icon" icon={faSquare} />
        </button>}
        {wsRunning && <button onClick={onRestart} title={"Restart Kernel 🔄"}> 
          <FontAwesomeIcon className="icon" icon={faArrowRotateRight} />
        </button>}
        {wsRunning && <button onClick={onRunAll} title="Run All ⏩">
          <FontAwesomeIcon className="icon" icon={faForward} />
        </button>}
        <button onClick={wsRunning ? onShutdown : onReconnect} title={wsRunning ? "Shutdown Kernel ❌" : "Reconnect Kernel ▶️"} disabled={isReconnecting}> 
          <FontAwesomeIcon className="icon" icon={wsRunning ? faPowerOff : faCirclePlay} />
        </button>
        {/* Disable branching out functionality when code is running */}
        {((wsRunning && executionState?.state !== KERNEL_IDLE) || 
            (hasBusyPred(id))) ? (
          <button onClick={showAlertBranchOutOff} title="Branch out 🍃 temporary disabled 🚫"> 
            <FontAwesomeIcon className="icon-branchOutOff" icon={faNetworkWired}/>
          </button>
        ) : (
          <button onClick={onBranchOut} title="Branch out 🍃"> 
            <FontAwesomeIcon className="icon" icon={faNetworkWired}/>
          </button>
        )}
        <button onClick={onExporting} title="Export to Jupyter Notebook 📩"> 
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
        title="Delete Group?" 
        message="Are you sure you want to delete the group and shutdown the kernel? All cells will be deleted and all variables will be lost!" 
        show={modalStates.showConfirmModalDelete} 
        onHide={continueWorking} 
        onConfirm={deleteGroup} 
        confirmText="Delete"
      />
      <CustomConfirmModal 
        title="Delete Bubble?" 
        message="Are you sure you want to delete the bubble and shutdown the kernel? The cells will remain, but all variables will be lost!" 
        show={modalStates.showConfirmModalDetach} 
        onHide={continueWorking} 
        onConfirm={detachGroup} 
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
      <CustomInformationModal show={isBranching} text='Branching Out...' />
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
