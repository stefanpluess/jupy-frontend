import { NodeProps, useReactFlow, useStoreApi, Node } from 'reactflow';
import { useCallback } from 'react';
import { shallow } from 'zustand/shallow';
import { getId, passParentState, sortNodes } from '../utils';
import { GROUP_NODE, GROUP_EDGE, NORMAL_NODE, MIN_WIDTH_GROUP, MIN_HEIGHT_GROUP } from '../../config/constants';
import { useWebSocketStore, createSession, selectorGeneral } from '../websocket';
import usePath from './usePath';
import useNodesStore from '../nodesStore';
import { useUpdateHistory } from '.';
import { useUpdateWebSocket } from '../websocket/updateWebSocket';

/**
 * Returns a callback function that creates a new child group node and connection from the given parent.
 * The child node is created with a unique id and positioned below the parent node.
 * A websocket connection is created for the child group node, and the parent state is passed to the child.
 * @param id - The id of the parent node.
 */
export function useBubbleBranchClick(id: NodeProps['id']) {
    const { setEdges, setNodes, getNodes, getEdges, getNode, fitView} = useReactFlow();
    const store = useStoreApi();
    const path = usePath();
    const { token, setLatestExecutionOutput, setLatestExecutionCount } = useWebSocketStore(selectorGeneral, shallow);
    const getNodeIdToWebsocketSession = useNodesStore((state) => state.getNodeIdToWebsocketSession);
    const setNodeIdToWebsocketSession = useNodesStore((state) => state.setNodeIdToWebsocketSession);
    const updateExportImportHistory = useUpdateHistory();
    const {sendAddTransformation} = useUpdateWebSocket();

    const onBranchOut = useCallback(async () => {
        // check the node type
        let parentNode: Node | undefined = getNode(id);
        if (parentNode?.type === NORMAL_NODE){
            // if the node is a normal node, we need to get the parent node
            // we need the parent node object for getting its position
            if (parentNode.parentNode !== undefined) {
                parentNode = getNode(parentNode.parentNode);
                
            } else {
                console.error("parentNode for normal node is undefined.");
            }
        }
        if (!parentNode?.style?.width) {
            console.error("parentNode, parentNode.style, or parentNode.style.width is undefined.");
            return;
        }
        const parentWidth = Number(parentNode.style.width);
        const parentHeight = Number(parentNode.style.height);
        const childWidth = Math.max(MIN_WIDTH_GROUP, 0.8 * parentWidth);
        const childHeight = Math.max(MIN_HEIGHT_GROUP, 0.8 * parentHeight);
        const childPosX = parentNode.position.x + 0.5*parentWidth - 0.5*childWidth;
        const childPosY = parentNode.position.y + 1.3*parentHeight;
        // create a unique id for the child node
        const childNodeId = getId(GROUP_NODE);
        // create the child node
        const childNode: Node = {
            id: childNodeId,
            type: GROUP_NODE,
            position: { x: childPosX, y: childPosY},
            data: {},
            style: { width: childWidth, height: childHeight},
        };

        // we need to create a connection from parent to child
        const childEdge = {
            id: `${parentNode.id}-${childNodeId}`,
            source: parentNode.id,
            target: childNodeId,
            type: GROUP_EDGE,
        };

        // create a websocket connection and pass the parent state to the child
        const {ws, session} = await createSession(childNodeId, path, token, setLatestExecutionOutput, setLatestExecutionCount);
        setNodeIdToWebsocketSession(childNodeId, ws, session);
        const parentKernel = getNodeIdToWebsocketSession(parentNode.id)?.session?.kernel.id!;
        const childKernel = session?.kernel.id;
        const dill_path = path.split('/').slice(0, -1).join('/')
        const {parent_exec_count, child_exec_count} = await passParentState(token, dill_path, parentKernel, childKernel!);
        updateExportImportHistory({
            parent_id: parentNode.id,
            parent_exec_count: parent_exec_count ?? 0,
            child_id: childNodeId,
            child_exec_count: child_exec_count ?? 0,
        });
        childNode.data.predecessor = parentNode.id;
        parentNode.data.successors = parentNode.data.successors ? parentNode.data.successors.concat([childNodeId]) : [childNodeId];

        // add the new nodes
        const sortedNodes = store
            .getState()
            .getNodes()
            .concat(childNode)
            .sort(sortNodes);
        setNodes(sortedNodes);
        // add the new edges (node -> child)
        setEdges((edges) =>
            edges.concat([childEdge])
        );

        // zoom to the new group node: 
        await new Promise(resolve => setTimeout(resolve, 400));
        fitView({ padding: 1.5, duration: 800, nodes: [{ id: childNodeId }] });
        sendAddTransformation(childNode,undefined, childEdge)
    }, [getEdges, getNode, getNodes, id, setEdges, setNodes, getNodeIdToWebsocketSession, setNodeIdToWebsocketSession, updateExportImportHistory]);

  return onBranchOut;
}

export default useBubbleBranchClick;
