import { useCallback } from 'react';
import {  useReactFlow } from 'reactflow';
import { MAX_HEIGHT, MAX_WIDTH } from '../../config/constants';

function useResizeBoundaries() {

  const { getNode } = useReactFlow();
  
  const getResizeBoundaries = useCallback((node_id: string) => {
    const node = getNode(node_id);
    const parent = node?.parentNode ? getNode(node?.parentNode) : undefined;
    // if node has no parent, restrict resizing outside of the canvas
    if (!parent) {
      return {
        maxWidth: MAX_WIDTH,
        maxHeight: MAX_HEIGHT,
      };
    // otherwise, restrict resizing outside of the parent
    } else {
      return {
        maxWidth: Math.min(parent.width! - node!.position.x, MAX_WIDTH),
        maxHeight: Math.min(parent.height! - node!.position.y, MAX_HEIGHT),
      };
    }
  }, [getNode]);

    return getResizeBoundaries;
}

export default useResizeBoundaries;