import { useCallback } from 'react';
import { useReactFlow } from 'reactflow';
import useNodesStore from '../nodesStore';
import { KERNEL_BUSY } from '../../config/constants';

/**
 * Returns a function that takes a node_id string and an optional consider_influence 
 * boolean and returns a boolean indicating whether the node has any busy successors.
 */
function useHasBusyPredecessor() {
    const { getNode } = useReactFlow();
    const groupNodesInfluenceStates = useNodesStore((state) => state.groupNodesInfluenceStates);
    const groupNodesExecutionStates = useNodesStore((state) => state.groupNodesExecutionStates);

    /**
    Check whether a group node has any predecessor (only follow flowing paths with influence ON, 
    except consider_influence=false) that is BUSY 
    */
    const hasBusyPredecessor = useCallback((node_id: string, consider_influence: boolean = true): boolean => {
        const groupNode = getNode(node_id);
        const predecessor = groupNode?.data.predecessor;
        if (!predecessor) return false;
        const isInfluenced = groupNodesInfluenceStates[node_id]; // can be undefined
        const predecessorExecutionState = groupNodesExecutionStates[predecessor]; // can be undefined
        // if the group node is influenced (or we don't care about influence),
        if (isInfluenced || !consider_influence) {
            // then check whether it has a busy predecessor. Also, recursively check predecessors of predecessors
            if (predecessorExecutionState?.state === KERNEL_BUSY || hasBusyPredecessor(predecessor)) return true;
        }
        return false;
      }, [groupNodesExecutionStates, groupNodesInfluenceStates, getNode]);

    return hasBusyPredecessor;
}

export default useHasBusyPredecessor;