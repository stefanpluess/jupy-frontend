import React, { useState, useEffect } from 'react'
import { memo } from 'react';
import { Handle, Position, NodeToolbar, NodeProps, useStore, useReactFlow } from 'reactflow';
import useDetachNodes from '../../helpers/useDetachNodes';

function SimpleOutputNode({ id, data }: NodeProps) {
  const hasParent = useStore((store) => !!store.nodeInternals.get(id)?.parentNode);
  const parentNode = useStore((store) => store.nodeInternals.get(id)?.parentNode);
  const { deleteElements } = useReactFlow();
  const detachNodes = useDetachNodes();

  const [output, setOutput] = useState(data?.output || "");

  useEffect(() => {
    // console.log(id+ " ----- Output Changed ----- now: " + data?.output)
    setOutput(data?.output);
  }, [data?.output]);

  const onDelete = () => deleteElements({ nodes: [{ id }] });
  const onDetach = () => detachNodes([id]);

  return (
    <><>
      <NodeToolbar className="nodrag">
        <button onClick={onDelete}>Delete</button>
        {hasParent && <button onClick={onDetach}>Detach</button>}
      </NodeToolbar>
      <div className="outputNode">{output}</div>
      <Handle type="target" position={Position.Left} />
    </>
  </>);
}

export default memo(SimpleOutputNode);
