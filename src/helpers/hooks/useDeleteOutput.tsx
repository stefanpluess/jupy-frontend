import { useCallback } from 'react';
import { useReactFlow, useStoreApi } from 'reactflow';
import { selectorDeleteOutput, useWebSocketStore } from '../websocket';
import { shallow } from "zustand/shallow";

function useDeleteOutput() {
    const { setNodes } = useReactFlow();
    const store = useStoreApi();
    const { cellIdToOutputs, setCellIdToOutputs } = useWebSocketStore(selectorDeleteOutput, shallow);

    const deleteOutput = useCallback((output_node_id: string) => {
        // clear the output of the output node and set the nodes
        const nodes = store.getState().getNodes();
        const updatedNodes = nodes.map((node) => {
            if (node.id === output_node_id) {
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
        setCellIdToOutputs({ ...cellIdToOutputs, [output_node_id]: [] });
    }, [setNodes, cellIdToOutputs, store]);

    return deleteOutput;
}

export default useDeleteOutput;