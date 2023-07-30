import { useCallback } from 'react';
import { useReactFlow, useStoreApi } from 'reactflow';




function useAddComment() {
  const { setNodes } = useReactFlow();
  const store = useStoreApi();

  const addComments = useCallback(
    (ids: string[]) => {

      const nodes = ids.map((id) => {
        const node = store.getState().nodeInternals.get(id);
        if (!node) {
          return null;
        }
        const comment = {
          id: `comment-${id}`,
          type: 'comment',
          data: { label: 'Comments:' },
          position: {
            x: node.position.x + 200,
            y: node.position.y + 100,
          },
          style: {
            width: 200,
            height: 100,
          },
        };
        return comment;
      });

      /*setNodes((currentNodes) => [...currentNodes, ...nodes]);*/
    },
    [setNodes, store]
  );

  return addComments;
}

export default useAddComment;
