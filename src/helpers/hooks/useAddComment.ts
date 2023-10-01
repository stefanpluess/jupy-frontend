import { useCallback } from 'react';
import { Position, useReactFlow, useStoreApi } from 'reactflow';
import { COMMENT_NODE } from '../../config/constants';

/**
 * A hook that returns a function to add comments to nodes in the React Flow graph.
 * Designed to be used in the SimpleNode toolbar. 
 */
function useAddComment() {
  const { setNodes } = useReactFlow();
  const store = useStoreApi();

  const addComments = useCallback(
    (ids: string[], textComment: string) => {
      const nodes = ids.map((id) => {
        const node = store.getState().nodeInternals.get(id);
        if (!node) {
          return null;
        }
        const comment = {
          id: `${COMMENT_NODE}-${id}`,
          type: COMMENT_NODE,
          data: {
            label: 'Comments:',
            text: textComment,

          },
          position: {
            x: node.position.x + 150,
            y: node.position.y + 100,
          },
          style: {
            width: 200,
            height: 100,
          },
          isVisible: true,
        };
        return comment;
      }).filter(Boolean);

      //setNodes((currentNodes) => [...currentNodes, ...nodes]);
    },
    [setNodes, store]
  );

  return addComments;
}

// <Handle type="source" position={Position.Bottom} />


export default useAddComment;
