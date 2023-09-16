import { useCallback } from 'react';
import { useReactFlow } from 'reactflow';
import useNodesStore from '../nodesStore';
import { KERNEL_BUSY, NORMAL_NODE } from '../../config/constants';

function useRunAll() {
    const { getNode, getNodes } = useReactFlow();
    const addToQueue = useNodesStore((state) => state.addToQueue);
    const setExecutionCount = useNodesStore((state) => state.setExecutionCount);
    const setInfluenceStateForGroupNode = useNodesStore((state) => state.setInfluenceStateForGroupNode);

    /* Given a group node, puts all children into the queue based on their y position inside the group */
    const runAll = useCallback((group_node_id: string): void => {
        const nodes = getNodes();
        // sort nodes by their y position (lowest y first)
        const sortedNodes = nodes.sort((a, b) => a.position.y - b.position.y);
        if (sortedNodes.length > 0) {
            const groupNode = getNode(group_node_id);
            // grab all successors and set their influence to OFF (cut edges by default)
            groupNode!.data.successors?.forEach((succ: any) => {
                setInfluenceStateForGroupNode(succ, false);
            });
        }
        // for each child node, add it to the queue and set the execution count to *
        sortedNodes.forEach((node) => {
            if (node.parentNode === group_node_id && node.type === NORMAL_NODE) {
                addToQueue(group_node_id, node.id, node.data.code);
                setExecutionCount(node.id, '*');
            }
        });
      }, [addToQueue, getNodes, setExecutionCount]);

    return runAll;
}

export default useRunAll;