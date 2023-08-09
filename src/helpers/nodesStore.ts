import { create } from 'zustand';
import { DEFAULT_LOCK_STATUS } from '../config/constants';

export type NodesStore = {
    locks: { [id: string]: boolean };
    toggleLock: (id: string) => void;
    getIsLockedForId: (id: string) => boolean;
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
}));

export default useNodesStore;