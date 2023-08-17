import { useEffect, useRef, useState } from 'react';
import { useReactFlow } from 'reactflow';
import { CellIdToMsgId, CellIdToOutputs, ExecutionCount, ExecutionOutput, OutputNodeData } from '../../config/types';
import { WebSocketState } from '../websocket/webSocketStore';
// access the type from WebSocketState
type setCITOType = WebSocketState['setCellIdToOutputs'];

interface UpdateNodesProps {
    latestExecutionCount: ExecutionCount;
    latestExecutionOutput: ExecutionOutput;
    cellIdToOutputs: CellIdToOutputs;
    setCellIdToOutputs: setCITOType;
  }
/**
 * A hook that updates the nodes in the React Flow graph based on the latest execution count and output.
 * @param latestExecutionCount The latest execution count.
 * @param latestExecutionOutput The latest execution output.
 * @param cellIdToOutputs A mapping of cell IDs to outputs.
 * @param setCellIdToOutputs A setter function for the cellIdToOutputs mapping.
 * Additional helper function:
 * @param cellIdToMsgId A mapping of cell IDs to message IDs.
 */
const useUpdateNodesExeCountAndOuput = ({latestExecutionCount, latestExecutionOutput, 
                                         cellIdToOutputs, setCellIdToOutputs} : UpdateNodesProps, 
                                         cellIdToMsgId: CellIdToMsgId): void => {
    const { setNodes } = useReactFlow();
    const firstRenderExecCount = useRef(true);
    const firstRenderOutput = useRef(true);
    const [execCount, setExecCount] = useState(0);
    // create a mapping of cell ids to output objects (CellIdToOutputs)
    /* 
     Another approach: instead of passing arguments we could use the useWebSocketStore
        import useWebSocketStore from './websocket/useWebSocketStore';
        const latestExecutionCount = useWebSocketStore((state) => state.latestExecutionCount);
        const latestExecutionOutput = useWebSocketStore((state) => state.latestExecutionOutput);
        const cellIdToMsgId = useWebSocketStore((state) => state.cellIdToMsgId);
    */
    useEffect(() => {
		// do not trigger on first render
        if (firstRenderExecCount.current) {
            firstRenderExecCount.current = false;
            return;
        }
        // console.log("EXECUTION COUNT")
        const executionCount = latestExecutionCount.execution_count;
        setExecCount(executionCount);
    }, [latestExecutionCount]);


    useEffect(() => {
        if (firstRenderOutput.current) {
            firstRenderOutput.current = false;
            return;
        }
        // console.log("OUTPUT")
        const msg_id_output= latestExecutionOutput.msg_id;
        const cell_id_output = cellIdToMsgId[msg_id_output]+"_output";
        // create the new mapping (add if it doesn't exist, otherwise append to the existing array)
        const updatedCellIdToOutputs = {
            ...cellIdToOutputs,
            [cell_id_output]: [
                ...(cellIdToOutputs[cell_id_output] || []), {
                    output: latestExecutionOutput.output,
                    isImage: latestExecutionOutput.isImage,
                    outputType: latestExecutionOutput.outputType,
                } as OutputNodeData,
            ],
        }
        setCellIdToOutputs(updatedCellIdToOutputs);
    }, [latestExecutionOutput]);


    useEffect(() => {
        if (Object.keys(cellIdToOutputs).length === 0) return;
        // console.log("cellIdToOutputs changed: ", cellIdToOutputs)
        const msg_id_output= latestExecutionOutput.msg_id;
        const cell_id_output = cellIdToMsgId[msg_id_output]+"_output";
        if (cellIdToOutputs[cell_id_output] === undefined || !cellIdToOutputs[cell_id_output]) return;

        // go through all the nodes and set the outputs of the changed node
        setNodes((prevNodes) => {
            const updatedNodes = prevNodes.map((node) => {
                if (node.id === cell_id_output ) {
                    const allOutputs = [] as OutputNodeData[];
                    cellIdToOutputs[cell_id_output].forEach((output) => {
                        const newOutputData: OutputNodeData = {
                            output: output.output,
                            isImage: output.isImage,
                            outputType: output.outputType,
                        }
                        allOutputs.push(newOutputData);
                    })
                    // console.log("OUTPUT: ", allOutputs)
                    return {
                        ...node,
                        data: {
                            ...node.data,
                            outputs: allOutputs,
                        },
                    };
                // if nothing matches, return the node without modification
                } else return node;
            });
            return updatedNodes;
        });
    }, [cellIdToOutputs]);


    useEffect(() => {
        if (execCount === 0) return;
        // console.log("execCount changed: ", execCount)
        const msg_id_execCount = latestExecutionCount.msg_id;
        const cell_id_execCount = cellIdToMsgId[msg_id_execCount];

        setNodes((prevNodes) => {
            const updatedNodes = prevNodes.map((node) => {
                // if it matches, update the execution count
                if (node.id === cell_id_execCount) {
                    // console.log("EXECUTION COUNT: ", execCount)
                    return {
                        ...node,
                        data: {
                            ...node.data,
                            executionCount: execCount
                        },
                    };
                // if nothing matches, return the node without modification
                } else return node;
            });
            return updatedNodes;
        });
    }, [execCount]);

}

export default useUpdateNodesExeCountAndOuput;