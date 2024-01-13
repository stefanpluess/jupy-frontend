import { createWithEqualityFn } from 'zustand/traditional';
import { ExecInfo } from '../config/types';

export type ExecutionStore = {
    
    // INFO :: execution history
    historyPerNode: { [nodeId: string]: ExecInfo[] };
    addToHistory: (nodeId: string, execInfo: ExecInfo) => void;
    clearHistory: (nodeId: string) => void;
    removeNodeFromHistory: (nodeId: string) => void;
    
};

const useExecutionStore = createWithEqualityFn<ExecutionStore>((set, get) => ({

    // INFO :: execution history
    historyPerNode: {},
    addToHistory: (nodeId: string, execInfo: ExecInfo) => {
        const history = get().historyPerNode[nodeId] ?? [];
        set({ historyPerNode: { ...get().historyPerNode, [nodeId]: [...history, execInfo] } });
    },
    clearHistory: (nodeId: string) => set({ historyPerNode: { ...get().historyPerNode, [nodeId]: [] } }),
    removeNodeFromHistory: (nodeId: string) => {
        const historyPerNode = get().historyPerNode;
        delete historyPerNode[nodeId];
        set({ historyPerNode: { ...historyPerNode } });
    },

}));

export default useExecutionStore;
