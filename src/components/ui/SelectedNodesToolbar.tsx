//COMMENT :: External modules/libraries
import { 
  useCallback, 
  useState 
} from 'react';
import { 
  useNodes, 
  Node, 
  getNodesBounds, 
  NodeToolbar, 
  useStoreApi, 
  useReactFlow 
} from 'reactflow';
import { shallow } from 'zustand/shallow';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { 
  faObjectGroup, 
  faTrashAlt 
} from '@fortawesome/free-solid-svg-icons';
import withReactContent from "sweetalert2-react-content";
import Swal from "sweetalert2";
//COMMENT :: Internal modules HELPERS
import { 
  getConnectedNodeId, 
  getId 
} from '../../helpers/utils';
import { 
  useCollabOutputUtils,
  usePath, 
  useRemoveGroupNode 
} from '../../helpers/hooks';
import { 
  useWebSocketStore, 
  createSession, 
  selectorGeneral
} from '../../helpers/websocket';
import useNodesStore from '../../helpers/nodesStore';
//COMMENT :: Internal modules UI
import CustomConfirmModal from '../ui/CustomConfirmModal';
//COMMENT :: Internal modules CONFIG
import {
  GROUP_NODE, 
  EXTENT_PARENT, 
  PADDING, 
  NORMAL_NODE, 
  OUTPUT_NODE
} from '../../config/constants';
import useSettingsStore from '../../helpers/settingsStore';
import useExecutionStore from '../../helpers/executionStore';
import { useUpdateWebSocket } from '../../helpers/hooks/useUpdateWebSocket';

/**
 * This component renders a toolbar for selected nodes on the canvas space.
 * Selection is done via holding SHIFT + mouse click and dragging a selection box.
 * It allows the user to group selected nodes into a parent group node or delete them.
 * It also handles websocket connections and sessions for group nodes.
 */

export default function SelectedNodesToolbar() {
  const nodes = useNodes();
  const { setNodes, deleteElements } = useReactFlow();
  const store = useStoreApi();
  const getWsRunningForNode = useNodesStore((state) => state.getWsRunningForNode);
  const setNodeIdToWebsocketSession = useNodesStore((state) => state.setNodeIdToWebsocketSession);
  // only allow grouping for nodes that are not already grouped and are not group nodes
  const selectedNodes = nodes.filter((node) => node.selected);
  const groupableNodes = selectedNodes.filter((node) => !node.parentNode && node.type !== GROUP_NODE);
  const path = usePath();
  const { token, setLatestExecutionOutput, setLatestExecutionCount } = useWebSocketStore(selectorGeneral, shallow);
  const selectedNodeIds = selectedNodes.map((node) => node.id);
  const removeGroupNode = useRemoveGroupNode();
  const isVisible = selectedNodeIds.length > 1;
  const isVisibleGroup = groupableNodes.length > 1;
  const [showConfirmModalDelete, setShowConfirmModalDelete] = useState(false);
  const expandParentSetting = useSettingsStore((state) => state.expandParent);
  const addDeletedNodeIds = useExecutionStore((state) => state.addDeletedNodeIds);
  const {collabOutputUtils} = useCollabOutputUtils();
  const {sendNewOutputNode} = useUpdateWebSocket();

  let hasRunningGroupNodeSelected = useCallback(() => {
    let hasRunningGroupNodeSelected = false;
    selectedNodes.forEach((node) => {
      if (node.type === GROUP_NODE && getWsRunningForNode(node.id)) {
        hasRunningGroupNodeSelected = true;
      }
    });
    return hasRunningGroupNodeSelected;
  }, [selectedNodes, getWsRunningForNode]);


  const onGroup = async () => {
    const rectOfNodes = getNodesBounds(groupableNodes);
    const groupId = getId(GROUP_NODE);
    const parentPosition = {
      x: rectOfNodes.x,
      y: rectOfNodes.y,
    };
    const {ws, session} = await createSession(groupId, path, token, setLatestExecutionOutput, setLatestExecutionCount, collabOutputUtils, sendNewOutputNode);
    const groupNode = {
      id: groupId,
      type: GROUP_NODE,
      position: parentPosition,
      style: {
        width: rectOfNodes.width + PADDING * 4,
        height: rectOfNodes.height + PADDING * 4,
      },
      data: {},
    };
    setNodeIdToWebsocketSession(groupId, ws, session);

    const nextNodes: Node[] = nodes.map((node) => {
      if (selectedNodeIds.includes(node.id)) {
        const updatedNode = {
          ...node,
          position: {
            x: node.position.x - parentPosition.x + PADDING * 2,
            y: node.position.y - parentPosition.y + PADDING * 2,
          },
          parentNode: groupId,
        };
        expandParentSetting ? updatedNode.expandParent = true : updatedNode.extent = EXTENT_PARENT;
        return updatedNode;
      }

      return node;
    });

    store.getState().resetSelectedElements();
    store.setState({ nodesSelectionActive: false });
    setNodes([groupNode, ...nextNodes]);
  };

  const onDelete = () => {
    setShowConfirmModalDelete(true);
  };

  const deleteSelectedNodes = () => {
    // for each group node, also call removeGroupNode (shuts down websocket connections and deletes the sessions)
    selectedNodes.forEach((node) => {
      if (node.type === GROUP_NODE) {
        removeGroupNode(node.id, false);
        // get the deleted id for the execution graph 
        addDeletedNodeIds([node.id]);
      }
    });
    const correspondingNodes: string[] = [];
    selectedNodes.forEach((node) => {
      // for OUTPUT_NODE, get corresponding SIMPLE_NODE and vice versa
      if (node.type === NORMAL_NODE || node.type === OUTPUT_NODE) correspondingNodes.push(getConnectedNodeId(node.id));
    });
    const nodesToBeDeleted = [...selectedNodes, ...nodes.filter((node) => correspondingNodes.includes(node.id))];
    // actually remove the nodes
    deleteElements({ nodes: nodesToBeDeleted });
    setShowConfirmModalDelete(false);
    // get the deleted ids for the execution graph
    const deletedIds = nodesToBeDeleted.map((node) => node.id);
    addDeletedNodeIds(deletedIds);
  };

  const MySwal = withReactContent(Swal);
  const onGroupOff = () => {
    MySwal.fire({ 
      title: <strong>Group warning!</strong>,
      html: <i>Please only select ungrouped code, output and markdown nodes!</i>,
      icon: "warning",
    });
  };

  return (
    <>
    <NodeToolbar nodeId={selectedNodeIds} isVisible={isVisible}>
      <button onClick={isVisibleGroup ? onGroup : onGroupOff} title="Group Nodes 👥">
        <FontAwesomeIcon className={isVisibleGroup ? "icon" : "icon-disabled"} icon={faObjectGroup} />
      </button>
      <button onClick={onDelete} title="Delete Nodes ❌">
        <FontAwesomeIcon className="icon" icon={faTrashAlt} />
      </button>
    </NodeToolbar>
    <CustomConfirmModal 
      title={"Delete Selected Nodes?"} 
      message={"Are you sure you want to delete the selected nodes?"+ (hasRunningGroupNodeSelected() ? " All selected kernels will be shut and the corresponding variables lost!": "")}
      show={showConfirmModalDelete} 
      onHide={() => { setShowConfirmModalDelete(false) }} 
      onConfirm={deleteSelectedNodes} 
      confirmText="Delete"
      denyText="Cancel"
    />
    </>
  );
}
