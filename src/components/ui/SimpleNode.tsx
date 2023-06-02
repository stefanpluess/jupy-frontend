import React, { ChangeEvent, useState } from 'react'
import { memo } from 'react';
import { Handle, Position, NodeToolbar, NodeProps, useStore, useReactFlow } from 'reactflow';
import useDetachNodes from '../../helpers/useDetachNodes';
import { faTrash, faPlay } from '@fortawesome/free-solid-svg-icons';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { Button } from 'react-bootstrap';

function SimpleNode({ id, data }: NodeProps) {
  const hasParent = useStore((store) => !!store.nodeInternals.get(id)?.parentNode);
  const { deleteElements } = useReactFlow();
  const detachNodes = useDetachNodes();

  const onDelete = () => deleteElements({ nodes: [{ id }] });
  const onDetach = () => detachNodes([id]);

  const [textareaValue, setTextareaValue] = useState(data?.label || '');

  const handleTextareaChange = (event: ChangeEvent<HTMLTextAreaElement>) => {
    setTextareaValue(event.target.value);
  };

  const runCode = () => {
    console.log('run code ('+textareaValue+')!');
  }

  return (
    <>
      <NodeToolbar className="nodrag">
        <button onClick={onDelete}>Delete</button>
        {hasParent && <button onClick={onDetach}>Detach</button>}
      </NodeToolbar>
      <textarea className="inputCentered textareaNode nodrag" value={textareaValue} onChange={handleTextareaChange}></textarea>
      <div className="inputCentered buttonArea">
          <button className="playButton" onClick={runCode}>
              <FontAwesomeIcon className="playIcon" icon={faPlay} />
          </button>
      </div>
      <Handle type="source" position={Position.Right} />
    </>
  );
}

export default memo(SimpleNode);
