import { useEffect, useRef } from 'react';
import { OutputNodeData } from '../../config/types';
import useWebSocketStore from '../websocket/webSocketStore';
import useNodesStore from '../nodesStore';

/**
 * A custom hook that updates the nodesStore based on the latest execution count and output (from webSocketStore).
 */
const useUpdateNodesExeCountAndOuput = (): void => {

    const latestExecutionCount = useWebSocketStore((state) => state.latestExecutionCount);
    const latestExecutionOutput = useWebSocketStore((state) => state.latestExecutionOutput);

    const nodeIdToOutputs = useNodesStore((state) => state.nodeIdToOutputs);
    const setNodeIdToOutputs = useNodesStore((state) => state.setNodeIdToOutputs);
    const nodeIdToMsgId = useWebSocketStore((state) => state.nodeIdToMsgId);
    const setNodeIdToExecCount = useNodesStore((state) => state.setNodeIdToExecCount);
    const firstRenderExecCount = useRef(true);
    const firstRenderOutput = useRef(true);
   
    /**
     * This useEffect is triggered whenever a websocket message updates the latestExecutionCount.
     * It then fetches the corresponding cell_id and updates the nodesStore.
     */
    useEffect(() => {
		// do not trigger on first render
        if (firstRenderExecCount.current) {
            firstRenderExecCount.current = false;
            return;
        }
        // console.log("LATEST EXECUTION COUNT")
        const executionCount = latestExecutionCount.execution_count;
        const msg_id_execCount = latestExecutionCount.msg_id;
        const node_id_execCount = nodeIdToMsgId[msg_id_execCount];
        setNodeIdToExecCount(node_id_execCount, executionCount);
    }, [latestExecutionCount]);

    /**
     * This useEffect is triggered whenever a websocket message updates the latestExecutionOutput.
     * It then fetches the corresponding cell_id and updates the nodesStore.
     */
    useEffect(() => {
        if (firstRenderOutput.current) {
            firstRenderOutput.current = false;
            return;
        }
        // console.log("OUTPUT")
        const msg_id_output= latestExecutionOutput.msg_id;
        const node_id_output = nodeIdToMsgId[msg_id_output]+"_output";
        // create the new mapping (add if it doesn't exist, otherwise append to the existing array)
        const newOutputsMapping = {
            [node_id_output]: [
                ...(nodeIdToOutputs[node_id_output] || []), {
                    output: latestExecutionOutput.output,
                    outputHTML: latestExecutionOutput.outputHTML,
                    isImage: latestExecutionOutput.isImage,
                    outputType: latestExecutionOutput.outputType,
                } as OutputNodeData,
            ],
        }
        setNodeIdToOutputs(newOutputsMapping);
    }, [latestExecutionOutput]);

}

export default useUpdateNodesExeCountAndOuput;