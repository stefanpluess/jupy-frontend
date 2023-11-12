import { create } from 'zustand';

export type SettingsStore = {

    showSettings: boolean;
    setShowSettings: (showSettings: boolean) => void;

    // INFO :: auto save setting
    autoSave: boolean;
    setAutoSave: (autoSave: boolean) => void;

    // INFO :: expand parent setting
    expandParent: boolean;
    setExpandParent: (expandParent: boolean) => void;

    // INFO :: floating edges setting
    floatingEdges: boolean;
    setFloatingEdges: (floatingEdges: boolean) => void;

};

const useSettingsStore = create<SettingsStore>((set, get) => ({

    showSettings: false,
    setShowSettings: (showSettings: boolean) => set({ showSettings }),

    // INFO :: auto save setting
    autoSave: localStorage.getItem('autoSave') === 'true',
    setAutoSave: (autoSave: boolean) => {
        set({ autoSave });
        localStorage.setItem('autoSave', autoSave.toString());
    },

    // INFO :: expand parent setting
    expandParent: localStorage.getItem('expandParent') === 'true',
    setExpandParent: (expandParent: boolean) => {
        set({ expandParent });
        localStorage.setItem('expandParent', expandParent.toString());
    },

    // INFO :: floating edges setting
    floatingEdges: localStorage.getItem('floatingEdges') === 'true',
    setFloatingEdges: (floatingEdges: boolean) => {
        set({ floatingEdges });
        localStorage.setItem('floatingEdges', floatingEdges.toString());
    },

}));

export default useSettingsStore;