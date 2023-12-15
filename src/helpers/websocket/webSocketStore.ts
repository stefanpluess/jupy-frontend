import { createWithEqualityFn } from 'zustand/traditional';
import { ExecutionCount, ExecutionOutput, NodeIdToMsgId } from '../../config/types';
/*
  WebSocket store based on zustand with functions relted to:
    - execution count
    - execution output
    - mapping of cell id to outputs
    - mapping of cell id to message id
*/ 
export type WebSocketState = {
    latestExecutionCount: ExecutionCount;
    setLatestExecutionCount: (newObj: ExecutionCount) => void;

    latestExecutionOutput: ExecutionOutput;
    setLatestExecutionOutput: (newObj: ExecutionOutput) => void;

    nodeIdToMsgId: NodeIdToMsgId;
    setNodeIdToMsgId: (newObj: NodeIdToMsgId) => void;

    token: string; // extracted from .env file
};

const useWebSocketStore = createWithEqualityFn<WebSocketState>((set, get) => ({
    latestExecutionCount: {} as ExecutionCount,
    latestExecutionOutput: {} as ExecutionOutput,
    nodeIdToMsgId: {} as NodeIdToMsgId,
    token : process.env.REACT_APP_API_TOKEN!,

    // COMMENT :: setters
    setLatestExecutionCount: (newObj: ExecutionCount) => {
        set({
            latestExecutionCount: newObj,
        });
    },
    setLatestExecutionOutput: (newObj: ExecutionOutput) => {
        set({
            latestExecutionOutput: newObj,
        });
    },
    setNodeIdToMsgId: (newObj: NodeIdToMsgId) => {
        // using the previous state, we can update the nodeIdToMsgId mapping
        set((state) => ({
            nodeIdToMsgId: {
                ...state.nodeIdToMsgId,
                ...newObj,
            },
        }));
    },
}));

export default useWebSocketStore;


// COMMENT :: selectors
export const selectorGeneral = (state: WebSocketState) => ({
    setLatestExecutionCount: state.setLatestExecutionCount,
    setLatestExecutionOutput: state.setLatestExecutionOutput,
    token: state.token,
});
