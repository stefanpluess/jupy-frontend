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
} from "@fortawesome/free-solid-svg-icons";
import {useDetachNodes, useBubbleBranchClick, usePath, useDeleteOutput} from "../../helpers/hooks";
import { useWebSocketStore } from "../../helpers/websocket";
import axios from "axios";
import { startWebsocket, createSession } from "../../helpers/websocket/websocketUtils";
import CustomConfirmModal from "./CustomConfirmModal";
import CustomInformationModal from "./CustomInformationModal";
import useNodesStore from "../../helpers/nodesStore";
import { v4 as uuidv4 } from "uuid";
import { generateMessage } from "../../helpers/utils";

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
  const { deleteElements } = useReactFlow();
  const [showConfirmModalRestart, setShowConfirmModalRestart] = useState(false);
  const [showConfirmModalShutdown, setShowConfirmModalShutdown] = useState(false);
  const [showConfirmModalDelete, setShowConfirmModalDelete] = useState(false);
  const [isRunning, setIsRunning] = useState(true); // TODO: - use data.ws.readyState
  const [isBranching, setIsBranching] = useState(false);
  const detachNodes = useDetachNodes();
  const { minWidth, minHeight, hasChildNodes } = useStore((store) => {
    const childNodes = Array.from(store.nodeInternals.values()).filter(
      (n) => n.parentNode === id
    );
    const rect = getRectOfNodes(childNodes);

    return {
      minWidth: rect.width + padding * 2,
      minHeight: rect.height + padding * 2,
      hasChildNodes: childNodes.length > 0,
    };
  }, isEqual);

  // INFO :: queue 🚶‍♂️🚶‍♀️🚶‍♂️functionality
  const queues = useNodesStore((state) => state.queues[id]); // listen to the queues of the group node
  const isExecuting = useNodesStore((state) => state.groupNodesExecutionStates[id]);
  const setExecutionStateForGroupNode = useNodesStore((state) => state.setExecutionStateForGroupNode);
  const setCellIdToMsgId = useWebSocketStore((state) => state.setCellIdToMsgId);
  const deleteOutput = useDeleteOutput();

  // INFO :: queue 🚶‍♂️🚶‍♀️🚶‍♂️functionality
  useEffect(() => {
    console.log("Queue changed for GROUP: ", id);
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
          deleteOutput(simpleNodeId + "_output");
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
    const handleWebSocketOpen = () => setIsRunning(true);
    const handleWebSocketClose = () => setIsRunning(false);
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
  }, [nodeData.ws, data.ws]);

  /* DELETE */
  const onDelete = async () => {
    setShowConfirmModalDelete(true);
  };

  const deleteGroup = async () => {
    deleteElements({ nodes: [{ id }] });
    if (isRunning) {
      nodeData.ws.close();
      axios.defaults.headers.common['Authorization'] = `Bearer ${token}`
      await axios.delete('http://localhost:8888/api/sessions/'+nodeData.session.id)
    }
  };

  /* DETACH */
  const onDetach = () => {
    const childNodeIds = Array.from(store.getState().nodeInternals.values())
      .filter((n) => n.parentNode === id)
      .map((n) => n.id);
    detachNodes(childNodeIds, id);
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
    if (isRunning) setShowConfirmModalRestart(true);
    else startNewSession();
  };

  /* restarts the kernel (call to /restart) and creates a new websocket connection */
  const restartKernel = async () => {
    console.log('Restarting kernel')
    axios.defaults.headers.common['Authorization'] = `Bearer ${token}`
    await axios.post(`http://localhost:8888/api/kernels/${nodeData.session.kernel.id}/restart`)
    // and also restart the websocket connection
    nodeData.ws.close();
    const ws = await startWebsocket(nodeData.session.id, nodeData.session.kernel.id, token, setLatestExecutionOutput, setLatestExecutionCount);
    setNodeData({...nodeData, ws: ws});
    data.ws = ws;
    setShowConfirmModalRestart(false);
  };

  const startNewSession = async () => {
    console.log('Starting new session')
    const {ws, session} = await createSession(id, path, token, setLatestExecutionOutput, setLatestExecutionCount);
    setNodeData({...nodeData, ws: ws, session: session});
    data.ws = ws;
    data.session = session;
  };

  /* SHUTDOWN */
  const onShutdown = async () => {
    if (isRunning) setShowConfirmModalShutdown(true);
  };

  const shutdownKernel = async () => {
    console.log('Shutting kernel down')
    nodeData.ws.close();
    axios.defaults.headers.common['Authorization'] = `Bearer ${token}`
    await axios.delete('http://localhost:8888/api/sessions/'+nodeData.session.id)
    setShowConfirmModalShutdown(false);
  };

  /* Cancel method for all modals (restart, shutdown and delete) */
  const continueWorking = () => {
    if (showConfirmModalRestart) setShowConfirmModalRestart(false);
    if (showConfirmModalShutdown) setShowConfirmModalShutdown(false);
    if (showConfirmModalDelete) setShowConfirmModalDelete(false);
  };

  return (
    <div style={{ minWidth, minHeight }}>
      {isRunning && <div style={{color:'green', fontWeight:'bold'}}>Running...</div>}
      {!isRunning && <div style={{color:'red', fontWeight:'bold'}}>Not running...</div>}
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
        {isRunning && <button onClick={onRestart} title={"Restart Kernel 🔄"}> 
          <FontAwesomeIcon className="icon" icon={faArrowRotateRight} />
        </button>}
        <button onClick={isRunning ? onShutdown : onRestart} title={isRunning ? "Shutdown Kernel ❌" : "Reconnect Kernel ▶️"}> 
          <FontAwesomeIcon className="icon" icon={isRunning ? faPowerOff : faCirclePlay} />
        </button>
        <button onClick={onBranchOut} title="Branch out 🍃"> 
          <FontAwesomeIcon className="icon" icon={faNetworkWired}/>
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
