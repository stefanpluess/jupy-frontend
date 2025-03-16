import { NodeProps, useReactFlow, useStoreApi, Node } from 'reactflow';
import { useCallback } from 'react';
import { shallow } from 'zustand/shallow';
import { getId, passParentState, sortNodes } from '../utils';
import { GROUP_NODE, GROUP_EDGE } from '../../config/constants';
import { useWebSocketStore, createSession, selectorGeneral } from '../websocket';
import usePath from './usePath';
import useNodesStore from '../nodesStore';
import { useCollabOutputUtils, useUpdateHistory } from '.';
import { useUpdateWebSocket } from './useUpdateWebSocket';


/**
 * Custom hook that creates a new branch in a graph based on the provided ID.
 * The new branch includes a new group node connected to the source group node,
 * and handles the necessary state updates and connections.
 *
 * @param id The ID of the source group node.
 * @returns A function that triggers the creation of the new branch and returns the ID of the new group node.
 */
export function useCellBranch(id: NodeProps['id']) {
    const { setEdges, setNodes, getNodes, getEdges, getNode, getEdge} = useReactFlow();
    const store = useStoreApi();
    const path = usePath();
    const { token, setLatestExecutionOutput, setLatestExecutionCount } = useWebSocketStore(selectorGeneral, shallow);
    const getNodeIdToWebsocketSession = useNodesStore((state) => state.getNodeIdToWebsocketSession);
    const getWsRunningForNode = useNodesStore((state) => state.getWsRunningForNode);
    const setNodeIdToWebsocketSession = useNodesStore((state) => state.setNodeIdToWebsocketSession);
    const updateExportImportHistory = useUpdateHistory();
    const {sendPredecessorGroup, sendNewOutputNode} = useUpdateWebSocket();
    const {collabOutputUtils} = useCollabOutputUtils();

    const onCellBranchOut = useCallback(async (): Promise<string> => {
        const sourceGroupNode = getNode(id);
        if (!sourceGroupNode?.style?.width) {
            console.error("sourceGroupNode, sourceGroupNode.style, or sourceGroupNode.style.width is undefined.");
            return '';
        }
        const sourceNodeWidth = Number(sourceGroupNode.style.width);
        const sourceNodeHeight = Number(sourceGroupNode.style.height);
        const newPosX = sourceGroupNode.position.x - 1.1*sourceNodeWidth;
        const newPosY = sourceGroupNode.position.y - 0.7*sourceNodeHeight;
        
        // create a unique id for new group node
        const newGroupNodeId = getId(GROUP_NODE);
        // create the new group node
        const newGroupNode: Node = {
            id: newGroupNodeId,
            type: GROUP_NODE,
            position: { x: newPosX, y: newPosY},
            data: {},
            style: { width: sourceNodeWidth, height: sourceNodeHeight},
        };

        // we need to create a connection from source group node to new group node
        const newEdge = {
            id: `${newGroupNodeId}-${sourceGroupNode.id}`,
            source: newGroupNodeId,
            target: sourceGroupNode.id,
            type: GROUP_EDGE,
        };

        // create a websocket connection and pass the parent state to the child
        const {ws, session} = await createSession(newGroupNodeId, path, token, setLatestExecutionOutput, setLatestExecutionCount, collabOutputUtils, sendNewOutputNode);
        setNodeIdToWebsocketSession(newGroupNodeId, ws, session);

        // check if the source group node has a predecessor
        if (sourceGroupNode.data.predecessor !== undefined) {
            // if the source group node has a predecessor, we need to pass the state of the predecessor sourceGroupNode of to the new group node
            const predecessorNode = getNode(sourceGroupNode.data.predecessor);
            if (predecessorNode === undefined) {
                console.error("predecessorNode is undefined.");
                return '';
            }
            var loadParentState = true;
            // if the predecessor node is not running, we won't pass the state
            if (!getWsRunningForNode(predecessorNode.id)) loadParentState = false;

            // actually pass the state
            if (loadParentState) {
                const predecessorKernel = getNodeIdToWebsocketSession(predecessorNode.id)?.session?.kernel.id;
                const newKernel = session?.kernel.id;
                if (predecessorKernel === undefined || newKernel === undefined) {
                    console.error("predecessorKernel or newKernel is undefined.");
                    return '';
                }
                const dill_path = path.split('/').slice(0, -1).join('/');
                const {parent_exec_count, child_exec_count} = await passParentState(token, dill_path, predecessorKernel, newKernel);
                updateExportImportHistory({
                    parent_id: predecessorNode.id,
                    parent_exec_count: parent_exec_count ?? 0,
                    child_id: newGroupNodeId,
                    child_exec_count: child_exec_count ?? 0,
                });
            }
            // delete sourceGroupNode from the list of successors of the predecessorNode and add the new group node as a successor
            const predecessors = predecessorNode.data.successors;
            if (!predecessors) {
                console.error("Predecessor successors are undefined.");
                return '';
            }
            // adjust the properties of the predecessor node
            predecessorNode.data.successors = predecessors
                .filter((successor: string) => successor !== sourceGroupNode.id)
                .concat(newGroupNodeId);
            // adjust the edge between the predecessor node and the source group node
            const predecessorEdge = getEdge(`${predecessorNode.id}-${sourceGroupNode.id}`);
            if (predecessorEdge === undefined) {
                console.error("predecessorEdge is undefined.");
                return '';
            }
            predecessorEdge.target = newGroupNodeId;
            predecessorEdge.id = `${predecessorNode.id}-${newGroupNodeId}`;
        }
        // adjust the properties of group nodes
        newGroupNode.data.predecessor = sourceGroupNode.data.predecessor; // take over the predecessor of the source group node
        sourceGroupNode.data.predecessor = newGroupNodeId; // add the new group node as a predecessor of the source group node
        newGroupNode.data.successors = [sourceGroupNode.id]; // successor of the new group node is the source group node
        // successors of the source group node do not change

        // add the new nodes
        const sortedNodes = store
            .getState()
            .getNodes()
            .concat(newGroupNode)
            .sort(sortNodes);
        setNodes(sortedNodes);
        // add the new edges
        setEdges((edges) =>
            edges.concat([newEdge])
        );

        // wait for the websocket to be connected
        while (!getWsRunningForNode(newGroupNodeId)) {
            // console.log('Waiting for websocket in node ' + newGroupNodeId + ' to be connected');
            await new Promise(resolve => setTimeout(resolve, 50));
        }
        sendPredecessorGroup(newGroupNode, newEdge);
        return newGroupNodeId;
    }, [getEdges, getNode, getNodes, id, setEdges, setNodes, getNodeIdToWebsocketSession, getWsRunningForNode, setNodeIdToWebsocketSession, updateExportImportHistory]);

  return onCellBranchOut;
}

export default useCellBranch;
