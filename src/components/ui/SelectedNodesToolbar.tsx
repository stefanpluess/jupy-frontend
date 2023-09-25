import { useNodes, Node, getRectOfNodes, NodeToolbar, useStoreApi, useReactFlow } from 'reactflow';
import {GROUP_NODE, EXTENT_PARENT, PADDING, NORMAL_NODE, OUTPUT_NODE} from '../../config/constants';
import { getConnectedNodeId, getId } from '../../helpers/utils';
import { usePath, useRemoveGroupNode } from '../../helpers/hooks';
import { shallow } from 'zustand/shallow';
import { useWebSocketStore, createSession, selectorBubbleBranch } from '../../helpers/websocket';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faObjectGroup, faTrashAlt } from '@fortawesome/free-solid-svg-icons';
import CustomConfirmModal from '../ui/CustomConfirmModal';
import withReactContent from "sweetalert2-react-content";
import Swal from "sweetalert2";
import { useCallback, useState } from 'react';
import useNodesStore from '../../helpers/nodesStore';

export default function SelectedNodesToolbar() {
  const nodes = useNodes();
  const { setNodes, deleteElements } = useReactFlow();
  const store = useStoreApi();
  const groupNodesWsStates = useNodesStore((state) => state.groupNodesWsStates);
  // only allow grouping for nodes that are not already grouped and are not group nodes
  const selectedNodes = nodes.filter((node) => node.selected);
  const groupableNodes = selectedNodes.filter((node) => !node.parentNode && node.type !== GROUP_NODE);
  const path = usePath();
  const { setLatestExecutionOutput, setLatestExecutionCount, token } = useWebSocketStore(selectorBubbleBranch, shallow);
  const selectedNodeIds = selectedNodes.map((node) => node.id);
  const removeGroupNode = useRemoveGroupNode();
  const isVisible = selectedNodeIds.length > 1;
  const isVisibleGroup = groupableNodes.length > 1;
  const [showConfirmModalDelete, setShowConfirmModalDelete] = useState(false);

  let hasRunningGroupNodeSelected = useCallback(() => {
    let hasRunningGroupNodeSelected = false;
    selectedNodes.forEach((node) => {
      if (node.type === GROUP_NODE && groupNodesWsStates[node.id]) {
        hasRunningGroupNodeSelected = true;
      }
    });
    return hasRunningGroupNodeSelected;
  }, [selectedNodes, groupNodesWsStates]);


  const onGroup = async () => {
    const rectOfNodes = getRectOfNodes(groupableNodes);
    const groupId = getId(GROUP_NODE);
    const parentPosition = {
      x: rectOfNodes.x,
      y: rectOfNodes.y,
    };
    const {ws, session} = await createSession(groupId, path, token, setLatestExecutionOutput, setLatestExecutionCount);
    const groupNode = {
      id: groupId,
      type: GROUP_NODE,
      position: parentPosition,
      style: {
        width: rectOfNodes.width + PADDING * 4,
        height: rectOfNodes.height + PADDING * 4,
      },
      data: {
        ws: ws,
        session: session,
      },
    };

    const nextNodes: Node[] = nodes.map((node) => {
      if (selectedNodeIds.includes(node.id)) {
        return {
          ...node,
          position: {
            x: node.position.x - parentPosition.x + PADDING * 2,
            y: node.position.y - parentPosition.y + PADDING * 2,
          },
          extent: EXTENT_PARENT,
          parentNode: groupId,
        };
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
