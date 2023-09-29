import { MarkerType} from 'reactflow';
import { DragEvent } from 'react';

// COMMENT - Configuration elements for ReactFlow used in Home component
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

// COMMENT - Configuration elements for GroupNode used in Home component
export const lineStyle = { borderColor: "white" };
export const handleStyle = { height: 8, width: 8 };
export const initialModalStates = {
  showConfirmModalRestart: false,
  showConfirmModalShutdown: false,
  showConfirmModalDelete: false,
  showConfirmModalDetach: false,
  showConfirmModalReconnect: false,
  showConfirmModalRunAll: false,
};