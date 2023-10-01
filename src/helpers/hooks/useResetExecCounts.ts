import { useCallback } from 'react';
import { useReactFlow } from 'reactflow';
import useNodesStore from '../nodesStore';

/**
 * Returns a function that resets the execution counts of all nodes in a group except for the specified node.
 */
function useResetExecCounts() {
    const { getNodes } = useReactFlow();
    const setExecutionCount = useNodesStore((state) => state.setExecutionCount);

    const resetExecCounts = useCallback((group_node_id: string, ignore_node_id: string): void => {
        const nodes = getNodes();
        nodes.forEach((node) => {
            if (node.parentNode === group_node_id && node.id !== ignore_node_id) {
                setExecutionCount(node.id, node.data.executionCount?.execCount);
            }
        });
      }, [getNodes, setExecutionCount]);

    return resetExecCounts;
}

export default useResetExecCounts;