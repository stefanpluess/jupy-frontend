import { memo, useEffect, useState } from "react";
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
} from "@fortawesome/free-solid-svg-icons";
import {useDetachNodes, useBubbleBranchClick, usePath, useDeleteOutput} from "../../helpers/hooks";
import { useWebSocketStore } from "../../helpers/websocket";
import axios from "axios";
import { startWebsocket, createSession } from "../../helpers/websocket/websocketUtils";
import CustomConfirmModal from "./CustomConfirmModal";
import CustomInformationModal from "./CustomInformationModal";
import useNodesStore from "../../helpers/nodesStore";
import { v4 as uuidv4 } from "uuid";
import { exportToJupyterNotebook, generateMessage, passParentState } from "../../helpers/utils";

const lineStyle = { borderColor: "white" }; // OPTIMIZE - externalize
const handleStyle = { height: 8, width: 8 }; // OPTIMIZE - externalize
const padding = 25; // OPTIMIZE - externalize


function GroupNode({ id, data }: NodeProps) {
  const [nodeData, setNodeData] = useState(data);
  const store = useStoreApi();
  const token = useWebSocketStore((state) => state.token);
  const path = usePath();
  const setLatestExecutionCount = useWebSocketStore((state) => state.setLatestExecutionCount);
  const setLatestExecutionOutput = useWebSocketStore((state) => state.setLatestExecutionOutput);
  const { deleteElements, getNode, getNodes } = useReactFlow();
  const predecessor = getNode(data.predecessor);
  const [showConfirmModalRestart, setShowConfirmModalRestart] = useState(false);
  const [showConfirmModalShutdown, setShowConfirmModalShutdown] = useState(false);
  const [showConfirmModalDelete, setShowConfirmModalDelete] = useState(false);
  const [showConfirmModalDetach, setShowConfirmModalDetach] = useState(false);
  const [isBranching, setIsBranching] = useState(false);
  const [isStarting, setIsStarting] = useState(false);
  const detachNodes = useDetachNodes();
  const { minWidth, minHeight, hasChildNodes } = useStore((store) => {
    const childNodes = Array.from(store.nodeInternals.values()).filter(
      (n) => n.parentNode === id
    );
    const rect = getRectOfNodes(childNodes);

    if (childNodes.length === 0) {
      // if there are no child nodes, return the default width and height
      return {
        minWidth: 50 + padding * 2,
        minHeight: 50 + padding * 2,
        hasChildNodes: childNodes.length > 0,
      };
    }else{
      return {
        minWidth: rect.width + padding * 2,
        minHeight: rect.height + padding * 2,
        hasChildNodes: childNodes.length > 0,
      };
    }
  }, isEqual);

  const wsRunning = useNodesStore((state) => state.groupNodesWsStates[id] ?? true);
  const predecessorRunning = useNodesStore((state) => state.groupNodesWsStates[data.predecessor] ?? true);
  const setWsStateForGroupNode = useNodesStore((state) => state.setWsStateForGroupNode);

  // INFO :: queue 🚶‍♂️🚶‍♀️🚶‍♂️functionality
  const queues = useNodesStore((state) => state.queues[id]); // listen to the queues of the group node
  const isExecuting = useNodesStore((state) => state.groupNodesExecutionStates[id]);
  const setExecutionStateForGroupNode = useNodesStore((state) => state.setExecutionStateForGroupNode);
  const setCellIdToMsgId = useWebSocketStore((state) => state.setCellIdToMsgId);
  // const deleteOutput = useDeleteOutput();

  // INFO :: queue 🚶‍♂️🚶‍♀️🚶‍♂️functionality
  useEffect(() => {
    // console.log("Queue changed for GROUP: ", id);
    if (queues){
      // if the queue is empty, do nothing
      if (queues && queues.length === 0) {
        // console.log("Queue is empty for GROUP: ", id);
        return;
      }
      // if the queue is not empty and the current status is running, do nothing
      else if (isExecuting) {
        // console.log("Queue is not empty and isExecuting is true for GROUP: ", id);
        return;
      // if the queue is not empty and the current status is not running, execute the next item in the queue
      } else {
        // console.log("Queue is not empty and isExecuting is false for GROUP: ", id);
        // execute next item in the queue
        const [simpleNodeId, code] = queues[0];
        // set the current status to running
        setExecutionStateForGroupNode(id, true);
        // execute the next item
        const msg_id = uuidv4();
        const message = generateMessage(msg_id, code);
        setCellIdToMsgId({ [msg_id]: simpleNodeId });
        const ws = data.ws;
        if (ws.readyState === WebSocket.OPEN) {
          // deleteOutput(simpleNodeId + "_output");
          ws.send(JSON.stringify(message));
        } else {
          console.log("websocket is not connected");
        }
      }
    } else {
      console.error("Queue is undefined for GROUP: ", id);
    }
  }, [queues]);

  useEffect(() => {
    const handleWebSocketOpen = () => setWsStateForGroupNode(id, true);
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

  /* DELETE */
  const onDelete = async () => {
    setShowConfirmModalDelete(true);
  };

  const deleteGroup = async () => {
    deleteElements({ nodes: [{ id }] });
    if (wsRunning) {
      nodeData.ws.close();
      axios.defaults.headers.common['Authorization'] = `Bearer ${token}`
      await axios.delete('http://localhost:8888/api/sessions/'+nodeData.session.id)
    }
    setShowConfirmModalDelete(false);
  };

  /* DETACH */
  const onDetach = () => {
    setShowConfirmModalDetach(true);
  };

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
    setShowConfirmModalDetach(false);
  };

  /* BRANCH OUT */
  const handleBranchOut = useBubbleBranchClick(id);

  const onBranchOut = async () => {
    setIsBranching(true);
    await handleBranchOut();
    setIsBranching(false);
  };

  /* INTERRUPT */
  const onInterrupt = async () => {
    console.log('Interrupting kernel')
    axios.defaults.headers.common['Authorization'] = `Bearer ${token}`
    await axios.post(`http://localhost:8888/api/kernels/${nodeData.session.kernel.id}/interrupt`)
  };

  /* RESTART */
  const onRestart = () => {
    if (wsRunning) setShowConfirmModalRestart(true);
    else startNewSession();
  };

  /* restarts the kernel (call to /restart) and creates a new websocket connection */
  const restartKernel = async () => {
    console.log('Restarting kernel')
    axios.defaults.headers.common['Authorization'] = `Bearer ${token}`
    await axios.post(`http://localhost:8888/api/kernels/${nodeData.session.kernel.id}/restart`)
    // and also restart the websocket connection
    nodeData.ws.close();
    data.ws.close();
    const ws = await startWebsocket(nodeData.session.id, nodeData.session.kernel.id, token, setLatestExecutionOutput, setLatestExecutionCount);
    setNodeData({...nodeData, ws: ws});
    data.ws = ws;
    await fetchParentState();
    setShowConfirmModalRestart(false);
  };

  const startNewSession = async () => {
    if (predecessor && predecessorRunning) setIsStarting(true);
    console.log('Starting new session')
    const {ws, session} = await createSession(id, path, token, setLatestExecutionOutput, setLatestExecutionCount);
    setNodeData({...nodeData, ws: ws, session: session});
    data.ws = ws;
    data.session = session;
    await fetchParentState();
    if (predecessor && predecessorRunning) setIsStarting(false);
  };

  /* SHUTDOWN */
  const onShutdown = async () => {
    if (wsRunning) setShowConfirmModalShutdown(true);
  };

  const shutdownKernel = async () => {
    console.log('Shutting kernel down')
    nodeData.ws.close();
    data.ws.close();
    axios.defaults.headers.common['Authorization'] = `Bearer ${token}`
    await axios.delete('http://localhost:8888/api/sessions/'+nodeData.session.id)
    setShowConfirmModalShutdown(false);
  };

  /* EXPORT */
  const onExporting = async () => {
    const fileName = path.split('/').pop()!;
    await exportToJupyterNotebook(getNodes(), id, fileName);
  };

  /* Cancel method for all modals (restart, shutdown and delete) */
  const continueWorking = () => {
    if (showConfirmModalRestart) setShowConfirmModalRestart(false);
    if (showConfirmModalShutdown) setShowConfirmModalShutdown(false);
    if (showConfirmModalDelete) setShowConfirmModalDelete(false);
    if (showConfirmModalDetach) setShowConfirmModalDetach(false);
  };

  const fetchParentState = async () => {
    if (predecessor && predecessorRunning) {
      await new Promise(resolve => setTimeout(resolve, 200));
      const parentKernel = predecessor.data.session?.kernel.id;
      const childKernel = data.session?.kernel.id;
      const dill_path = path.split('/').slice(0, -1).join('/')
      await passParentState(token, dill_path, parentKernel, childKernel);
    }
  };

  return (
    // <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'flex-start', minWidth: '100%', minHeight: '100%' }}></div>
     <div>
      {wsRunning && !isExecuting && <div className = "kernelOn"><FontAwesomeIcon icon={faCircleChevronDown}/> Idle</div>} 
      {wsRunning && isExecuting && <div className = "kernelBusy"><FontAwesomeIcon icon={faSpinner} spin /> Busy...</div>} 
      {!wsRunning && !isExecuting && <div className = "kernelOff"><FontAwesomeIcon icon={faCircleXmark}/> Shutdown</div>}
      <NodeResizer
        lineStyle={lineStyle}
        handleStyle={handleStyle}
        minWidth={minWidth}
        minHeight={minHeight}
      />
      <NodeToolbar className="nodrag">
        <button onClick={onDelete} title="Delete Group 👥">
          <FontAwesomeIcon className="icon" icon={faTrashAlt} />
        </button>
        {hasChildNodes && 
          <button onClick={onDetach} title="Delete Bubble 🫧">
            <FontAwesomeIcon className="icon" icon={faTrashArrowUp} />
          </button>}
        <button onClick={onInterrupt} title="Interrupt Kernel ⛔"> 
          <FontAwesomeIcon className="icon" icon={faSquare} />
        </button>
        {wsRunning && <button onClick={onRestart} title={"Restart Kernel 🔄"}> 
          <FontAwesomeIcon className="icon" icon={faArrowRotateRight} />
        </button>}
        <button onClick={wsRunning ? onShutdown : onRestart} title={wsRunning ? "Shutdown Kernel ❌" : "Reconnect Kernel ▶️"} disabled={isStarting}> 
          <FontAwesomeIcon className="icon" icon={wsRunning ? faPowerOff : faCirclePlay} />
        </button>
        <button onClick={onBranchOut} title="Branch out 🍃"> 
          <FontAwesomeIcon className="icon" icon={faNetworkWired}/>
        </button>
        <button onClick={onExporting} title="Export to Jupyter Notebook 📩"> 
          <FontAwesomeIcon className="icon" icon={faFileExport}/>
        </button>
      </NodeToolbar>
      <Handle className="handle-group-top" type="target" position={Position.Top} isConnectable={false} />
      <Handle className="handle-group-bottom" type="source" position={Position.Bottom} isConnectable={false} />
      <CustomConfirmModal 
        title="Restart Kernel?" 
        message="Are you sure you want to restart the kernel? All variables will be lost!" 
        show={showConfirmModalRestart} 
        onHide={continueWorking} 
        onConfirm={restartKernel} 
        confirmText="Restart"
      />
      <CustomConfirmModal 
        title="Shutdown Kernel?" 
        message="Are you sure you want to shutdown the kernel? All variables will be lost!" 
        show={showConfirmModalShutdown} 
        onHide={continueWorking} 
        onConfirm={shutdownKernel} 
        confirmText="Shutdown"
      />
      <CustomConfirmModal 
        title="Delete Group?" 
        message="Are you sure you want to delete the group and shutdown the kernel? All cells will be deleted and all variables will be lost!" 
        show={showConfirmModalDelete} 
        onHide={continueWorking} 
        onConfirm={deleteGroup} 
        confirmText="Delete"
      />
      <CustomConfirmModal 
        title="Delete Bubble?" 
        message="Are you sure you want to delete the bubble and shutdown the kernel? The cells will remain, but all variables will be lost!" 
        show={showConfirmModalDetach} 
        onHide={continueWorking} 
        onConfirm={detachGroup} 
        confirmText="Delete"
      />
      <CustomInformationModal show={isBranching} text='Branching Out...' />
      <CustomInformationModal show={isStarting} text='Reconnecting Kernel...' />
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
