import { useCallback, useEffect, useRef } from 'react';
import { useReactFlow, useStoreApi } from 'reactflow';
import { FLOATING_EDGE, NORMAL_EDGE } from '../../config/constants';
import useSettingsStore from '../settingsStore';

/**
 * A custom React hook that updates all but group edges type based on a new setting.
 */
function useChangeFloatingEdges() {

    const { getEdges, setEdges } = useReactFlow();
    const store = useStoreApi();
    const floatingEdgesSetting = useSettingsStore((state) => state.floatingEdges);
    const initialRender = useRef(true);

    const changeFloatingEdges = useCallback(() => {

        // change all edges from code to output according to the new setting
        const nextEdges = getEdges().map((e) => {
            if (!floatingEdgesSetting && e.type === FLOATING_EDGE) {
                return {
                    ...e,
                    type: NORMAL_EDGE,
                };
            } else if (floatingEdgesSetting && e.type === NORMAL_EDGE) {
                return {
                    ...e,
                    type: FLOATING_EDGE,
                };
            } else {
                return e;
            }
        });
        setEdges(nextEdges);
    
    }, [setEdges, store, floatingEdgesSetting]);

    useEffect(() => {
        // do not trigger on initial render
        if (initialRender.current) {
            initialRender.current = false;
            return;
        }
        changeFloatingEdges();
    }, [floatingEdgesSetting]);

}

export default useChangeFloatingEdges;