import { useEffect } from 'react';
import { useReactFlow, useStoreApi } from 'reactflow';
import { CellIdToMsgId, ExecutionCount, ExecutionOutput } from './types';

interface UpdateNodesProps {
    latestExecutionCount: ExecutionCount;
    latestExecutionOutput: ExecutionOutput;
  }
/**
 * A hook that updates the nodes in the React Flow graph based on the latest execution count and output.
 * @param latestExecutionCount The latest execution count.
 * @param latestExecutionOutput The latest execution output.
 * Additional helper function:
 * @param cellIdToMsgId A mapping of cell IDs to message IDs.
 */
const useUpdateNodes = ({latestExecutionCount, latestExecutionOutput} : UpdateNodesProps, cellIdToMsgId: CellIdToMsgId): void => {
    const { setNodes } = useReactFlow();
    const store = useStoreApi();
    /* 
     Another approach: instead of passing arguments we could use the useWebSocketStore
        import useWebSocketStore from './websocket/useWebSocketStore';
        const latestExecutionCount = useWebSocketStore((state) => state.latestExecutionCount);
        const latestExecutionOutput = useWebSocketStore((state) => state.latestExecutionOutput);
        const cellIdToMsgId = useWebSocketStore((state) => state.cellIdToMsgId);
    */
    useEffect(() => {
		// do not trigger on first render
		if (Object.keys(latestExecutionOutput).length === 0) return;
		const output = latestExecutionOutput.output;
        const isImage = latestExecutionOutput.isImage;
        const msg_id_execCount = latestExecutionCount.msg_id;
        const msg_id_output= latestExecutionOutput.msg_id;
        const executionCount = latestExecutionCount.execution_count;
        // TODO: in case of error, change font color
        const cell_id_execCount = cellIdToMsgId[msg_id_execCount];
        const cell_id_output = cellIdToMsgId[msg_id_output];


        //get nodes 
        const nodes = store.getState().getNodes();

        const updatedNodes = nodes.map((node) => {
        // if it matches, update the execution count
        if (node.id === cell_id_execCount) {
            return {
            ...node,
            data: {
                ...node.data,
                executionCount: executionCount
            },
            };
        // for the update cell, update the output
        // TODO: if the output is not changed, set it to empty
        } else if (node.id === cell_id_output+"_output") {
            return {
            ...node,
            data: {
                ...node.data,
                output: output,
                isImage: isImage,
            },
            };
        // if nothing matches, return the node without modification
        } else return node;
        });
        const newNodes = [...updatedNodes];
        setNodes(newNodes);
        // BUG - why it is executed twice if we do console.log?
        console.log("useUpdateNodes - latestExecutionCount: ", latestExecutionCount)
        console.log("useUpdateNodes - latestExecutionOutput: ", latestExecutionOutput)
        }, [latestExecutionOutput, latestExecutionCount]);
}

export default useUpdateNodes;