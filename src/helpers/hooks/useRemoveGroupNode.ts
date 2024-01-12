import axios from 'axios';
import { useCallback } from 'react';
import { useReactFlow } from 'reactflow';
import useNodesStore from '../nodesStore';
import useExecutionStore from '../executionStore';
import { useWebSocketStore } from '../websocket';
import { serverURL } from '../../config/config';

/**
 * Returns a function to remove a group node from the React Flow graph, ensuring that predecessors 
 * and successors are updated accordingly. If the group node has running webScoket connection, 
 * the corresponding websocket is closed and the session is deleted from the backend.
 */
function useRemoveGroupNode() {
    const { getNode, deleteElements } = useReactFlow();
    const token = useWebSocketStore((state) => state.token);
    const getWsRunningForNode = useNodesStore((state) => state.getWsRunningForNode);
    const getNodeIdToWebsocketSession = useNodesStore((state) => state.getNodeIdToWebsocketSession);
    const removeNodeFromHistory = useExecutionStore((state) => state.removeNodeFromHistory);

    /* Method to update the data props (predecessor & successors) from the removed nodes */
    const removeFromPredecessorAndSuccessors = (node_id: string, predecessor_id: string, successor_ids: string[]) => {
        const predecessor = getNode(predecessor_id);
        if (predecessor) {
          const updatedSuccessors = predecessor.data.successors.filter((successor: string) => successor !== node_id);
          predecessor.data.successors = updatedSuccessors;
        }
        if (successor_ids) {
          successor_ids.forEach((successor: string) => {
            const successorNode = getNode(successor);
            if (successorNode) successorNode.data.predecessor = undefined;
          });
        }
      };
    
    /* Method to remove a group node. In case of detaching, the parent node was already removed (should_be_deleted = false) */
    const removeGroupNode = useCallback( async (node_id: string, should_be_deleted: boolean) => {
        const groupNode = getNode(node_id)
        if (!groupNode) return;
        removeFromPredecessorAndSuccessors(node_id, groupNode.data.predecessor, groupNode.data.successors);
        if (should_be_deleted) deleteElements({ nodes: [groupNode] });
        const wsRunning = getWsRunningForNode(node_id); // can be undefined
        if (wsRunning) {
          const ws = getNodeIdToWebsocketSession(node_id)?.ws;
          const session = getNodeIdToWebsocketSession(node_id)?.session;
          ws?.close();
          axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
          await axios.delete(`${serverURL}/api/sessions/`+ session.id);
          removeNodeFromHistory(node_id);
        }
    }, [getNode, deleteElements, getWsRunningForNode, token, getNodeIdToWebsocketSession, removeNodeFromHistory]);

    return removeGroupNode;
}

export default useRemoveGroupNode;