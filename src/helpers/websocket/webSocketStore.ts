import { create } from 'zustand';
import { ExecutionCount, ExecutionOutput, CellIdToMsgId} from '../../config/types';

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

    websocketNumber: number;
    setWebsocketNumber: (newNumber: number) => void;
    getWebsocketNumber: () => number;

    token: string;
    getToken: () => string;
};

const useWebSocketStore = create<WebSocketState>((set, get) => ({
    latestExecutionCount: {} as ExecutionCount,
    latestExecutionOutput: {} as ExecutionOutput,
    cellIdToMsgId: {} as CellIdToMsgId,
    websocketNumber: 0,
    token : 'd1441e5c6eada22e95e418c1b291dfa77dca2a7c22cb0110',

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
    setCellIdToMsgId: (newObj: CellIdToMsgId) => {
        set({
            cellIdToMsgId: newObj,
        });
    },
    setWebsocketNumber: (newNumber: number) => {
        set({
            websocketNumber: newNumber,
        });
    },
    // COMMENT :: getters 
    getLatestExecutionCount: () => {
        return get().latestExecutionCount;
    },
    getLatestExecutionOutput: () => {
        return get().latestExecutionOutput;
    },
    getCellIdToMsgId: () => {
        return get().cellIdToMsgId;
    },
    getWebsocketNumber: () => {
        return get().websocketNumber;
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
    cellIdToMsgId: state.cellIdToMsgId,
    websocketNumber: state.websocketNumber,
    setWebsocketNumber: state.setWebsocketNumber,
    token: state.token,
  });

export const selectorBubbleBranch = (state: WebSocketState) => ({
    setWebsocketNumber: state.setWebsocketNumber,
    getWebsocketNumber: state.getWebsocketNumber,
    setLatestExecutionOutput: state.setLatestExecutionOutput,
    setLatestExecutionCount: state.setLatestExecutionCount,
    token: state.token,
  });