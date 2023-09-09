import { create } from 'zustand';
import { 
  DEFAULT_LOCK_STATUS,   
  KERNEL_IDLE
 } from '../config/constants';

export type NodesStore = {
    locks: { [id: string]: boolean };
    toggleLock: (id: string) => void;
    getIsLockedForId: (id: string) => boolean;
    

    // INFO :: queue functionality
    queues: { [groupId: string]: Array<[string, string]> }; // Update the type for queue
    addToQueue: (groupId: string, nodeId: string, code: string) => void; // Include 'code' parameter
    removeFromQueue: (groupId: string) => void;
    clearQueue: (groupId: string) => void;
    groupNodesExecutionStates: { [groupId: string]: {nodeId: string, state: string} };
    setExecutionStateForGroupNode: (groupId: string, newState: {nodeId: string, state: string}) => void;
    getExecutionStateForGroupNode: (groupId: string) => {nodeId: string, state: string};

    // INFO :: ws state functionality
    groupNodesWsStates: { [groupId: string]: boolean };
    setWsStateForGroupNode: (groupId: string, new_state: boolean) => void;
    getWsStateForGroupNode: (groupId: string) => boolean;
};

const useNodesStore = create<NodesStore>((set, get) => ({
  locks: {},
  toggleLock: (id: string) => {
    // console.log('toggleLock - toggled for: ', id);
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
        // console.log("returining default status...")
        return DEFAULT_LOCK_STATUS;
    }
    // console.log("returining current status...")
    return get().locks[id];
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
        // console.log("returining default status...")
        return {nodeId: "", state: KERNEL_IDLE};
    }
    // console.log("returining current status...")
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
  getWsStateForGroupNode: (groupId: string): boolean => {
    const state = get().groupNodesWsStates[groupId]
    // check if state is undefined
    if (state === undefined) {
        set((state) => ({
            groupNodesWsStates: {
              ...state.groupNodesWsStates,
              [groupId]: false
            }
        }))
        console.log("returining default status...")
        return false;
    }
    console.log("returining current status...")
    return get().groupNodesWsStates[groupId];
  },
}));

export default useNodesStore;