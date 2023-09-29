import { MarkerType} from 'reactflow';
import { DragEvent } from 'react';

/**
 * This file defines the configuration for ReactFlow used in Home component
 */

export const proOptions = {
    hideAttribution: true,
};
  
export const defaultEdgeOptions = {
    style: {
        strokeWidth: 1.5,
    },
    markerEnd: {
        type: MarkerType.ArrowClosed,
    },
};

export const onDragOver = (event: DragEvent) => {
    event.preventDefault();
    event.dataTransfer.dropEffect = 'move';
};