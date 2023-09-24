import { useCallback } from 'react';
import { Edge, Node, useReactFlow } from 'reactflow';
import { createOutputNode } from '../utils';

function useInsertOutput() {
    const { getNode, setNodes, setEdges } = useReactFlow();

    const insertOutput = useCallback((node_ids: string[]) => {
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
        setTimeout(() => {
            setNodes((prevNodes) => [...prevNodes, ...newNodes]);
            setEdges((prevEdges) => [...prevEdges, ...newEdges]);
        }, 10);

    }, [getNode, setNodes, setEdges, createOutputNode]);

    return insertOutput;
}

export default useInsertOutput;