import { useCallback } from 'react';
import useNodesStore from '../nodesStore';

/**
 * A custom React hook that takes an `output_node_id` string parameter and deletes the output of the respective node.
 */
function useDeleteOutput() {
    const setNodeIdToOutputs = useNodesStore((state) => state.setNodeIdToOutputs);

    const deleteOutput = useCallback((output_node_id: string) => {

        setNodeIdToOutputs({ [output_node_id]: [] });

    }, [setNodeIdToOutputs]);

    return deleteOutput;
}

export default useDeleteOutput;