import { useCallback } from 'react';
import { useReactFlow } from 'reactflow';
import useNodesStore from '../nodesStore';
import { KERNEL_BUSY } from '../../config/constants';

function useHasBusySuccessors() {
    const { getNode } = useReactFlow();
    const groupNodesInfluenceStates = useNodesStore((state) => state.groupNodesInfluenceStates);
    const groupNodesExecutionStates = useNodesStore((state) => state.groupNodesExecutionStates);

    /* Check whether a group node has any successor (only follow flowing paths with influence ON) that is BUSY */
    const hasBusySuccessors = useCallback((node_id: string): boolean => {
        const groupNode = getNode(node_id);
        const succs = groupNode?.data.successors;
        if (!succs) return false;
        for (let i = 0; i < succs.length; i++) {
          const succ = succs[i];
          // if the successor is influenced,
          if (groupNodesInfluenceStates[succ]) {
            // then check whether it is busy. Also, recursively check successors of successors
            if (groupNodesExecutionStates[succ]?.state === KERNEL_BUSY || hasBusySuccessors(succ)) return true;
          }
        }
        return false;
      }, [groupNodesExecutionStates, groupNodesInfluenceStates, getNode]);

    return hasBusySuccessors;
}

export default useHasBusySuccessors;