import React, {
  ChangeEvent,
  useState,
  useEffect,
  useCallback,
  memo,
} from "react";
import {
  Handle,
  Position,
  NodeToolbar,
  NodeProps,
  useStore,
  useReactFlow,
} from "reactflow";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
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
  faLockOpen,
} from "@fortawesome/free-solid-svg-icons";
import { v4 as uuidv4 } from "uuid";
import CodeEditor from "@uiw/react-textarea-code-editor";
import useAddComment from "../../helpers/hooks/useAddComment";
import useDetachNodes from "../../helpers/hooks/useDetachNodes";
import { useWebSocketStore } from "../../helpers/websocket";
import CommentNode from "./CommentNode";
import { generateMessage, getConnectedNodeId } from "../../helpers/utils";
import useNodesStore from "../../helpers/nodesStore";

function SimpleNode({ id, data }: NodeProps) {
  const { deleteElements, getNode } = useReactFlow();
  const hasParent = useStore(
    (store) => !!store.nodeInternals.get(id)?.parentNode
  );
  const parentNode = useStore(
    (store) => store.nodeInternals.get(id)?.parentNode
  );
  const parent = getNode(parentNode!);
  const setCellIdToMsgId = useWebSocketStore((state) => state.setCellIdToMsgId);
  const detachNodes = useDetachNodes();

  const [textareaValue, setTextareaValue] = useState(data?.code || "");
  const [executionCount, setExecutionCount] = useState(
    data?.executionCount || 0
  );

  //to be deleted of code above works
  // const [textareaValue, setTextareaValue] = useState("");
  // var execute = data?.execute;
  // const [executionCount, setExecutionCount] = useState(
  //   data?.executionCount || 0
  // );

  useEffect(() => {
    // console.log(id + " ----- Execution Count Changed ----- now: " + data?.executionCount)
    setExecutionCount(data?.executionCount);
  }, [data?.executionCount]);

  // when deleting the node, automatically delete the output node as well
  const onDelete = () =>
    deleteElements({ nodes: [{ id }, { id: id + "_output" }] });
  const onDetach = () => {
    if (isLocked) {
      // if locked then detach the SimpleNode and the OutputNode
      const outputNodeId = getConnectedNodeId(id);
      console.log("run detach for " + id + " and " + outputNodeId + "!");
      detachNodes([id, outputNodeId]);
    }else{
      // if unlocked then detach just the SimpleNode
      console.log("run detach for " + id + "!");
      detachNodes([id]);
    }
  };

  /*AddComments*/
  const addComments = useAddComment();
  const [textComment, setTextComment] = useState("");
  const onAddComment = () => addComments([id], textComment);

  /*const [isCommentVisible, setIsCommentVisible] = useState(false);*/
  /*const onAddComment = () => setIsCommentVisible(true);*/
  const [showCommentNode, setShowCommentNode] = useState(false);

  const onCloseCommentNode = () => {
    setShowCommentNode(false);
  };

  const onSaveComment = (comment: string) => {
    // Call the addComments function to add the comment to the SimpleNode
    addComments([id], comment);
  };

  const handleCommentChange = (event: ChangeEvent<HTMLTextAreaElement>) => {
    setTextComment(event.target.value);
  };

  const handleTextareaChange = (event: ChangeEvent<HTMLTextAreaElement>) => {
    // including auto indent
    setTextareaValue(event.target.value.replace(/\t/g, "    "));
    data.code = event.target.value.replace(/\t/g, "    ");
  };

  const runCode = useCallback(() => {
    console.log("run code (" + textareaValue + ")!");
    var msg_id = uuidv4();
    setCellIdToMsgId({ [msg_id]: id });
    setExecutionCount("*");
    const ws = parent?.data.ws;
    const message = generateMessage(msg_id, textareaValue);
    if (ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify(message));
    } else {
      console.log("websocket is not connected");
    }
  }, [parent, textareaValue]);

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

  const duplicateCell = () => {
    //TODO: duplicateCell creates a new SimpleNode and corresponding OutputNode with a new id but the same content
  };

  // INFO :: lock functionality
  const toggleLock = useNodesStore((state) => state.toggleLock);
  const isLocked = useNodesStore((state) => state.locks[id]);
  const runLockUnlock = () => {
    // console.log("run lock/unlock!");
    toggleLock(id);
  };

  /**
   @todo: 
   add onClick to duplicate cell, 
   add comment to cell, 
   add onClick to addtional cell settings,
   add onClick to lock edge**/

  return (
    <>
      <NodeToolbar className="nodrag">
        <div>
          <button onClick={duplicateCell} title="Duplicate Cell">
            <FontAwesomeIcon className="icon" icon={faCopy} />
          </button>

          <button onClick={onDelete} title="Delete Cell">
            <FontAwesomeIcon className="icon" icon={faTrashAlt} />
          </button>

          <button
            title="Add Comment to Cell"
            onClick={onAddComment}
            value="textComment"
          >
            <FontAwesomeIcon className="icon" icon={faCommentAlt} />
          </button>

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

      <div
        className={
          executionCount === "*"
            ? "simpleNodewrapper gradient"
            : "simpleNodewrapper"
        }
      >
        <div className="inner">
          <CodeEditor
            className="textareaNode nodrag"
            value={textareaValue}
            language="python"
            placeholder="Please enter your Python code here"
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
                runCode();
              }
            }}
          ></CodeEditor>
        </div>
      </div>

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
          {/* INFO :: lock button */}
            <button
              title="Lock Edge"
              className="rinputCentered cellButton rtop"
              onClick={runLockUnlock}
            >
            {isLocked ? (
              <FontAwesomeIcon className="icon" icon={faLock} />
            ) : (
              <FontAwesomeIcon className="icon" icon={faLockOpen} />
            )}
          </button>
        </div>
      </Handle>

      {/*to be deleted of code above works*/}

      {/* {isCommentVisible && (
            <CommentField
              onClose={() => setIsCommentVisible(false)}
              onSubmit={(comment) => {
                console.log("Submitted Comment:", comment);
                // Handle submitting the comment as required.
                // You can use this comment in your application logic.
              }}
            />
          )} */}
      <Handle type="target" position={Position.Left} />

      {/* CommentNode may be deleted if we dont use it*/}
      {/*showCommentNode && (
        <CommentNode
          nodeId={id}
          onClose={onCloseCommentNode}
          onSaveComment={onSaveComment}
        />
      )*/}
    </>
  );
}

export default memo(SimpleNode);
