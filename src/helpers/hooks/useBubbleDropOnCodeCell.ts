import ReactFlow, { useReactFlow, Node } from 'reactflow';
import {DEFAULT_HEIGHT_GROUP, DEFAULT_LOCK_STATUS, DEFAULT_WIDTH_GROUP, EXTENT_PARENT, GROUP_NODE} from "../../config/constants";
import {checkNodeAllowed, getNodePositionInsideParent} from "../utils";
import { positionNode } from '../../config/types';
import { useState } from 'react';
import useSettingsStore from "../settingsStore";


export function useHandleBubbleDropOnCodeCell() {
    const {getIntersectingNodes, setNodes} = useReactFlow();
    const [onDragStartData, setOnDragStartData] = useState({ nodePosition: {x: 0, y: 0}, nodeId: "", connectedNodePosition: {x: 0, y: 0}, connectedNodeId: "", isLockOn: DEFAULT_LOCK_STATUS});
    const expandParentSetting = useSettingsStore((state) => state.expandParent);
    function handleBubbleDropOnCodeCell(groupNode: Node) {
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
}
return handleBubbleDropOnCodeCell;
}
