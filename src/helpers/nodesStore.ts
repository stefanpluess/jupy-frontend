import { create } from 'zustand';
import { DEFAULT_LOCK_STATUS, KERNEL_IDLE } from '../config/constants';
import { NodeIdToOutputs, NodeIdToExecCount } from '../config/types';

export type NodesStore = {

    // INFO :: execution count
    nodeIdToExecCount: NodeIdToExecCount;
    setNodeIdToExecCount: (id: string, count: number | string) => void;

    // INFO :: outputs
    nodeIdToOutputs: NodeIdToOutputs;
    setNodeIdToOutputs: (newObj: NodeIdToOutputs) => void;

    // INFO :: lock functionality
    locks: { [id: string]: boolean };
    toggleLock: (id: string) => void;
    getIsLockedForId: (id: string) => boolean;

    // INFO :: 0️⃣ empty output type functionality
    outputNodesOutputType: { [id: string]: boolean };
    setOutputTypeEmpty: (id: string, type: boolean) => void;
  
    // INFO :: queue functionality
    queues: { [groupId: string]: Array<[string, string]> };
    addToQueue: (groupId: string, nodeId: string, code: string) => void;
    getTopOfQueue: (groupId: string) => [string, string] | undefined;
    removeFromQueue: (groupId: string) => void;
    clearQueue: (groupId: string) => void;
    groupNodesExecutionStates: { [groupId: string]: {nodeId: string, state: string} };
    setExecutionStateForGroupNode: (groupId: string, newState: {nodeId: string, state: string}) => void;
    getExecutionStateForGroupNode: (groupId: string) => {nodeId: string, state: string};

    // INFO :: ws state functionality
    groupNodesWsStates: { [groupId: string]: boolean };
    setWsStateForGroupNode: (groupId: string, new_state: boolean) => void;

    // INFO :: influence functionality
    groupNodesInfluenceStates: { [groupId: string]: boolean };
    setInfluenceStateForGroupNode: (groupId: string, new_state: boolean) => void;
    groupNodesPassStateDecisions: { [groupId: string]: boolean };
    setPassStateDecisionForGroupNode: (groupId: string, new_state: boolean) => void;
    groupNodesHadRecentError: { [groupId: string]: {hadError: boolean, timestamp: Date} };
    setHadRecentErrorForGroupNode: (groupId: string, new_state: {hadError: boolean, timestamp: Date}) => void;

    // INFO :: 😴 stale state functionality
    identifiersUsedInGroupNodes: { [groupId: string]: { [nodeId: string]: string[] } };
    getUsedIdentifiersForGroupNodes: (parentId: string) => { [key: string]: string[] };
    setUsedIdentifiersForGroupNodes: (parentId: string, nodeId: string, usedIdentifiers: string[]) => void;
    deleteNodeFromUsedIdentifiersForGroupNodes: (parentId: string, nodeId: string) => void;
    staleState: { [nodeId: string]: boolean };
    setStaleState: (nodeId: string, isStale: boolean) => void;

    // INFO :: showing order
    showOrder: { node: string, action: string }
    setShowOrder: (node_id: string, action: string) => void;
};

const useNodesStore = create<NodesStore>((set, get) => ({
  // INFO :: execution count
  nodeIdToExecCount: {} as NodeIdToExecCount,
  setNodeIdToExecCount: (id: string, count: number | string) => {
    // using the previous state, we can update the nodeIdToExecCount mapping
    set((state) => ({
      nodeIdToExecCount: {
          ...state.nodeIdToExecCount,
          [id]: {
            execCount: count,
            timestamp: new Date(),
          },
        },
    }))
  },
  // INFO :: outputs
  nodeIdToOutputs: {} as NodeIdToOutputs,
  setNodeIdToOutputs: (newObj: NodeIdToOutputs) => {
    // using the previous state, we can update the nodeIdToOutputs mapping
    set((state) => ({
        nodeIdToOutputs: {
            ...state.nodeIdToOutputs,
            ...newObj,
        },
    }));
  },
  // INFO :: lock functionality
  locks: {},
  toggleLock: (id: string) => {
    set((state) => ({
        locks: {
          ...state.locks,
          [id]: !state.locks[id]
        }
    })) 
  },
  getIsLockedForId: (id: string): boolean => {
    const state = get().locks[id]
    // check if state is undefined - initial status when locks is empty
    if (state === undefined) {
        set((state) => ({
            locks: {
                ...state.locks,
                [id]: DEFAULT_LOCK_STATUS
            }
        }))
        return DEFAULT_LOCK_STATUS;
    }
    return get().locks[id];
  },

  // INFO :: 0️⃣ empty output type functionality
  outputNodesOutputType: {},
  setOutputTypeEmpty: (id: string, type: boolean) => {
    set((state) => ({
        outputNodesOutputType: {
          ...state.outputNodesOutputType,
          [id]: type
        }
    }))
  },

  // INFO :: queue functionality
  queues: {},
  addToQueue: (groupId, nodeId, code) =>
    set((state) => ({
      queues: {
        ...state.queues,
        [groupId]: [...(state.queues[groupId] || []), [nodeId, code]],
      },
    })),
  getTopOfQueue: (groupId) => get().queues[groupId]?.[0],
  removeFromQueue: (groupId) =>
    set((state) => {
      const [, ...rest] = state.queues[groupId] || [];
      return { queues: { ...state.queues, [groupId]: rest } };
    }),
  clearQueue: (groupId) => set((state) => ({ queues: { ...state.queues, [groupId]: [] } })),
  groupNodesExecutionStates: {},
  setExecutionStateForGroupNode: (groupId: string, newState: {nodeId: string, state: string}) => {
    set((state) => ({
        groupNodesExecutionStates: {
          ...state.groupNodesExecutionStates,
          [groupId]: newState
        }
    }))
  },
  getExecutionStateForGroupNode: (groupId: string): {nodeId: string, state: string} => {
    const state = get().groupNodesExecutionStates[groupId]
    // check if state is undefined
    if (state === undefined) {
        set((state) => ({
            groupNodesExecutionStates: {
              ...state.groupNodesExecutionStates,
              [groupId]: {nodeId: "", state: KERNEL_IDLE}
            }
        }))
        return {nodeId: "", state: KERNEL_IDLE};
    }
    return get().groupNodesExecutionStates[groupId];
  },

  // INFO :: ws state functionality
  groupNodesWsStates: {},
  setWsStateForGroupNode: (groupId: string, new_state: boolean) => {
    set((state) => ({
        groupNodesWsStates: {
          ...state.groupNodesWsStates,
          [groupId]: new_state
        }
    })) 
  },

  // INFO :: influence state functionality
  groupNodesInfluenceStates: {},
  setInfluenceStateForGroupNode: (groupId: string, new_state: boolean) => {
    set((state) => ({
        groupNodesInfluenceStates: {
          ...state.groupNodesInfluenceStates,
          [groupId]: new_state
        }
    })) 
  },
  groupNodesPassStateDecisions: {},
  setPassStateDecisionForGroupNode: (groupId: string, new_state: boolean) => {
    set((state) => ({
        groupNodesPassStateDecisions: {
          ...state.groupNodesPassStateDecisions,
          [groupId]: new_state
        }
    })) 
  },
  groupNodesHadRecentError: {},
  setHadRecentErrorForGroupNode: (groupId: string, new_state: {hadError: boolean, timestamp: Date}) => {
    set((state) => ({
        groupNodesHadRecentError: {
          ...state.groupNodesHadRecentError,
          [groupId]: new_state
        }
    })) 
  },

  // INFO :: 😴 stale state functionality
  identifiersUsedInGroupNodes: {}, // could contain variables, functions, etc.
  getUsedIdentifiersForGroupNodes: (parentId: string) => get().identifiersUsedInGroupNodes[parentId] || {},
  setUsedIdentifiersForGroupNodes: (parentId: string, nodeId: string, usedIdentifiers: string[]) => {
    set((state) => ({
        identifiersUsedInGroupNodes: {
            ...state.identifiersUsedInGroupNodes,
            [parentId]: {
                ...(state.identifiersUsedInGroupNodes[parentId] || {}),
                [nodeId]: usedIdentifiers,
            },
        },
    }));
  },
  deleteNodeFromUsedIdentifiersForGroupNodes: (parentId: string, nodeId: string) => {
    set((state) => {
        const { [nodeId]: _, ...rest } = state.identifiersUsedInGroupNodes[parentId] || {};
        return { identifiersUsedInGroupNodes: { ...state.identifiersUsedInGroupNodes, [parentId]: rest } };
    });
  },
  staleState: {},
  setStaleState: (nodeId: string, isStale: boolean) => {
    set((state) => ({
        staleState: {
          ...state.staleState,
          [nodeId]: isStale
        }
    }))
  },
  // INFO :: showing order
  showOrder: { node: "", action: "" },
  setShowOrder: (node_id: string, action: string) => {
    set((state) => ({
        showOrder: {
          node: node_id,
          action: action
        }
    }))
  },
}));

export default useNodesStore;