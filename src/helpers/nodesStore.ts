import { create } from 'zustand';
import { DEFAULT_LOCK_STATUS } from '../config/constants';

export type NodesStore = {
    locks: { [id: string]: boolean };
    toggleLock: (id: string) => void;
    getIsLockedForId: (id: string) => boolean;
    

    // INFO :: queue functionality
    currentStatus: string;
    setCurrentStatus: (status: string) => void;
    getCurrentStatus: () => string;

    // queue: Array<string>;
    // addToQueue: (nodeId: string) => void;
    // removeFromQueue: () => void;
    // getCurrentNode: () => string;
    queues: { [groupId: string]: Array<string> }; // Object to store queues for each ws
    addToQueue: (groupId: string, nodeId: string) => void;
    removeFromQueue: (groupId: string) => void;
    getCurrentNode: (groupId: string) => string;
    printQueue: () => {}, 
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
  currentStatus: 'idle',
  setCurrentStatus: (status) => set({ currentStatus: status }),
  getCurrentStatus: () => get().currentStatus,

  // queue: [],
  // addToQueue: (nodeId) => set((state) => ({ queue: [...state.queue, nodeId] })),
  // removeFromQueue: () => set((state) => ({ queue: state.queue.slice(1) })),
  // getCurrentNode: () => get().queue[0],
  queues: {},
  addToQueue: (groupId, nodeId) =>
    set((state) => ({
      queues: {
        ...state.queues,
        [groupId]: [...(state.queues[groupId] || []), nodeId],
      },
    })),
  removeFromQueue: (groupId) =>
    set((state) => {
      const [removed, ...rest] = state.queues[groupId] || [];
      return { queues: { ...state.queues, [groupId]: rest } };
    }),
  getCurrentNode: (groupId) => (get().queues[groupId] || [])[0],
  printQueue: () => get().queues,

}));

export default useNodesStore;