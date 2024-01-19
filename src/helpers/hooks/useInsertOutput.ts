import { useCallback } from 'react';
import { Edge, Node, useReactFlow, Rect} from 'reactflow';
import { createOutputNode } from '../utils';
import { EXTENT_PARENT, FLOATING_EDGE, MIN_OUTPUT_SIZE, NORMAL_EDGE } from '../../config/constants';
import useSettingsStore from '../settingsStore';

/**
 * Returns a function that inserts output nodes and edges into the React Flow graph.
 */
function useInsertOutput() {
    const { getNode, setNodes, setEdges, isNodeIntersecting } = useReactFlow();
    const expandParentSetting = useSettingsStore((state) => state.expandParent);
    const floatingEdgesSetting = useSettingsStore((state) => state.floatingEdges);
    /**
     * Inserts output nodes and edges into the React Flow graph.
     * @param node_ids - An array of node IDs to insert output nodes and edges for.
     */
    const insertOutput = useCallback( async (node_ids: string[], adjustPosition: boolean) => {
        if (node_ids.length === 0) return;
        const newNodes = [] as Node[];
        const newEdges = [] as Edge[];
        node_ids.forEach((node_id) => {
            let outputNode = createOutputNode(getNode(node_id)!);
            // adjust the position if argument set & actually needed
            if (adjustPosition) {
                outputNode = adjustOutputNodePosition(outputNode, node_id) ?? outputNode;
            }
            // set the extent or expandParent
            expandParentSetting ? outputNode.expandParent = true : outputNode.extent = EXTENT_PARENT;
            const edge = {
                id: node_id + "_edge",
                source: node_id,
                target: node_id + "_output",
                type: floatingEdgesSetting ? FLOATING_EDGE : NORMAL_EDGE,
            };
            newNodes.push(outputNode);
            newEdges.push(edge);
        });
        setNodes((prevNodes) => [...prevNodes, ...newNodes]);
        setEdges((prevEdges) => [...prevEdges, ...newEdges]);

    }, [getNode, setNodes, setEdges, createOutputNode, expandParentSetting, floatingEdgesSetting]);

    const adjustOutputNodePosition = useCallback((outputNode: Node, node_id: string): Node | undefined => {
        const simpleNode = getNode(node_id);
        if (!simpleNode) {
            console.warn("Code cell not found. Intersection may still exist.");
            return undefined;
        }
        let rectOutputNode: Rect = { 
            x: outputNode.position.x, 
            y: outputNode.position.y, 
            width: MIN_OUTPUT_SIZE, 
            height: MIN_OUTPUT_SIZE 
        };
        const rectSimpleNode: Rect = { 
            x: simpleNode.position.x, 
            y: simpleNode.position.y, 
            width: simpleNode.width ?? 0,
            height: simpleNode.height ?? 0
        };
        
        const isOutputInteresecting = isNodeIntersecting(rectOutputNode, rectSimpleNode);

        if (isOutputInteresecting) {
            // retrive the parent node
            if (simpleNode.parentNode === undefined) {
                console.log("Parent cell not found. Intersection may still exist.");
                return undefined;
            }
            const parentNode: string = simpleNode.parentNode;
            const groupNode = getNode(parentNode);
            if (!groupNode) {
                console.log("Parent cell not found. Intersection may still exist.");
                return undefined;
            }
            // establish the max distance
            let maxDistanceX: number;
            let maxDistanceY: number;
            if (groupNode.width !== null && groupNode.width !== undefined 
                && groupNode.height !== null && groupNode.height !== undefined) {
                maxDistanceX = groupNode.width;
                maxDistanceY = groupNode.height;
            } else {
                // default value if is null or undefined
                maxDistanceX = groupNode.width ?? 0;
                maxDistanceY = groupNode.height ?? 0;
                console.log("Parent cell width or height is null or undefined. Intersection may still exist."); 
            }

            let adjusted = false;
            let distanceX = 0;
            let distanceY = 0;
            const directions = [
                { dx: 1, dy: 0 }, // Right
                { dx: 0, dy: 1 }, // Down
                { dx: -1, dy: 0 }, // Left
                { dx: 0, dy: -1 } // Up
            ];
            let currentDirectionIndex = 0;
            
            while (!adjusted && (distanceX < maxDistanceX || distanceY < maxDistanceY)) {
                const direction = directions[currentDirectionIndex];
                let newPosX = simpleNode.position.x + direction.dx * (direction.dx !== 0 ? distanceX : 0);
                let newPosY = simpleNode.position.y + direction.dy * (direction.dy !== 0 ? distanceY : 0);
            
                // Ensure newPosX and newPosY are within the boundaries
                newPosX = Math.max(0, Math.min(newPosX, maxDistanceX - MIN_OUTPUT_SIZE));
                newPosY = Math.max(0, Math.min(newPosY, maxDistanceY - MIN_OUTPUT_SIZE));
                outputNode.position = { x: newPosX, y: newPosY };
            
                const rectOutputNode = { x: 
                    outputNode.position.x, y: 
                    outputNode.position.y, 
                    width: MIN_OUTPUT_SIZE, 
                    height: MIN_OUTPUT_SIZE 
                };
                adjusted = !isNodeIntersecting(rectOutputNode, rectSimpleNode);
            
                currentDirectionIndex = (currentDirectionIndex + 1) % directions.length;
                if (currentDirectionIndex === 0) { // Completed a cycle around the directions
                    distanceX += (directions[0].dx !== 0) ? 10 : 0; // Increment distanceX if moving horizontally
                    distanceY += (directions[1].dy !== 0) ? 10 : 0; // Increment distanceY if moving vertically
                }
            }
            
            if (distanceX >= maxDistanceX || distanceY >= maxDistanceY) {
                console.warn("Maximum adjustment distance reached. Intersection may still exist.");
            }

            // return the adjusted node
            return outputNode;
        }
    }, [getNode, isNodeIntersecting]);

    return insertOutput;
}

export default useInsertOutput;