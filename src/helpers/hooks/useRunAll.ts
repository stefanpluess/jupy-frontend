import { useCallback } from 'react';
import { useReactFlow, Node } from 'reactflow';
import useNodesStore from '../nodesStore';
import { NORMAL_NODE } from '../../config/constants';
import { useInsertOutput } from '.';

/**
 * A custom hook that returns a function to run all executable child nodes of a group node.
 */
function useRunAll() {
    const { getNode, getNodes } = useReactFlow();
    const addToQueue = useNodesStore((state) => state.addToQueue);
    const nodeIdToExecCount = useNodesStore((state) => state.nodeIdToExecCount);
    const setNodeIdToExecCount = useNodesStore((state) => state.setNodeIdToExecCount);
    const setInfluenceStateForGroupNode = useNodesStore((state) => state.setInfluenceStateForGroupNode);
    const insertOutput = useInsertOutput();

    /* Given a group node, puts all children into the queue based on their y position inside the group */
    const runAll = useCallback( async (group_node_id: string, selected_node_ids: string[], disable_edges: boolean) => {
        const nodes = getNodes();
        const groupNode = getNode(group_node_id);
        if (!groupNode) return;
        const childNodes = nodes.filter((node) => node.parentNode === group_node_id && node.type === NORMAL_NODE);
        // check if selected_node_ids is empty
        let sortedChildNodes: Node<any>[] = [];
        if (selected_node_ids.length === 0){
            // sort childNodes by their y position (lowest y first)
            sortedChildNodes = childNodes.sort((a, b) => a.position.y - b.position.y);
        } else{
            // filter childNodes to only include those that are selected
            sortedChildNodes = childNodes.filter((node) => selected_node_ids.includes(node.id));
        }
        // grab all successors and set their influence to OFF (cut edges by default)
        if (disable_edges){
            groupNode!.data.successors?.forEach((succ: any) => {
                setInfluenceStateForGroupNode(succ, false);
            });
        }
        // filter the child nodes to only include those that have code and insert the output nodes
        const executableChildNodes = sortedChildNodes.filter((node) => node.data.code && node.data.code.trim() !== '');
        // for all executable child nodes with execution count being "", insert the output node
        const noOutputNodes = executableChildNodes.filter((node) => nodeIdToExecCount[node.id]?.execCount === "");
        await insertOutput(noOutputNodes.map((node) => node.id));
        // for each child node with code, add it to the queue and set the execution count to *
        executableChildNodes.forEach((node) => {
            setNodeIdToExecCount(node.id, '*');
            addToQueue(group_node_id, node.id, node.data.code);
        });
      }, [addToQueue, getNodes, setNodeIdToExecCount, nodeIdToExecCount, getNode, setInfluenceStateForGroupNode, insertOutput]);

    return runAll;
}

export default useRunAll;