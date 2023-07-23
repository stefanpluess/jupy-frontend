import React, { useState, useEffect } from 'react'
import { memo } from 'react';
import { Handle, Position, NodeToolbar, NodeProps, useStore, useReactFlow } from 'reactflow';
import useDetachNodes from '../../helpers/useDetachNodes';

function SimpleOutputNode({ id, data }: NodeProps) {
  const hasParent = useStore((store) => !!store.nodeInternals.get(id)?.parentNode);
  const parentNode = useStore((store) => store.nodeInternals.get(id)?.parentNode);
  const { deleteElements } = useReactFlow();
  const detachNodes = useDetachNodes();

  const [output, setOutput] = useState({ __html: '' });
  const [outputType, setOutputType] = useState(data?.outputType);

  useEffect(() => {
    // console.log(id+ " ----- Output Changed ----- now: " + data?.output)
    var formattedOutput = '';
    if (data?.isImage) {
      formattedOutput = '<img src="data:image/png;base64,' + data?.output + '">';
    } else {
      formattedOutput = data?.output.replace(/\n/g, '<br>');
    }
    const outputHtml = { __html: formattedOutput };
    setOutput(outputHtml);
  }, [data?.output]);

//   const onDelete = () => deleteElements({ nodes: [{ id }] });
  const onDetach = () => detachNodes([id]);

  return (
    <><>
      <NodeToolbar className="nodrag">
        {/* <button onClick={onDelete}>Delete</button> */}
        {hasParent && <button onClick={onDetach}>Detach</button>}
      </NodeToolbar>
      <div className="outputNode" dangerouslySetInnerHTML={output}></div>
      <Handle type="target" position={Position.Left} />
    </>
  </>);
}

export default memo(SimpleOutputNode);
