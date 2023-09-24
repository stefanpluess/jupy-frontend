import { useNodes, Node, getRectOfNodes, NodeToolbar, useStoreApi, useReactFlow } from 'reactflow';
import {GROUP_NODE, EXTENT_PARENT, PADDING} from '../../config/constants';
import { getId } from '../../helpers/utils';
import { usePath } from '../../helpers/hooks';
import { shallow } from 'zustand/shallow';
import { useWebSocketStore, createSession, selectorBubbleBranch } from '../../helpers/websocket';

export default function SelectedNodesToolbar() {
  const nodes = useNodes();
  const { setNodes } = useReactFlow();
  const store = useStoreApi();
  // only allow grouping for nodes that are not already grouped and are not group nodes
  const selectedNodes = nodes.filter(
    (node) => node.selected && !node.parentNode && node.type !== GROUP_NODE
  );
  const path = usePath();
  const { setLatestExecutionOutput, setLatestExecutionCount,
      token
    } = useWebSocketStore(selectorBubbleBranch, shallow);
  const selectedNodeIds = selectedNodes.map((node) => node.id);
  const isVisible = selectedNodeIds.length > 1;

  // TODO - selectionMode? -> ReactFlow docs

  const onGroup = async () => {
    const rectOfNodes = getRectOfNodes(selectedNodes);
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

  return (
    <NodeToolbar nodeId={selectedNodeIds} isVisible={isVisible}>
      <button onClick={onGroup}>Group Nodes</button>
    </NodeToolbar>
  );
}
