import { NodeProps, useReactFlow, useStoreApi, Node, Edge } from 'reactflow';
import { useCallback } from 'react';
import { getConnectedNodeId, getId, getNodePositionInsideParent, sortNodes } from '../utils';
import useNodesStore from '../nodesStore';
import { FLOATING_EDGE, GROUP_NODE, NORMAL_EDGE, NORMAL_NODE } from '../../config/constants';
import useSettingsStore from '../settingsStore';
import { useUpdateWebSocket } from './useUpdateWebSocket';

/**
 * Creates a duplicate of a node and its output node (if connected to one) in a React Flow graph.
 * @param id - The id of the node to duplicate.
 */
export function useDuplicateCell(id: NodeProps['id']) {
    const { setEdges, setNodes, getNodes, getNode, getIntersectingNodes } = useReactFlow();
    const store = useStoreApi();
    const setNodeIdToOutputs = useNodesStore((state) => state.setNodeIdToOutputs);
    const setNodeIdToExecCount = useNodesStore((state) => state.setNodeIdToExecCount);
    const toggleLock = useNodesStore((state) => state.toggleLock);
    const floatingEdgesSetting = useSettingsStore((state) => state.floatingEdges);
    const {sendAddTransformation} = useUpdateWebSocket();

    const onDuplicateCell= useCallback(async () => {
        // COMMENT - create a deep copy of the code node
        const simpleNode = getNode(id);
        if (!simpleNode){
            console.error("[useDuplicateCell] node not found.");
            return;
        }
        const data = JSON.parse(JSON.stringify(simpleNode?.data));
        if (data.typeable) delete data.typeable; // do not allow immediate typing in copied node
        const deepCopyOfSimpleNode = JSON.parse(JSON.stringify(simpleNode));
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
            extent: deepCopyOfSimpleNode.extent,
            expandParent: deepCopyOfSimpleNode.expandParent,
        };
        setNodeIdToExecCount(duplicateSimpleNode.id, duplicateSimpleNode.data.executionCount.execCount); // put the exec count into the store
        /* if original node has a parent the new node should have the same parent
        - check if new position is inside the group node 
        - adjust the position in case position adjustment made it go out of bounds of group node*/
        if (deepCopyOfSimpleNode.parentNode) {
            const groupNode = getNode(deepCopyOfSimpleNode.parentNode);
            if (groupNode) {
                // COMMENT - adjustment for simple node
                /* if position is inside the group node then we want to position the node inside this group
                duplicateSimpleNode.position = getNodePositionInsideParent(duplicateSimpleNode, groupNode) 
                                            ?? { x: 0, y: 0 }; */
                duplicateSimpleNode.parentNode = groupNode?.id;
            } else {
                console.error("[useDuplicateCell] no group node found.");
            }          
        }

        // COMMENT - if the node is not connected to anything, we don't need to create an output node
        const connectedNode = getNode(getConnectedNodeId(id));
        if (!connectedNode) {
            // add node to the store
            const sortedNodes = store
                .getState()
                .getNodes()
                .concat(duplicateSimpleNode)
                .sort(sortNodes);
            setNodes(sortedNodes);
            sendAddTransformation(duplicateSimpleNode)
        } else {
            let deepCopyOfOutputNode;
            try {
                deepCopyOfOutputNode = JSON.parse(JSON.stringify(getNode(getConnectedNodeId(id))));
            } catch (error) {
                console.error("[useDuplicateCell] error parsing JSON for output node - node not found.");
                return;
            }
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
                extent: deepCopyOfOutputNode.extent,
                expandParent: deepCopyOfOutputNode.expandParent,
            };
            setNodeIdToOutputs({[duplicateOutputNode.id]: duplicateOutputNode.data.outputs}); // put the outputs into the store
            /* if original node has a parent the new node should have the same parent
                - check if new position is inside the group node 
                - adjust the position in case position adjustment made it go out of bounds of group node*/
            if (deepCopyOfOutputNode.parentNode) {
                const groupNode = getNode(deepCopyOfOutputNode.parentNode);
                if (groupNode) {
                    // COMMENT - adjustment for output node
                    // in case the node has a parent, we want to make sure that the output node has the same parent
                    duplicateOutputNode.parentNode = groupNode?.id;
                    /* adjust the position of the output node in case it is outside of the parent node
                    duplicateOutputNode.position = getNodePositionInsideParent(duplicateOutputNode, groupNode) 
                                                ?? { x: 0, y: 0 }; */
                } else {
                    console.error("[useDuplicateCell] no group node found.");
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
                type: floatingEdgesSetting ? FLOATING_EDGE : NORMAL_EDGE,
            };
            setEdges((edges) =>
            edges.concat([newEdge])
            );
            // lock the new node, since it is first call with this id it will make it locked
            toggleLock(new_id);
            sendAddTransformation(duplicateSimpleNode, duplicateOutputNode, newEdge);
        }
    }, [getNode, getNodes, id, setEdges, setNodes, getIntersectingNodes, floatingEdgesSetting, toggleLock]);

  return onDuplicateCell;
}

export default useDuplicateCell;