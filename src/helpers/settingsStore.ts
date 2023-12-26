import { createWithEqualityFn } from 'zustand/traditional';
import { INSERTION_ORDER, TOP_DOWN_ORDER } from '../config/constants';

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

    // INFO :: order settings
    runAllOrder: string;
    setRunAllOrder: (order: string) => void;
    exportOrder: string;
    setExportOrder: (order: string) => void;

    // INFO :: grid settings
    snapGrid: boolean;
    setSnapGrid: (snapGrid: boolean) => void;
};

const useSettingsStore = createWithEqualityFn<SettingsStore>((set, get) => ({

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

    // INFO :: order settings
    runAllOrder: localStorage.getItem('runAllOrder') ?? TOP_DOWN_ORDER,
    setRunAllOrder: (order: string) => {
        set({ runAllOrder: order });
        localStorage.setItem('runAllOrder', order);
    },
    exportOrder: localStorage.getItem('exportOrder') ?? INSERTION_ORDER,
    setExportOrder: (order: string) => {
        set({ exportOrder: order });
        localStorage.setItem('exportOrder', order);
    },

    // INFO :: grid settings
    snapGrid: localStorage.getItem('snapGrid') !== 'false',
    setSnapGrid: (snapGrid: boolean) => {
        set({ snapGrid });
        localStorage.setItem('snapGrid', snapGrid.toString());
    },

}));

export default useSettingsStore;