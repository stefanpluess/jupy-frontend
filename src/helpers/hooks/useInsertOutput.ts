import { useCallback } from 'react';
import { useReactFlow } from 'reactflow';
import { createOutputNode } from '../utils';

function useInsertOutput() {
    const { getNode, setNodes, setEdges } = useReactFlow();

    const insertOutput = useCallback((node_id: string) => {
        const outputNode = createOutputNode(getNode(node_id)!);
        const edge = {
          id: node_id + "_edge",
          source: node_id,
          target: node_id + "_output"
        }
        setTimeout(() => { 
            setNodes((prevNodes) => [...prevNodes, outputNode]);
            setEdges((prevEdges) => [...prevEdges, edge]);
        }, 10);

    }, [getNode, setNodes, setEdges, createOutputNode]);

    return insertOutput;
}

export default useInsertOutput;