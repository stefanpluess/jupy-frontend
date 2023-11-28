import {useReactFlow} from 'reactflow';
import { useCallback } from 'react';
import useNodesStore from "../nodesStore";

/**
 * Custom hook that resets the cell branch in a React Flow graph.
 * It sets the cell branch as inactive, resets the selected nodes, and clears the clicked nodes.
 * @returns A function that can be called to reset the cell branch.
 */
export function useCellBranchReset() {
    const { setNodes } = useReactFlow();
    const setIsCellBranchActive = useNodesStore((state) => state.setIsCellBranchActive);
    const resetClickedNodes = useNodesStore((state) => state.resetClickedNodes);
    const setConfirmCellBranch = useNodesStore((state) => state.setConfirmCellBranch);

    const resetCellBranch = useCallback(() => {
        setIsCellBranchActive("", false);
        // reset selected nodes
        setNodes((nds) => {
          return nds.map((n) => {
            if (n.className === 'selected') {
              return { ...n, className: undefined, selected: false };
            }
            return { ...n };
          });
        });
        resetClickedNodes();
        setConfirmCellBranch(false);
      }, [setIsCellBranchActive, setNodes, resetClickedNodes, setConfirmCellBranch]);

  return resetCellBranch;
}

export default useCellBranchReset;
