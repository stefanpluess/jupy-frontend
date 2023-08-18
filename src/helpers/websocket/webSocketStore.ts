import { create } from 'zustand';
import { ExecutionCount, ExecutionOutput, CellIdToMsgId, CellIdToOutputs} from '../../config/types';

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

    token: string;
    getToken: () => string;
};

const useWebSocketStore = create<WebSocketState>((set, get) => ({
    latestExecutionCount: {} as ExecutionCount,
    latestExecutionOutput: {} as ExecutionOutput,
    cellIdToOutputs: {} as CellIdToOutputs,
    cellIdToMsgId: {} as CellIdToMsgId,
    token : 'ae61040338cc071454457ae9a5929f20783729609718e3b9',

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
        set({
            cellIdToMsgId: newObj,
        });
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