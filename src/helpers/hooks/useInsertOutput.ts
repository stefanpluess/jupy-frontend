import { useCallback } from 'react';
import { Edge, Node, useReactFlow } from 'reactflow';
import { createOutputNode } from '../utils';

/**
 * Returns a function that inserts output nodes and edges into the React Flow graph.
 */
function useInsertOutput() {
    const { getNode, setNodes, setEdges } = useReactFlow();
    /**
     * Inserts output nodes and edges into the React Flow graph.
     * @param node_ids - An array of node IDs to insert output nodes and edges for.
     */
    const insertOutput = useCallback( async (node_ids: string[]) => {
        if (node_ids.length === 0) return;
        const newNodes = [] as Node[];
        const newEdges = [] as Edge[];
        node_ids.forEach((node_id) => {
            const outputNode = createOutputNode(getNode(node_id)!);
            const edge = {
                id: node_id + "_edge",
                source: node_id,
                target: node_id + "_output"
            };
            newNodes.push(outputNode);
            newEdges.push(edge);
        });
        setNodes((prevNodes) => [...prevNodes, ...newNodes]);
        setEdges((prevEdges) => [...prevEdges, ...newEdges]);
        await new Promise((resolve) => setTimeout(resolve, 10));

    }, [getNode, setNodes, setEdges, createOutputNode]);

    return insertOutput;
}

export default useInsertOutput;