import { create } from 'zustand';

export type SettingsStore = {

    // INFO :: auto save setting
    autoSave: boolean;
    setAutoSave: (autoSave: boolean) => void;

    // INFO :: expand parent setting
    expandParent: boolean;
    setExpandParent: (expandParent: boolean) => void;

};

const useSettingsStore = create<SettingsStore>((set, get) => ({

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

}));

export default useSettingsStore;