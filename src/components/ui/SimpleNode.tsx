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
  NodeResizer,
} from "reactflow";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faCopy,
  faCommentAlt,
  faTrashAlt,
  faObjectUngroup,
  faEllipsisVertical,
  faDeleteLeft,
  faPlayCircle,
  faCirclePlay,
  faLock,
  faXmarkCircle,
  faLockOpen,
  faStopCircle,
} from "@fortawesome/free-solid-svg-icons";
import MonacoEditor from "@uiw/react-monacoeditor";
import useAddComment from "../../helpers/hooks/useAddComment";
import { useDetachNodes, useDeleteOutput } from "../../helpers/hooks";
import CommentNode from "./CommentNode";
import { getConnectedNodeId } from "../../helpers/utils";
import useNodesStore from "../../helpers/nodesStore";
import useDuplicateCell from "../../helpers/hooks/useDuplicateCell";
import { OutputNodeData } from "../../config/types";
import { useWebSocketStore } from "../../helpers/websocket";
import { onInterrupt } from "../../helpers/websocket/websocketUtils";
import {
  KERNEL_IDLE,
  KERNEL_INTERRUPTED
} from "../../config/constants";

const handleStyle = { height: 4, width: 4 };

function SimpleNode({ id, data }: NodeProps) {
  const { deleteElements, getNode } = useReactFlow();
  const hasParent = useStore(
    (store) => !!store.nodeInternals.get(id)?.parentNode
  );
  const parentNode = useStore(
    (store) => store.nodeInternals.get(id)?.parentNode
  );
  const parent = getNode(parentNode!);
  const detachNodes = useDetachNodes();
  const deleteOutput = useDeleteOutput();
  const [executionCount, setExecutionCount] = useState(data?.executionCount || 0);
  const outputs = getNode(id + "_output")?.data.outputs;
  const [isHovered, setIsHovered] = useState(false);
  const initialRender = useRef(true);
  const token = useWebSocketStore((state) => state.token);

  const hasError = useCallback(() => {
    if (!outputs) return false;
    return outputs.some((output: OutputNodeData) => output.outputType === "error");
  }, [outputs]);

  // INFO :: queue 🚶‍♂️🚶‍♀️🚶‍♂️functionality
  const addToQueue = useNodesStore((state) => state.addToQueue);
  const removeFromQueue = useNodesStore((state) => state.removeFromQueue);
  const setExecutionStateForGroupNode = useNodesStore((state) => state.setExecutionStateForGroupNode);

  useEffect(() => {
    // console.log(id + " ----- Execution Count Changed ----- now: " + data?.executionCount)
    setExecutionCount(data?.executionCount);
    // INFO :: queue 🚶‍♂️🚶‍♀️🚶‍♂️functionality 
    if(hasParent){
      const groupId = parent!.id;
      setExecutionStateForGroupNode(groupId, {nodeId: id, state: KERNEL_IDLE});
      removeFromQueue(groupId);
    }
  }, [data?.executionCount]);

  // INFO :: 🟢 RUN CODE
  const runCode = useCallback(async () => {
    if (data.code.trim() === "") return;
    if(parent){
      const groupId = parent.id;
      setExecutionCount("*");
      deleteOutput(id + "_output");
      addToQueue(groupId, id, data.code); // INFO :: queue 🚶‍♂️🚶‍♀️🚶‍♂️functionality
    }
  }, [parent, data.code, addToQueue]);

  // INFO :: 🛑INTERRUPT KERNEL
  const clearQueue = useNodesStore((state) => state.clearQueue);
  const getExecutionStateForGroupNode = useNodesStore((state) => state.getExecutionStateForGroupNode);
  const interruptKernel = useCallback(() => {
    if(parent){
      onInterrupt(token, parent.data.session.kernel.id);
      // OPTIMIZE - should it behave differently for group node and simple node?
      clearQueue(parent.id);
      // always put the node that is currently at the top of the queue
      const nodeRunning = getExecutionStateForGroupNode(parent.id).nodeId;
      setExecutionStateForGroupNode(parent.id, {nodeId: nodeRunning, state: KERNEL_INTERRUPTED});
    } else{
      console.warn("interruptKernel: parent is undefined");
    }
  }, [parentNode]);

  const groupNodesExecutionStates = useNodesStore((state) => state.groupNodesExecutionStates);
  const parentExecutionState = parentNode
    ? (groupNodesExecutionStates[parentNode])
    : undefined;
  useEffect(() => {
    if (parentExecutionState && parentExecutionState.state === KERNEL_INTERRUPTED && parentExecutionState.nodeId !== id){
      // update the nodes that were in the queue and some other one interrupted
      setExecutionCount(data?.executionCount);
    }
    // TODO - start here the counting of the execution time
  }, [parentExecutionState]); 

  // INFO :: 🗑️DELETE CELL
  // when deleting the node, automatically delete the output node as well
  const onDelete = () =>
    deleteElements({ nodes: [{ id }, { id: id + "_output" }] });

  const onDetach = () => {
    if (isLocked) {
      // if locked then detach the SimpleNode and the OutputNode
      const outputNodeId = getConnectedNodeId(id);
      console.log("run detach for " + id + " and " + outputNodeId + "!");
      detachNodes([id, outputNodeId]);
    } else {
      // if unlocked then detach just the SimpleNode
      console.log("run detach for " + id + "!");
      detachNodes([id]);
    }
  };

  /*AddComments*/
  const addComments = useAddComment();
  const [textComment, setTextComment] = useState("");
  const onAddComment = () =>
    alert(
      "This feature is currently still under construction. We will let you know when it is ready to use! "
    );
  addComments([id], textComment);
  /*
  const [isCommentVisible, setIsCommentVisible] = useState(false);
  const onAddComment = () => setIsCommentVisible(true);
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
  */

  const handleEditorChange = useCallback(
    (value: string, event: any) => {
      if (initialRender.current) {
        initialRender.current = false;
        return;
      }
      // fetch the node using the store and update the code (needed for the editor to work)
      const node = getNode(id);
      node!.data.code = value;
      data.code = value;
    },
    [data, data.code]
  );

  // BUG: with the new editor, deleting is not always shown
  const deleteCode = useCallback(() => {
    if (data.code === "") return;
    const confirmed = window.confirm(
      "Are you sure you want clear the cell content?"
    );
    if (confirmed) {
      const node = getNode(id);
      data.code = "";
      node!.data.code = "";
    }
  }, [data, data.code]);

  const copyCode = () => {
    let copyText = data.code;
    navigator.clipboard.writeText(copyText);
    alert("Copied Code:\n" + data.code);
    console.log("Copied code:\n" + data.code);
  };

  const onAdditionalSettings = () => {
    let text =
      "This feature is currently still under construction. We will let you know when it is ready to use!";
    alert(text);
    console.log(text);
  };

  // INFO :: DUPLICATE CELL
  const handleDuplicateCell = useDuplicateCell(id);
  const duplicateCell = () => {
    handleDuplicateCell();
  };

  // INFO :: 🔒lock functionality
  const [transitioning, setTransitioning] = useState(false);
  const toggleLock = useNodesStore((state) => state.toggleLock);
  const isLocked = useNodesStore((state) => state.locks[id]);
  const runLockUnlock = () => {
    setTransitioning(true);
    toggleLock(id);
    setTimeout(() => {
      setTransitioning(false);
    }, 300);
  };

  return (
    <>
      <NodeResizer
        lineStyle={{ borderColor: "transparent" }}
        handleStyle={handleStyle}
        minWidth={200}
        minHeight={85}
      />
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
          <button
            title="Additonal cell settings"
            onClick={onAdditionalSettings}
          >
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
            key={data}
            className="textareaNode nodrag"
            language="python"
            value={data.code}
            onChange={handleEditorChange}
            onKeyDown={(e) => {
              // check if ctrl or shift + enter is pressed
              if ((e.ctrlKey || e.shiftKey) && e.code === "Enter") {
                e.preventDefault();
                runCode();
              }
            }}
            style={{textAlign: "left"}}
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
              wordWrap: "on",
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
          {/* INFO :: ▶️ run button */}
          {!hasError() ? (
            <div>
              {(executionCount !== "*") ? (
                // allowing to run code only if there is no error & we are not running the code
                <button
                title="Run Code"
                className="rinputCentered playButton rcentral"
                onClick={runCode}
                disabled={!hasParent}
                >
                  <FontAwesomeIcon className="icon" icon={faPlayCircle} />
                </button>
              ) : (
                // when we are running the code allow to interrupt kernel
                <button
                title="Interrupt Kernel ⛔"
                className="rinputCentered playInterruptButton rcentral"
                onClick={interruptKernel}
                disabled={!hasParent || (parentExecutionState && parentExecutionState.state === KERNEL_INTERRUPTED)}
                >
                  <FontAwesomeIcon className="icon" icon={faStopCircle} />
                </button>
              )}
            </div>
          ) : (
            // handling run button when there is an error
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
                </button>
              )}
            </div>
          )}
          {/* INFO :: 🔢 execution count */}
          <div className="rinputCentered cellButton rbottom">
            [{executionCount != null ? executionCount : "0"}]
          </div>
          {/* INFO :: lock button */}
          <button
            title={isLocked ? "Unlock edge 🔓" : "Lock edge 🔒"}
            className="rinputCentered cellButton rtop"
            onClick={runLockUnlock}
          >
            <div className={transitioning ? "lock-icon-transition" : ""}>
              {isLocked ? (
                <FontAwesomeIcon
                  className={`lock-icon ${
                    isLocked && !transitioning ? "lock-icon-visible" : ""
                  }`}
                  icon={faLock}
                />
              ) : (
                <FontAwesomeIcon
                  className={`lock-icon ${
                    !isLocked && !transitioning ? "lock-icon-visible" : ""
                  }`}
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
