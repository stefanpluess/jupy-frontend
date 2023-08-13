import { useEffect, useRef } from 'react';
import { useReactFlow, useStoreApi } from 'reactflow';
import { CellIdToMsgId, ExecutionCount, ExecutionOutput } from '../../config/types';

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
const useUpdateNodesExeCountAndOuput = ({latestExecutionCount, latestExecutionOutput} : UpdateNodesProps, cellIdToMsgId: CellIdToMsgId): void => {
    const { setNodes } = useReactFlow();
    const store = useStoreApi();
    const firstRender = useRef(true);
    /* 
     Another approach: instead of passing arguments we could use the useWebSocketStore
        import useWebSocketStore from './websocket/useWebSocketStore';
        const latestExecutionCount = useWebSocketStore((state) => state.latestExecutionCount);
        const latestExecutionOutput = useWebSocketStore((state) => state.latestExecutionOutput);
        const cellIdToMsgId = useWebSocketStore((state) => state.cellIdToMsgId);
    */
    useEffect(() => {
		// do not trigger on first render
        if (firstRender.current) {
            firstRender.current = false;
            return;
        }
		const output = latestExecutionOutput.output;
        const isImage = latestExecutionOutput.isImage;
        const outputType = latestExecutionOutput.outputType;
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
            // console.log("EXECUTION COUNT")
            return {
                ...node,
                data: {
                    ...node.data,
                    executionCount: executionCount
                },
            };
        // for the update cell, update the output
        // TODO: if the output is not changed, set it to empty
        } else if (node.id === cell_id_output+"_output" ) {
            // console.log("OUTPUT")
            return {
            ...node,
            data: {
                ...node.data,
                output: output,
                isImage: isImage,
                outputType: outputType,
            },
            };
        // if nothing matches, return the node without modification
        } else return node;
        });
        const newNodes = [...updatedNodes];
        setNodes(newNodes);
    }, [latestExecutionOutput, latestExecutionCount]);
}

export default useUpdateNodesExeCountAndOuput;