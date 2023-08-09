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

    token: string;
    getToken: () => string;
};

const useWebSocketStore = create<WebSocketState>((set, get) => ({
    latestExecutionCount: {} as ExecutionCount,
    latestExecutionOutput: {} as ExecutionOutput,
    cellIdToMsgId: {} as CellIdToMsgId,
    websocketNumber: 0,
    token : 'e1630c153107a74bebc9bd3115d03742601d561c94c10085',

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
    token: state.token,
  });

export const selectorBubbleBranch = (state: WebSocketState) => ({
    setLatestExecutionOutput: state.setLatestExecutionOutput,
    setLatestExecutionCount: state.setLatestExecutionCount,
    token: state.token,
  });