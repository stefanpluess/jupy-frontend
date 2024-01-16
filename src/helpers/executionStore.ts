import { createWithEqualityFn } from 'zustand/traditional';
import { ExecInfo } from '../config/types';

export type ExecutionStore = {
    
    // INFO :: execution history
    historyPerNode: { [nodeId: string]: ExecInfo[] };
    addToHistory: (nodeId: string, execInfo: ExecInfo) => void;
    clearHistory: (nodeId: string) => void;
    removeNodeFromHistory: (nodeId: string) => void;

    // INFO :: execution actions
    fitViewNodeId: string | undefined;
    setFitViewNodeId: (nodeId: string | undefined) => void;
    hoveredNodeId: string | undefined;
    setHoveredNodeId: (nodeId: string | undefined) => void;
    clickedNodeCode: string | undefined;
    setClickedNodeCode: (nodeCode: string | undefined) => void;
    deletedNodeIds: string[];
    addDeletedNodeIds: (nodeIds: string[]) => void;
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

    // INFO :: execution actions
    fitViewNodeId: undefined,
    setFitViewNodeId: (nodeId: string | undefined) => set({ fitViewNodeId: nodeId }),
    hoveredNodeId: undefined,
    setHoveredNodeId: (nodeId: string | undefined) => set({ hoveredNodeId: nodeId }),
    clickedNodeCode: undefined,
    setClickedNodeCode: (nodeCode: string | undefined) => set({ clickedNodeCode: nodeCode }),
    deletedNodeIds: [],
    addDeletedNodeIds: (nodeIds: string[]) => set({ deletedNodeIds: [...get().deletedNodeIds, ...nodeIds] }),
}));

export default useExecutionStore;
