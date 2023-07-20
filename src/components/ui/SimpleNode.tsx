import React, { ChangeEvent, useState, useEffect, useCallback } from "react";
import { memo } from "react";
import {
  Handle,
  Position,
  NodeToolbar,
  NodeProps,
  useStore,
  useReactFlow,
} from "reactflow";
import useDetachNodes from "../../helpers/useDetachNodes";
import {
  faTrash,
  faPlay,
  faCopy,
  faCommentAlt,
  faTrashAlt,
  faObjectUngroup,
  faEllipsisVertical,
  faDeleteLeft,
  faRemove,
  faRemoveFormat,
  faRub,
  faPlayCircle,
  faCirclePlay,
  faLock,
} from "@fortawesome/free-solid-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { v4 as uuidv4 } from "uuid";
import CodeEditor from "@uiw/react-textarea-code-editor";
import useAddComment from "../../helpers/useAddComment";

/*must be shifted*/
interface CommentFieldProps {
  onClose: () => void;
  onSubmit: (comment: string) => void;
}

/*must be shifted*/
function CommentField({ onClose, onSubmit }: CommentFieldProps) {
  const [comment, setComment] = useState("");

  const handleSubmit = () => {
    onSubmit(comment);
    setComment("");
    onClose();
  };

  const handleCommentChange = (event: ChangeEvent<HTMLTextAreaElement>) => {
    setComment(event.target.value);
  };

  return (
    <div className="comment-field">
      <textarea
        value={comment}
        onChange={handleCommentChange}
        placeholder="Enter your comment here..."
      />
      <div className="comment-buttons">
        <button onClick={onClose}>Cancel</button>
        <button onClick={handleSubmit}>Submit</button>
      </div>
    </div>
  );
}

function SimpleNode({ id, data }: NodeProps) {
  const hasParent = useStore(
    (store) => !!store.nodeInternals.get(id)?.parentNode
  );
  const parentNode = useStore(
    (store) => store.nodeInternals.get(id)?.parentNode
  );
  const { deleteElements } = useReactFlow();
  const detachNodes = useDetachNodes();
  /*const addComments = useAddComment();*/

  const [textareaValue, setTextareaValue] = useState("");
  var execute = data?.execute;
  const [executionCount, setExecutionCount] = useState(
    data?.executionCount || 0
  );

  useEffect(() => {
    // console.log(id + " ----- Execution Count Changed ----- now: " + data?.executionCount)
    setExecutionCount(data?.executionCount);
  }, [data?.executionCount]);

  useEffect(() => {
    // console.log(id + " ----- Execute Changed -----")
    execute = data?.execute;
  }, [data?.execute]);

  // when deleting the node, automatically delete the output node as well
  const onDelete = () =>
    deleteElements({ nodes: [{ id }, { id: id + "_output" }] });
  const onDetach = () => detachNodes([id]);

  /*AddComments*/
  /*const onAddComment = () => addComments([id]);*/
  const [isCommentVisible, setIsCommentVisible] = useState(false);
  const onAddComment = () => setIsCommentVisible(true);

  const handleTextareaChange = (event: ChangeEvent<HTMLTextAreaElement>) => {
    // including auto indent
    setTextareaValue(event.target.value.replace(/\t/g, "    "));
  };

  const runCode = () => {
    console.log("run code (" + textareaValue + ")!");
    var msg_id = uuidv4();
    setExecutionCount("*");
    execute(parentNode, textareaValue, msg_id, id);
  };

  const deleteCode = () => {
    if (textareaValue === "") return;
    const confirmed = window.confirm(
      "Are you sure you want clear the cell content?"
    );
    if (confirmed) setTextareaValue("");
  };

  const copyCode = () => {
    var copyText = textareaValue;
    navigator.clipboard.writeText(copyText);
    alert("Copied Code:\n" + textareaValue);
    console.log("Copied code:\n" + textareaValue);
  };

  /**
   @todo: 
   add onClick to copy cell, 
   add comment to cell, 
   add onClick to addtional cell settings,
   add onClick to lock edge**/

  return (
    <>
      <NodeToolbar className="nodrag">
        <div>
          {hasParent && (
            <button title="Duplicate Cell">
              <FontAwesomeIcon className="icon" icon={faCopy} />
            </button>
          )}
          {hasParent && (
            <button onClick={onDelete} title="Delete Cell">
              <FontAwesomeIcon className="icon" icon={faTrashAlt} />
            </button>
          )}
          {hasParent && (
            <button title="Add Comment to Cell" onClick={onAddComment}>
              <FontAwesomeIcon className="icon" icon={faCommentAlt} />
            </button>
          )}
          {hasParent && (
            <button title="Ungroup CodeCell from BubbleCell" onClick={onDetach}>
              <FontAwesomeIcon className="icon" icon={faObjectUngroup} />
            </button>
          )}
          {hasParent && (
            <button title="Additonal cell settings">
              <FontAwesomeIcon className="icon" icon={faEllipsisVertical} />
            </button>
          )}
        </div>
      </NodeToolbar>

      <CodeEditor
        className="textareaNode"
        value={textareaValue}
        language="python"
        placeholder="Please enter your Python code here"
        onChange={handleTextareaChange}
        padding={2}
        style={{
          flexGrow: "1",
          fontFamily:
            "ui-monospace,SFMono-Regular,SF Mono,Consolas,Liberation Mono,Menlo,monospace",
        }}
        onKeyDown={(e) => {
          if (e.ctrlKey && e.code === "Enter") {
            e.preventDefault(); // TODO: doesn't work somehow
            runCode();
          }
        }}
      ></CodeEditor>

      <div className="inputCentered buttonArea nodrag">
        <button
          className="inputCentered cellButton bLeft"
          title="Delete Code in Cell"
          onClick={deleteCode}
        >
          <FontAwesomeIcon className="icon" icon={faDeleteLeft} />
        </button>
        <button
          title="Copy Text from Cell"
          className="inputCentered cellButton bRight"
          onClick={copyCode}
        >
          <FontAwesomeIcon className="icon" icon={faCopy} />
        </button>
      </div>
      <Handle type="source" position={Position.Right}>
        <div>
          <button
            title="Run CodeCell"
            className="rinputCentered playButton rcentral"
            onClick={runCode}
            disabled={!hasParent}
          >
            <FontAwesomeIcon className="icon" icon={faPlayCircle} />
          </button>
          <div className="rinputCentered cellButton rbottom">
            [{executionCount != null ? executionCount : " "}]
          </div>
          <button
            title="Lock Edge"
            className="rinputCentered cellButton rtop"
            /*onClick={}*/
          >
            <FontAwesomeIcon className="icon" icon={faLock} />
          </button>
        </div>
      </Handle>

      {isCommentVisible && (
        <CommentField
          onClose={() => setIsCommentVisible(false)}
          onSubmit={(comment) => {
            console.log("Submitted Comment:", comment);
            // Handle submitting the comment as required.
            // You can use this comment in your application logic.
          }}
        />
      )}
    </>
  );
}

export default memo(SimpleNode);
