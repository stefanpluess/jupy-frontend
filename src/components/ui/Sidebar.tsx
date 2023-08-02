import { DragEvent } from 'react';

const onDragStart = (event: DragEvent, nodeType: string) => {
  event.dataTransfer.setData('application/reactflow', nodeType);
  event.dataTransfer.effectAllowed = 'move';
};

const Sidebar = () => {
  return (
    <aside>
      <div className="react-flow__node-node" onDragStart={(event: DragEvent) => onDragStart(event, 'node')} draggable>
        <div className="label">Code</div>
      </div>
      <div className="react-flow__node-mdNode" onDragStart={(event: DragEvent) => onDragStart(event, 'mdNode')} draggable>
        <div className="label">Markdown</div>
      </div>
      <div className="react-flow__node-group" onDragStart={(event: DragEvent) => onDragStart(event, 'group')} draggable>
        <div className="label">Bubble</div>
      </div>
    </aside>
  );
};

export default Sidebar;
