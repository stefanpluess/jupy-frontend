import { createWithEqualityFn } from 'zustand/traditional';
import { ExecInfo } from '../config/types';

export type ExecutionStore = {
    
    // INFO :: execution history
    historyPerNode: { [nodeId: string]: ExecInfo[] };
    addToHistory: (nodeId: string, executionInformation: ExecInfo) => void;
    clearHistory: (nodeId: string) => void;
    
};

const useExecutionStore = createWithEqualityFn<ExecutionStore>((set, get) => ({

    // INFO :: execution history
    historyPerNode: {},
    addToHistory: (nodeId: string, executionInformation: ExecInfo) => {
        const history = get().historyPerNode[nodeId] ?? [];
        set({ historyPerNode: { ...get().historyPerNode, [nodeId]: [...history, executionInformation] } });
    },
    clearHistory: (nodeId: string) => set({ historyPerNode: { ...get().historyPerNode, [nodeId]: [] } }),

}));

export default useExecutionStore;
