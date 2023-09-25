import axios from 'axios';
import { useCallback } from 'react';
import { useReactFlow } from 'reactflow';
import useNodesStore from '../nodesStore';
import { useWebSocketStore } from '../websocket';

function useRemoveGroupNode() {
    const { getNode, deleteElements } = useReactFlow();
    const token = useWebSocketStore((state) => state.token);
    const groupNodesWsStates = useNodesStore((state) => state.groupNodesWsStates);

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
        const wsRunning = groupNodesWsStates[node_id]; // can be undefined
        if (wsRunning) {
            groupNode.data.ws.close();
            axios.defaults.headers.common['Authorization'] = `Bearer ${token}`
            await axios.delete('http://localhost:8888/api/sessions/'+groupNode.data.session.id)
        }
    }, [getNode, deleteElements, groupNodesWsStates, token]);

    return removeGroupNode;
}

export default useRemoveGroupNode;