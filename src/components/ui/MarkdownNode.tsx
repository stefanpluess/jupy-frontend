import { useState, useCallback } from "react";
import { memo } from "react";
import {
  NodeToolbar,
  NodeProps,
  useStore,
  useReactFlow,
  Handle,
  Position,
  NodeResizer,
} from "reactflow";
import {
  faCopy,
  faObjectUngroup,
  faPlayCircle,
  faTrashAlt,
} from "@fortawesome/free-solid-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { useDetachNodes } from "../../helpers/hooks";
import MonacoEditor from "@uiw/react-monacoeditor";
import ReactMarkdown from "react-markdown";

function MarkdownNode({ id, data }: NodeProps) {
  const handleStyle = { height: 6, width: 6 };
  const hasParent = useStore(
    (store) => !!store.nodeInternals.get(id)?.parentNode
  );
  const { deleteElements } = useReactFlow();
  const detachNodes = useDetachNodes();
  const [editMode, setEditMode] = useState(data?.editMode || false);

  const onDelete = () => deleteElements({ nodes: [{ id }] });
  const onDetach = () => detachNodes([id]);

  const handleEditorChange = useCallback(
    (value: string, event: any) => {
      data.code = value;
    },
    [data, data.code]
  );

  const createMarkdown = () => setEditMode(false);
  // const deleteCode = () => (data.code = "");
  const copyCode = () => navigator.clipboard.writeText(data.code);

  const toolbar = (
    <NodeToolbar className="nodrag">
      <button onClick={onDelete} title="Delete Cell">
        <FontAwesomeIcon className="icon" icon={faTrashAlt} />
      </button>
      {hasParent && (
        <button
          title="Ungroup Markdown Cell from Bubble Cell"
          onClick={onDetach}
        >
          <FontAwesomeIcon className="icon" icon={faObjectUngroup} />
        </button>
      )}
    </NodeToolbar>
  );

  const buttons = (
    <div className="bottomCodeCellButtons">
      <button
        title="Copy Text from Cell"
        className="cellButton"
        onClick={copyCode}
      >
        <FontAwesomeIcon className="copy-icon" icon={faCopy} />
      </button>
    </div>
  );

  const nodeResizer = (
    <NodeResizer
      lineStyle={{ borderColor: "transparent" }}
      handleStyle={handleStyle}
      minWidth={200}
      minHeight={85}
    />
  );

  if (!editMode)
    return (
      <>
        {nodeResizer}
        {toolbar}
        <div className="simpleNodewrapper">
          <div className="inner">
            <div
              className="textareaNode"
              style={{ paddingLeft: "4px", height: "100%", width: "100%" }}
              onDoubleClick={() => setEditMode(true)}
            >
              <ReactMarkdown className="markdown">{data.code}</ReactMarkdown>
            </div>
            {buttons}
          </div>
        </div>
        
      </>
    );
  else
    return (
      <>
        {nodeResizer}
        {toolbar}
        <div className="simpleNodewrapper">
          <div className="inner">
            <MonacoEditor
              key={data}
              className="textareaNode nodrag"
              language="markdown"
              value={data.code}
              onChange={handleEditorChange}
              onKeyDown={(e) => {
                if ((e.ctrlKey || e.shiftKey) && e.code === "Enter") {
                  e.preventDefault();
                  createMarkdown();
                }
              }}
              style={{ textAlign: "left" }}
              // TODO - export options to config file
              options={{
                padding: { top: 3, bottom: 3 },
                theme: "vs-dark",
                selectOnLineNumbers: true,
                roundedSelection: true,
                automaticLayout: true,
                // cursorStyle: 'line',
                lineNumbersMinChars: 3,
                lineNumbers: "on",
                folding: false,
                scrollBeyondLastLine: false,
                scrollBeyondLastColumn: 0,
                fontSize: 10,
                wordWrap: "off",
                // wrappingIndent: 'none',
                minimap: { enabled: false },
                renderLineHighlightOnlyWhenFocus: true,
                scrollbar: {
                  vertical: "auto",
                  horizontal: "auto",
                  verticalScrollbarSize: 8,
                  horizontalScrollbarSize: 6,
                },
              }}
            />
            {buttons}
          </div>
        </div>
        <Handle type="source" position={Position.Right}>
          <button
            title="Run CodeCell"
            className="rinputCentered playButton rcentral"
            onClick={createMarkdown}
          >
            <FontAwesomeIcon className="icon" icon={faPlayCircle} />
          </button>
        </Handle>
      </>
    );
}

export default memo(MarkdownNode);
