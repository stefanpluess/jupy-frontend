import { useCallback } from 'react';
import { useReactFlow, useStoreApi } from 'reactflow';
import { selectorDeleteOutput, useWebSocketStore } from '../websocket';
import { shallow } from "zustand/shallow";

/**
 * A custom React hook that takes an `output_node_id` string parameter and deletes the output of the respective node.
 */
function useDeleteOutput() {
    const { setNodes } = useReactFlow();
    const store = useStoreApi();
    const { cellIdToOutputs, setCellIdToOutputs } = useWebSocketStore(selectorDeleteOutput, shallow);

    const deleteOutput = useCallback((output_node_id: string) => {

        // if the output node is not in the cellIdToOutputs, then update the nodes using setNodes
        if (!(output_node_id in cellIdToOutputs)) {
            const nodes = store.getState().getNodes();
            const updatedNodes = nodes.map((node) => {
                if (node.id === output_node_id) {
                    // console.log("deleting output of node: ", output_node_id);
                    return {
                        ...node,
                        data: {
                            ...node.data,
                            outputs: []
                        }
                    }
                } else {
                    return node
                }
            });
            setNodes(updatedNodes);
        } else {
            // if the output node is in the cellIdToOutputs, then update the cellIdToOutputs using setCellIdToOutputs
            // console.log("deleting output of node: ", output_node_id);
            setCellIdToOutputs({ ...cellIdToOutputs, [output_node_id]: [] });
        }
    }, [cellIdToOutputs, setCellIdToOutputs, store, setNodes]);

    return deleteOutput;
}

export default useDeleteOutput;