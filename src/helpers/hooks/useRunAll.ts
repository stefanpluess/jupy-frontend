import { useCallback } from 'react';
import { useReactFlow } from 'reactflow';
import useNodesStore from '../nodesStore';
import { NORMAL_NODE } from '../../config/constants';
import { useInsertOutput } from '.';

function useRunAll() {
    const { getNode, getNodes } = useReactFlow();
    const addToQueue = useNodesStore((state) => state.addToQueue);
    const executionCounts = useNodesStore((state) => state.executionCounts);
    const setExecutionCount = useNodesStore((state) => state.setExecutionCount);
    const setInfluenceStateForGroupNode = useNodesStore((state) => state.setInfluenceStateForGroupNode);
    const insertOutput = useInsertOutput();

    /* Given a group node, puts all children into the queue based on their y position inside the group */
    const runAll = useCallback( async (group_node_id: string) => {
        const nodes = getNodes();
        const groupNode = getNode(group_node_id);
        if (!groupNode) return;
        const childNodes = nodes.filter((node) => node.parentNode === group_node_id && node.type === NORMAL_NODE);
        // sort childNodes by their y position (lowest y first)
        const sortedChildNodes = childNodes.sort((a, b) => a.position.y - b.position.y);
        // grab all successors and set their influence to OFF (cut edges by default)
        groupNode!.data.successors?.forEach((succ: any) => {
            setInfluenceStateForGroupNode(succ, false);
        });
        // filter the child nodes to only include those that have code and insert the output nodes
        const executableChildNodes = sortedChildNodes.filter((node) => node.data.code && node.data.code.trim() !== '');
        // for all executable child nodes with execution count being "", insert the output node
        const noOutputNodes = executableChildNodes.filter((node) => executionCounts[node.id]?.execCount === "");
        await insertOutput(noOutputNodes.map((node) => node.id));
        // for each child node with code, add it to the queue and set the execution count to *
        executableChildNodes.forEach((node) => {
            setExecutionCount(node.id, '*');
            addToQueue(group_node_id, node.id, node.data.code);
        });
      }, [addToQueue, getNodes, setExecutionCount, executionCounts, getNode, setInfluenceStateForGroupNode, insertOutput]);

    return runAll;
}

export default useRunAll;