import { useCallback, useEffect, useRef } from 'react';
import { useReactFlow, useStoreApi } from 'reactflow';
import { EXTENT_PARENT, GROUP_NODE } from '../../config/constants';
import useSettingsStore from '../settingsStore';

/**
 * A custom React hook that updates all but group nodes extent / expandParent based on a new setting.
 */
function useChangeExpandParent() {

    const { setNodes } = useReactFlow();
    const store = useStoreApi();
    const expandParentSetting = useSettingsStore((state) => state.expandParent);
    const initialRender = useRef(true);

    const changeExpandParent = useCallback(() => {

        const { nodeInternals } = store.getState();
        const nextNodes = Array.from(nodeInternals.values()).map((n) => {
          if (n.type !== GROUP_NODE) {
            // initially set both off
            const updatedNode = {
                ...n,
                extent: undefined,
                expandParent: false,
            };
            // based on the new setting, set the extent or expandParent
            expandParentSetting ? updatedNode.expandParent = true : updatedNode.extent = EXTENT_PARENT;
            return updatedNode;
          }
          return n;
        });
        setNodes(nextNodes);
    
    }, [setNodes, store, expandParentSetting]);

    useEffect(() => {
        // do not trigger on initial render
        if (initialRender.current) {
            initialRender.current = false;
            return;
        }
        changeExpandParent();
    }, [expandParentSetting]);

}

export default useChangeExpandParent;