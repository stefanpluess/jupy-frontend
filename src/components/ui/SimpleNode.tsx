import React, {
  ChangeEvent,
  useState,
  useEffect,
  useCallback,
  memo,
  useRef,
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
  faCross,
  faCrosshairs,
  faSkullCrossbones,
  faXmarkCircle,
  faLockOpen,
} from "@fortawesome/free-solid-svg-icons";
import { v4 as uuidv4 } from "uuid";
import MonacoEditor from '@uiw/react-monacoeditor';
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

  const textareaValue = useRef(data?.code || "");
  const [executionCount, setExecutionCount] = useState(
    data?.executionCount || 0
  );

  const outputType = getNode(id + "_output")?.data.outputType;
  const [isHovered, setIsHovered] = useState(false);

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

  const handleEditorChange = (value: string, event: any) => {
    textareaValue.current = value;
    data.code = value;
  };

  const runCode = useCallback(() => {
    console.log("run code (" + textareaValue.current + ")!");
    var msg_id = uuidv4();
    setCellIdToMsgId({ [msg_id]: id });
    setExecutionCount("*");
    const ws = parent?.data.ws;
    const message = generateMessage(msg_id, textareaValue.current);
    if (ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify(message));
    } else {
      console.log("websocket is not connected");
    }
  }, [parent, textareaValue]);

  const deleteCode = () => {
    if (textareaValue.current === "") return;
    const confirmed = window.confirm(
      "Are you sure you want clear the cell content?"
    );
    if (confirmed) textareaValue.current = "";
  };

  const copyCode = () => {
    var copyText = textareaValue.current;
    navigator.clipboard.writeText(copyText);
    alert("Copied Code:\n" + textareaValue.current);
    console.log("Copied code:\n" + textareaValue.current);
  };

  const duplicateCell = () => {
    //TODO: duplicateCell creates a new SimpleNode and corresponding OutputNode with a new id but the same content
  };

  // INFO :: lock functionality
  const [transitioning, setTransitioning] = useState(false);
  const toggleLock = useNodesStore((state) => state.toggleLock);
  const isLocked = useNodesStore((state) => state.locks[id]);
  const runLockUnlock = () => {
    // console.log("run lock/unlock!");
    setTransitioning(true);
    toggleLock(id);
    setTimeout(() => {
      setTransitioning(false);
    }, 300);
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
          <button title="Additonal cell settings">
            <FontAwesomeIcon className="icon" icon={faEllipsisVertical} />
          </button>
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
          <MonacoEditor
            className="textareaNode nodrag"
            language="python"
            value={textareaValue.current}
            height="150px"
            width="250px"
            onChange={handleEditorChange}
            onKeyDown={(e) => {
              if (e.ctrlKey && e.code === "Enter") {
                e.preventDefault();
                runCode();
              }
            }}
            style={{textAlign: "left"}}
            options={{
              padding: { top: 4, bottom: 4 },
              theme: 'vs-dark', 
              selectOnLineNumbers: true,
              roundedSelection: false,
              // cursorStyle: 'line',
              lineNumbersMinChars: 3,
              lineNumbers: "on",
              folding: false,
              scrollBeyondLastLine: false,
              scrollBeyondLastColumn: 0,
              fontSize: 10,
              wordWrap: 'off',
              // wrappingIndent: 'none',
              minimap: { enabled: false },
              renderLineHighlightOnlyWhenFocus: true,
              scrollbar: { 
                vertical: 'auto', 
                horizontal: 'auto',
                verticalScrollbarSize: 8,
                horizontalScrollbarSize: 6,
              },
            }}
          />
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
          {outputType !== "error" ? (
            <button
              title="Run Code"
              className="rinputCentered playButton rcentral"
              onClick={runCode}
              disabled={!hasParent}
            >
              <FontAwesomeIcon className="icon" icon={faPlayCircle} />
            </button>
          ) : (
            <div>
              {!isHovered ? (
                <button
                  title="Error: Fix your Code and then let's try it again mate"
                  className="rinputCentered playButton rcentral"
                  onClick={runCode}
                  disabled={!hasParent || isHovered}
                  onMouseEnter={() => setIsHovered(false)}
                  onMouseLeave={() => setIsHovered(true)}
                >
                  <FontAwesomeIcon className="icon" icon={faCirclePlay} />
                  {/*<FontAwesomeIcon className="icon" icon={faSkullCrossbones} />*/}
                </button>
              ) : (
                <button
                  title="Error: Fix your Code and then let's try it again mate"
                  className="rinputCentered playErrorButton rcentral"
                  onClick={runCode}
                  disabled={!hasParent || !isHovered}
                  onMouseEnter={() => setIsHovered(false)}
                >
                  <FontAwesomeIcon className="icon" icon={faXmarkCircle} />
                  {/*<FontAwesomeIcon className="icon" icon={faSkullCrossbones} />*/}
                </button>
              )}
            </div>
          )}

          <div className="rinputCentered cellButton rbottom">
            [{executionCount != null ? executionCount : " "}]
          </div>
          {/* INFO :: lock button */}
            <button
              title="Lock Edge"
              className="rinputCentered cellButton rtop"
              onClick={runLockUnlock}
            >
            <div className={transitioning ? "lock-icon-transition" : ""}>
              {isLocked ? (
                <FontAwesomeIcon
                  className={`lock-icon ${isLocked && !transitioning ? "lock-icon-visible" : ""}`}
                  icon={faLock}
                />
              ) : (
                <FontAwesomeIcon
                  className={`lock-icon ${!isLocked && !transitioning ? "lock-icon-visible" : ""}`}
                  icon={faLockOpen}
                />
              )}
            </div>
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
