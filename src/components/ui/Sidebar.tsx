import React, { DragEvent } from 'react';

const onDragStart = (event: DragEvent, nodeType: string) => {
  event.dataTransfer.setData('application/reactflow', nodeType);
  event.dataTransfer.effectAllowed = 'move';
};

const Sidebar = () => {
  return (
    <aside>
      <div className="react-flow__node-node" onDragStart={(event: DragEvent) => onDragStart(event, 'node')} draggable>
        <div className="label">Cell</div>
      </div>
      <div className="react-flow__node-group" onDragStart={(event: DragEvent) => onDragStart(event, 'group')} draggable>
        <div className="label">Bubble</div>
      </div>
    </aside>
  );
};

export default Sidebar;
