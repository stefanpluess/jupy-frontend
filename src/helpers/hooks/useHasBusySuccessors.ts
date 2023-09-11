import { useCallback } from 'react';
import { useReactFlow } from 'reactflow';
import useNodesStore from '../nodesStore';
import { KERNEL_BUSY } from '../../config/constants';

function useHasBusySuccessors() {
    const { getNode } = useReactFlow();
    const groupNodesInfluenceStates = useNodesStore((state) => state.groupNodesInfluenceStates);
    const groupNodesExecutionStates = useNodesStore((state) => state.groupNodesExecutionStates);

    const hasBusySuccessors = useCallback((node_id: string) => {
        const groupNode = getNode(node_id);
        const succs = groupNode?.data.successors;
        if (!succs) return;
        for (let i = 0; i < succs.length; i++) {
          const succ = succs[i];
          if (groupNodesInfluenceStates[succ] && groupNodesExecutionStates[succ]?.state === KERNEL_BUSY) return true;
        }
        return false;
    }, [groupNodesExecutionStates, groupNodesInfluenceStates, getNode]);

    return hasBusySuccessors;
}

export default useHasBusySuccessors;