import { useNodes, Node, getRectOfNodes, NodeToolbar, useStoreApi, useReactFlow } from 'reactflow';
import {GROUP_NODE, EXTENT_PARENT, PADDING} from '../../config/constants';
import { getId } from '../../helpers/utils';

export default function SelectedNodesToolbar() {
  const nodes = useNodes();
  const { setNodes } = useReactFlow();
  const store = useStoreApi();
  const selectedNodes = nodes.filter(
    (node) => node.selected && !node.parentNode
  );
  const selectedNodeIds = selectedNodes.map((node) => node.id);
  const isVisible = selectedNodeIds.length > 1;

  // TODO - selectionMode? -> ReactFlow docs

  const onGroup = () => {
    const rectOfNodes = getRectOfNodes(selectedNodes);
    const groupId = getId(GROUP_NODE);
    const parentPosition = {
      x: rectOfNodes.x,
      y: rectOfNodes.y,
    };
    const groupNode = {
      id: groupId,
      type: GROUP_NODE,
      position: parentPosition,
      style: {
        width: rectOfNodes.width + PADDING * 2,
        height: rectOfNodes.height + PADDING * 2,
      },
      data: {},
    };

    const nextNodes: Node[] = nodes.map((node) => {
      if (selectedNodeIds.includes(node.id)) {
        return {
          ...node,
          position: {
            x: node.position.x - parentPosition.x + PADDING,
            y: node.position.y - parentPosition.y + PADDING,
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
      <button onClick={onGroup}>Group selected nodes</button>
    </NodeToolbar>
  );
}
