import { useState, useEffect } from "react";
import { memo } from "react";
import {
  NodeToolbar,
  NodeProps,
  useStore,
  useReactFlow,
  Handle,
  Position,
} from "reactflow";
import { faCopy, faDeleteLeft, faObjectUngroup, faPlayCircle, faTrashAlt } from "@fortawesome/free-solid-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { useDetachNodes } from "../../helpers/hooks";
import CodeEditor from '@uiw/react-textarea-code-editor';
import ReactMarkdown from 'react-markdown';

function MarkdownNode({ id, data }: NodeProps) {
  const hasParent = useStore((store) => !!store.nodeInternals.get(id)?.parentNode);
  const { deleteElements } = useReactFlow();
  const detachNodes = useDetachNodes();
  const [code, setCode] = useState(data?.code || '');
  const [editMode, setEditMode] = useState(data?.editMode || false);


  const onDelete = () => deleteElements({ nodes: [{ id }] });
  const onDetach = () => detachNodes([id]);
  
  const handleTextareaChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setCode(e.target.value);
    data.code = e.target.value;
  }

  const createMarkdown = () => setEditMode(false);
  const deleteCode = () => setCode("");
  const copyCode = () => navigator.clipboard.writeText(code);

  const toolbar = (
    <NodeToolbar className="nodrag">
      <button onClick={onDelete} title="Delete Cell">
        <FontAwesomeIcon className="icon" icon={faTrashAlt} />
      </button>
      {hasParent && (
        <button title="Ungroup Markdown Cell from Bubble Cell" onClick={onDetach}>
          <FontAwesomeIcon className="icon" icon={faObjectUngroup} />
        </button>
      )}
    </NodeToolbar>
  );

  const buttons = (
    <div className="inputCentered buttonArea nodrag">
      <button className="inputCentered cellButton bLeft" title="Delete Code in Cell" onClick={deleteCode}>
        <FontAwesomeIcon className="icon" icon={faDeleteLeft} />
      </button>
      <button title="Copy Text from Cell" className="inputCentered cellButton bRight" onClick={copyCode}>
        <FontAwesomeIcon className="icon" icon={faCopy} />
      </button>
    </div>
  );

  if (!editMode) return (
    <>
      {toolbar}
      <div className="textareaNode" style={{paddingLeft: '4px'}} onDoubleClick={() => setEditMode(true)}>
        <ReactMarkdown className="markdown" >{code}</ReactMarkdown>
      </div>
      {buttons}
    </>
  );
  else return (
    <>
      {toolbar}
      <CodeEditor
        className="textareaNode nodrag"
        value={code}
        language="markdown"
        placeholder="Please enter your Markdown code here"
        onChange={handleTextareaChange}
        padding={4}
        style={{
          flexGrow: "1",
          fontFamily:
            "ui-monospace,SFMono-Regular,SF Mono,Consolas,Liberation Mono,Menlo,monospace",
        }}
        onKeyDown={(e) => {
          if (e.ctrlKey && e.code === "Enter") {
            e.preventDefault(); // TODO: doesn't work somehow
            createMarkdown();
          }
        }}
      />
      {buttons}
      <Handle type="source" position={Position.Right}>
        <button title="Run CodeCell" className="rinputCentered playButton rcentral" onClick={createMarkdown}>
          <FontAwesomeIcon className="icon" icon={faPlayCircle} />
        </button>
      </Handle>
    </>
  );
}

export default memo(MarkdownNode);
