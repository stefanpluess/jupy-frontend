import { memo, useState } from "react";
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
  faTrash,
  faDiagramProject,
  faSquare,
  faArrowRotateRight,
  faPowerOff,
} from "@fortawesome/free-solid-svg-icons";
import useDetachNodes from "../../helpers/useDetachNodes";
import useBubbleBranchClick from "../../helpers/useBubbleBranchClick";
import { useWebSocketStore } from "../../helpers/websocket";
import axios from "axios";
import { startWebsocket } from "../../helpers/websocket/websocketUtils";
import CustomConfirmModal from "./CustomConfirmModal";

const lineStyle = { borderColor: "white" }; // OPTIMIZE - externalize
const handleStyle = { height: 8, width: 8 }; // OPTIMIZE - externalize
const padding = 25; // OPTIMIZE - externalize

function GroupNode({ id, data }: NodeProps) {
  const store = useStoreApi();
  const token = useWebSocketStore((state) => state.token);
  const setLatestExecutionCount = useWebSocketStore((state) => state.setLatestExecutionCount);
  const setLatestExecutionOutput = useWebSocketStore((state) => state.setLatestExecutionOutput);
  const { deleteElements } = useReactFlow();
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  var ws = data?.ws;
  const session = data?.session;
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

  const onDelete = async () => {
    deleteElements({ nodes: [{ id }] });
    ws.close();
    axios.defaults.headers.common['Authorization'] = `Bearer ${token}`
    await axios.delete('http://localhost:8888/api/sessions/'+session.session_id)
  };

  const onDetach = () => {
    const childNodeIds = Array.from(store.getState().nodeInternals.values())
      .filter((n) => n.parentNode === id)
      .map((n) => n.id);

    detachNodes(childNodeIds, id);
  };

  const onBranchOut = useBubbleBranchClick(id);

  const onInterrupt = async () => {
    console.log('Interrupting kernel')
    axios.defaults.headers.common['Authorization'] = `Bearer ${token}`
    await axios.post(`http://localhost:8888/api/kernels/${session.kernel_id}/interrupt`)
  };

  /* restarts the kernel (call to /restart) and creates a new websocket connection */
  const onRestart = () => {
    setShowConfirmModal(true);
  };

  const handleConfirm = async () => {
    console.log('Restarting kernel')
    axios.defaults.headers.common['Authorization'] = `Bearer ${token}`
    await axios.post(`http://localhost:8888/api/kernels/${session.kernel_id}/restart`)
    // and also restart the websocket connection
    ws.close();
    data.ws = await startWebsocket(session.session_id, session.kernel_id, token, setLatestExecutionOutput, setLatestExecutionCount);
    ws = data?.ws;
    setShowConfirmModal(false);
  };

  const handleCancel = () => {
    setShowConfirmModal(false);
  };

  //TODO: is shutdown really needed within the notebook?
  const onShutdown = async () => {
    console.log('Shutting kernel down')
    axios.defaults.headers.common['Authorization'] = `Bearer ${token}`
    await axios.delete(`http://localhost:8888/api/kernels/${session.session_id}`)
  };

  return (
    <div style={{ minWidth, minHeight }}>
      <NodeResizer
        lineStyle={lineStyle}
        handleStyle={handleStyle}
        minWidth={minWidth}
        minHeight={minHeight}
      />
      <NodeToolbar className="nodrag">
        <button onClick={onDelete} title="Delete Group 👥">
          <FontAwesomeIcon className="icon" icon={faTrash} />
        </button>
        {hasChildNodes && 
          <button onClick={onDetach} title="Delete Bubble 🫧">
            <FontAwesomeIcon className="icon" icon={faTrashArrowUp} />
          </button>
        }
        <button onClick={onInterrupt} title="Interrupt Kernel ⛔"> 
          <FontAwesomeIcon className="icon" icon={faSquare} />
        </button>
        <button onClick={onRestart} title="Restart Kernel 🔄"> 
          <FontAwesomeIcon className="icon" icon={faArrowRotateRight} />
        </button>
        {/* <button onClick={onShutdown} title="Shutdown Kernel ❌"> 
          <FontAwesomeIcon className="icon" icon={faPowerOff} />
        </button> */}
        <button onClick={onBranchOut} title="Branch out 🍃"> 
          <FontAwesomeIcon className="icon" icon={faDiagramProject} />
        </button>
      </NodeToolbar>
      <Handle className="handle-group-top" type="target" position={Position.Top} isConnectable={false} />
      <Handle className="handle-group-bottom" type="source" position={Position.Bottom} isConnectable={false} />
      <CustomConfirmModal 
        title="Restart Kernel?" 
        message="Are you sure you want to restart the kernel? All variables will be lost!" 
        show={showConfirmModal} 
        onHide={handleCancel} 
        onConfirm={handleConfirm} 
      />
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
