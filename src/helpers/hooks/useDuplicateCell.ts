import { NodeProps, useReactFlow, useStoreApi, Node, Edge } from 'reactflow';
import { useCallback } from 'react';
import { getConnectedNodeId, getId, getNodePositionInsideParent, sortNodes } from '../utils';
import { EXTENT_PARENT } from '../../config/constants';
import useNodesStore from '../nodesStore';

export function useDuplicateCell(id: NodeProps['id']) {
    const { setEdges, setNodes, getNodes, getNode, getIntersectingNodes } = useReactFlow();
    const store = useStoreApi();
    const toggleLock = useNodesStore((state) => state.toggleLock);

    const onDuplicateCell= useCallback(async () => {
        // create a deep copy of the node and its output node
        const simpleNode = getNode(id);
        const data = JSON.parse(JSON.stringify(simpleNode?.data));
        const deepCopyOfSimpleNode = JSON.parse(JSON.stringify(simpleNode));
        const deepCopyOfOutputNode = JSON.parse(JSON.stringify(getNode(getConnectedNodeId(id))));
        if (!deepCopyOfSimpleNode || !deepCopyOfOutputNode){
            console.error("[useDuplicateCell] node not found");
            return;
        }
        // create a duplicate of the simple node
        const new_id = getId(deepCopyOfSimpleNode.type);
        const POSITION_SHIFT = 30;
        const duplicateSimpleNode: Node = {
            id: new_id,
            type: deepCopyOfSimpleNode.type,
            position: {
                // define a new postion of the node - place it a bit to the right and a bit to bottom
                x: deepCopyOfSimpleNode.position.x + POSITION_SHIFT,
                y: deepCopyOfSimpleNode.position.y + POSITION_SHIFT},
            data: data,
            style: deepCopyOfSimpleNode.style,
            width: deepCopyOfSimpleNode.width,
            height: deepCopyOfSimpleNode.height,
        };
        // create duplicate of the output node
        const duplicateOutputNode: Node = {
            id: new_id+"_output",
            type: deepCopyOfOutputNode.type,
            position: {
                // define a new postion of the node - place it a bit to the right and a bit to bottom
                x: deepCopyOfOutputNode.position.x + POSITION_SHIFT, 
                y: deepCopyOfOutputNode.position.y + POSITION_SHIFT},
            data: deepCopyOfOutputNode.data,
            width: deepCopyOfOutputNode.width,
            height: deepCopyOfOutputNode.height,
        };
        /* if original node has a parent the new node should have the same parent
            - check if new position is inside the group node 
            - adjust the position in case position adjustment made it go out of bounds of group node*/
        if (deepCopyOfSimpleNode.extent === EXTENT_PARENT) {
            const groupNode = getNode(deepCopyOfSimpleNode.parentNode);
            if (groupNode) {
                // COMMENT - adjustment for simple node
                /* if position is inside the group node then we want to position the node inside this group
                duplicateSimpleNode.position = getNodePositionInsideParent(duplicateSimpleNode, groupNode) 
                                               ?? { x: 0, y: 0 }; */
                duplicateSimpleNode.parentNode = groupNode?.id;
                duplicateSimpleNode.extent = groupNode ? EXTENT_PARENT : undefined;
                // COMMENT - adjustment for output node
                // in case the node has a parent, we want to make sure that the output node has the same parent
                duplicateOutputNode.parentNode = duplicateSimpleNode.parentNode;
                duplicateOutputNode.extent = EXTENT_PARENT;
                /* adjust the position of the output node in case it is outside of the parent node
                duplicateOutputNode.position = getNodePositionInsideParent(duplicateOutputNode, groupNode) 
                                               ?? { x: 0, y: 0 }; */
            } else{
                console.error("[useDuplicateCell] no group node found...");
            }
        }
        // add nodes and edges to the store
        const sortedNodes = store
            .getState()
            .getNodes()
            .concat(duplicateSimpleNode)
            .concat(duplicateOutputNode)
            .sort(sortNodes);
        setNodes(sortedNodes);
        const newEdge: Edge = {
            id: getId("edge"),
            source: duplicateSimpleNode.id,
            target: duplicateOutputNode.id,
        };
        setEdges((edges) =>
        edges.concat([newEdge])
        );
        // lock the new node, since it is first call with this id it will make it locked
        toggleLock(new_id);
    }, [getNode, getNodes, id, setEdges, setNodes, getIntersectingNodes]);

  return onDuplicateCell;
}

export default useDuplicateCell;
