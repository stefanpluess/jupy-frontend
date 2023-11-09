import { useCallback } from 'react';
import { Edge, Node, useReactFlow } from 'reactflow';
import { createOutputNode } from '../utils';
import { EXTENT_PARENT } from '../../config/constants';
import useSettingsStore from '../settingsStore';

/**
 * Returns a function that inserts output nodes and edges into the React Flow graph.
 */
function useInsertOutput() {
    const { getNode, setNodes, setEdges } = useReactFlow();
    const expandParentSetting = useSettingsStore((state) => state.expandParent);
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
            expandParentSetting ? outputNode.expandParent = true : outputNode.extent = EXTENT_PARENT;
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

    }, [getNode, setNodes, setEdges, createOutputNode, expandParentSetting]);

    return insertOutput;
}

export default useInsertOutput;