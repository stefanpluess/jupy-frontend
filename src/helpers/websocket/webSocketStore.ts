import { createWithEqualityFn } from 'zustand/traditional';
import { ExecutionCount, ExecutionOutput, NodeIdToMsgId } from '../../config/types';
/*
  WebSocket store based on zustand with functions relted to:
    - execution count
    - execution output
    - mapping of node id to message id
    - token
*/ 
export type WebSocketState = {
    // INFO :: latest execution count
    latestExecutionCount: ExecutionCount;
    setLatestExecutionCount: (newObj: ExecutionCount) => void;

    // INFO :: latest execution output
    latestExecutionOutput: ExecutionOutput;
    setLatestExecutionOutput: (newObj: ExecutionOutput) => void;

    // INFO :: mapping of node id to message id
    nodeIdToMsgId: NodeIdToMsgId;
    setNodeIdToMsgId: (newObj: NodeIdToMsgId) => void;

    // INFO :: token
    token: string; // extracted from .env file
};

const useWebSocketStore = createWithEqualityFn<WebSocketState>((set, get) => ({
    // INFO :: latest execution count
    latestExecutionCount: {} as ExecutionCount,
    setLatestExecutionCount: (newObj: ExecutionCount) => {
        set({
            latestExecutionCount: newObj,
        });
    },

    // INFO :: latest execution output
    latestExecutionOutput: {} as ExecutionOutput,
    setLatestExecutionOutput: (newObj: ExecutionOutput) => {
        set({
            latestExecutionOutput: newObj,
        });
    },
    
    // INFO :: mapping of node id to message id
    nodeIdToMsgId: {} as NodeIdToMsgId,
    setNodeIdToMsgId: (newObj: NodeIdToMsgId) => {
        // using the previous state, we can update the nodeIdToMsgId mapping
        set((state) => ({
            nodeIdToMsgId: {
                ...state.nodeIdToMsgId,
                ...newObj,
            },
        }));
    },

    // INFO :: token
    token : process.env.REACT_APP_API_TOKEN!,
}));

export default useWebSocketStore;


// COMMENT :: selectors
export const selectorGeneral = (state: WebSocketState) => ({
    setLatestExecutionCount: state.setLatestExecutionCount,
    setLatestExecutionOutput: state.setLatestExecutionOutput,
    token: state.token,
});
