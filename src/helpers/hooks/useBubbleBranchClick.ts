import { NodeProps, useReactFlow, useStoreApi, Node } from 'reactflow';
import { useCallback } from 'react';
import { shallow } from 'zustand/shallow';
import { getId, passParentState, sortNodes } from '../utils';
import { GROUP_NODE, GROUP_EDGE, NORMAL_NODE } from '../../config/constants';
import { useWebSocketStore, createSession, selectorGeneral } from '../websocket';
import usePath from './usePath';

/**
 * Returns a callback function that creates a new child group node and connection from the given parent.
 * The child node is created with a unique id and positioned below the parent node.
 * A websocket connection is created for the child group node, and the parent state is passed to the child.
 * @param id - The id of the parent node.
 */
export function useBubbleBranchClick(id: NodeProps['id']) {
    const { setEdges, setNodes, getNodes, getEdges, getNode } = useReactFlow();
    const store = useStoreApi();
    const path = usePath();
    const { token, setLatestExecutionOutput, setLatestExecutionCount } = useWebSocketStore(selectorGeneral, shallow);

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
        const childWidth = 0.8*parentWidth;
        const childHeight = 0.8*parentHeight;
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
        await new Promise(resolve => setTimeout(resolve, 200));
        const parentKernel = parentNode.data.session?.kernel.id;
        const childKernel = session?.kernel.id;
        const dill_path = path.split('/').slice(0, -1).join('/')
        await passParentState(token, dill_path, parentKernel, childKernel!);
        childNode.data.ws = ws;
        childNode.data.session = session;
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

    }, [getEdges, getNode, getNodes, id, setEdges, setNodes]);

  return onBranchOut;
}

export default useBubbleBranchClick;
