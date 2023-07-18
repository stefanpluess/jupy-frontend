import { create } from 'zustand';
import { ExecutionCount, ExecutionOutput, CellIdToMsgId} from '../types';

export type WebSocketState = {
    latestExecutionCount: ExecutionCount;
    setLatestExecutionCount: (newObj: ExecutionCount) => void;
    getLatestExecutionCount: () => ExecutionCount;

    latestExecutionOutput: ExecutionOutput;
    setLatestExecutionOutput: (newObj: ExecutionOutput) => void;
    getLatestExecutionOutput: () => ExecutionOutput;

    cellIdToMsgId: CellIdToMsgId;
    setCellIdToMsgId: (newObj: CellIdToMsgId) => void;
    getCellIdToMsgId: () => CellIdToMsgId;
};

const useWebSocketStore = create<WebSocketState>((set, get) => ({
    latestExecutionCount: {} as ExecutionCount,
    latestExecutionOutput: {} as ExecutionOutput,
    cellIdToMsgId: {} as CellIdToMsgId,
    // setters
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
    setCellIdToMsgId: (newObj: CellIdToMsgId) => {
        set({
            cellIdToMsgId: newObj,
        });
    },
    // getters 
    getLatestExecutionCount: () => {
        return get().latestExecutionCount;
    },
    getLatestExecutionOutput: () => {
        return get().latestExecutionOutput;
    },
    getCellIdToMsgId: () => {
        return get().cellIdToMsgId;
    },
}));

export default useWebSocketStore;
