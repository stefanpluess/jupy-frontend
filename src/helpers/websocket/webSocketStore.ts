import { create } from 'zustand';
import { ExecutionCount, ExecutionOutput, CellIdToMsgId, CellIdToOutputs} from '../../config/types';
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
    getLatestExecutionCount: () => ExecutionCount;

    latestExecutionOutput: ExecutionOutput;
    setLatestExecutionOutput: (newObj: ExecutionOutput) => void;
    getLatestExecutionOutput: () => ExecutionOutput;

    cellIdToOutputs: CellIdToOutputs;
    setCellIdToOutputs: (newObj: CellIdToOutputs) => void;
    getCellIdToOutputs: () => CellIdToOutputs;

    cellIdToMsgId: CellIdToMsgId;
    setCellIdToMsgId: (newObj: CellIdToMsgId) => void;
    getCellIdToMsgId: () => CellIdToMsgId;

    token: string; // extracted from .env file
    getToken: () => string;
};

const useWebSocketStore = create<WebSocketState>((set, get) => ({
    latestExecutionCount: {} as ExecutionCount,
    latestExecutionOutput: {} as ExecutionOutput,
    cellIdToOutputs: {} as CellIdToOutputs,
    cellIdToMsgId: {} as CellIdToMsgId,
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
    setCellIdToOutputs: (newObj: CellIdToOutputs) => {
        set({
            cellIdToOutputs: newObj,
        });
    },
    setCellIdToMsgId: (newObj: CellIdToMsgId) => {
        // using the previous state, we can update the cellIdToMsgId mapping
        set((state) => ({
            cellIdToMsgId: {
                ...state.cellIdToMsgId,
                ...newObj,
            },
        }));
    },
    // COMMENT :: getters 
    getLatestExecutionCount: () => {
        return get().latestExecutionCount;
    },
    getLatestExecutionOutput: () => {
        return get().latestExecutionOutput;
    },
    getCellIdToOutputs: () => {
        return get().cellIdToOutputs;
    },
    getCellIdToMsgId: () => {
        return get().cellIdToMsgId;
    },
    getToken: () => {
        return get().token;
    }
}));

export default useWebSocketStore;


// COMMENT :: selectors
export const selectorHome = (state: WebSocketState) => ({
    latestExecutionCount: state.latestExecutionCount,
    setLatestExecutionCount: state.setLatestExecutionCount,
    latestExecutionOutput: state.latestExecutionOutput,
    setLatestExecutionOutput: state.setLatestExecutionOutput,
    cellIdToOutputs: state.cellIdToOutputs,
    setCellIdToOutputs: state.setCellIdToOutputs,
    cellIdToMsgId: state.cellIdToMsgId,
    token: state.token,
});

export const selectorBubbleBranch = (state: WebSocketState) => ({
    setLatestExecutionOutput: state.setLatestExecutionOutput,
    setLatestExecutionCount: state.setLatestExecutionCount,
    token: state.token,
 });

export const selectorDeleteOutput = (state: WebSocketState) => ({
    cellIdToOutputs: state.cellIdToOutputs,
    setCellIdToOutputs: state.setCellIdToOutputs,
});