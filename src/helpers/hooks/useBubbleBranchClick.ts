import { NodeProps, useReactFlow, useStoreApi, Node } from 'reactflow';
import { useCallback } from 'react';
import { shallow } from 'zustand/shallow';
import { getId, sortNodes } from '../utils';
import { GROUP_NODE } from '../../config/constants';
import { useWebSocketStore, createSession, selectorBubbleBranch} from '../websocket';
import usePath from './usePath';

export function useBubbleBranchClick(id: NodeProps['id']) {
    const { setEdges, setNodes, getNodes, getEdges, getNode } = useReactFlow();
    const store = useStoreApi();
    const path = usePath();
    const { setWebsocketNumber, getWebsocketNumber, 
        setLatestExecutionOutput, setLatestExecutionCount,
        token
      } = useWebSocketStore(selectorBubbleBranch, shallow);

    const onBranchOut = useCallback(async () => {
        // we need the parent node object for getting its position
        const parentNode = getNode(id);
        if (!parentNode) {
        return;
        }
        const parentWidth = Number(parentNode.style!.width);
        const parentHeight = Number(parentNode.style!.height);
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
        };

        // create a websocket connection
        const wn = getWebsocketNumber() + 1;
        setWebsocketNumber(wn);
        const newWebSocket = await createSession(wn, path, token, setLatestExecutionOutput, setLatestExecutionCount);
        childNode.data.ws = newWebSocket

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
