import { create } from 'zustand';
import { DEFAULT_LOCK_STATUS } from '../config/constants';

export type NodesStore = {
    locks: { [id: string]: boolean };
    toggleLock: (id: string) => void;
    getIsLockedForId: (id: string) => boolean;
    

    // INFO :: queue functionality
    queues: { [groupId: string]: Array<[string, string]> }; // Update the type for queue
    addToQueue: (groupId: string, nodeId: string, code: string) => void; // Include 'code' parameter
    removeFromQueue: (groupId: string) => void;
    getCurrentNode: (groupId: string) => [string, string] | undefined; // Return a tuple or undefined
    printQueue: () => { [groupId: string]: Array<[string, string]> };
    groupNodesExecutionStates: { [groupId: string]: boolean };
    setExecutionStateForGroupNode: (groupId: string, new_state: boolean) => void;
    getExecutionStateForGroupNode: (groupId: string) => boolean;
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
  getCurrentNode: (groupId) => (get().queues[groupId] || [])[0],
  printQueue: () => get().queues,
  groupNodesExecutionStates: {},
  setExecutionStateForGroupNode: (groupId: string, new_state: boolean) => {
    set((state) => ({
        groupNodesExecutionStates: {
          ...state.groupNodesExecutionStates,
          [groupId]: new_state
        }
    })) 
  },
  getExecutionStateForGroupNode: (groupId: string): boolean => {
    const state = get().groupNodesExecutionStates[groupId]
    // check if state is undefined
    if (state === undefined) {
        set((state) => ({
            groupNodesExecutionStates: {
              ...state.groupNodesExecutionStates,
              [groupId]: false
            }
        }))
        console.log("returining default status...")
        return false;
    }
    console.log("returining current status...")
    return get().groupNodesExecutionStates[groupId];
  },
}));

export default useNodesStore;