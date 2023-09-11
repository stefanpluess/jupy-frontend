import React, {
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
  faPlayCircle,
  faCirclePlay,
  faLock,
  faXmarkCircle,
  faLockOpen,
  faStopCircle,
} from "@fortawesome/free-solid-svg-icons";
import MonacoEditor from "@uiw/react-monacoeditor";
import useAddComment from "../../helpers/hooks/useAddComment";
import { useDetachNodes, useExecuteOnSuccessors, useHasBusySuccessors, useInsertOutput } from "../../helpers/hooks";
import { getConnectedNodeId } from "../../helpers/utils";
import useNodesStore from "../../helpers/nodesStore";
import useDuplicateCell from "../../helpers/hooks/useDuplicateCell";
import { OutputNodeData } from "../../config/types";
import { useWebSocketStore } from "../../helpers/websocket";
import { onInterrupt } from "../../helpers/websocket/websocketUtils";
import {
  KERNEL_BUSY,
  KERNEL_BUSY_FROM_PARENT,
  KERNEL_IDLE,
  KERNEL_INTERRUPTED,
  EXEC_CELL_NOT_YET_RUN
} from "../../config/constants";

const handleStyle = { height: 6, width: 6 };

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
  const insertOutput = useInsertOutput();
  const [executionCount, setExecutionCount] = useState(data?.executionCount.execCount || '');
  const outputs = getNode(id + "_output")?.data.outputs;
  const [isHovered, setIsHovered] = useState(false);
  const [isClicked, setIsClicked] = useState(false);

  const initialRender = useRef(true);
  const wsRunning = useNodesStore(
    (state) => state.groupNodesWsStates[parentNode!] ?? true
  );
  const token = useWebSocketStore((state) => state.token);
  const executeOnSuccessors = useExecuteOnSuccessors();

  const hasError = useCallback(() => {
    if (!outputs) return false;
    return outputs.some(
      (output: OutputNodeData) => output.outputType === "error"
    );
  }, [outputs]);

  // INFO :: 0️⃣ empty output type functionality
  const setOutputTypeEmpty = useNodesStore((state) => state.setOutputTypeEmpty);

  // INFO :: queue 🚶‍♂️🚶‍♀️🚶‍♂️functionality
  const addToQueue = useNodesStore((state) => state.addToQueue);
  const removeFromQueue = useNodesStore((state) => state.removeFromQueue);
  const setExecutionStateForGroupNode = useNodesStore(
    (state) => state.setExecutionStateForGroupNode
  );

  useEffect(() => {
    const updateExecCount = async () => {
      setExecutionCount(data?.executionCount.execCount);
      // INFO :: queue 🚶‍♂️🚶‍♀️🚶‍♂️functionality
      if (hasParent) {
        const groupId = parent!.id;
        await executeOnSuccessors(parent!.id);
        setExecutionStateForGroupNode(groupId, {nodeId: id, state: KERNEL_IDLE});
        removeFromQueue(groupId);
      }
      if (outputs && outputs.length === 0) {
        setOutputTypeEmpty(id + "_output", true); // INFO :: 0️⃣ empty output type functionality
      }
    };
    updateExecCount();
  }, [data?.executionCount]);

  // INFO :: 🟢 RUN CODE
  const runCode = useCallback(async () => {
    if (!data.code || data.code.trim() === '') return;
    if (executionCount === "") insertOutput(id); // if the execution count is "", create an output node and add an edge
    if (parent) {
      const groupId = parent.id;
      setExecutionCount("*");
      addToQueue(groupId, id, data.code); // INFO :: queue 🚶‍♂️🚶‍♀️🚶‍♂️functionality
    }
  }, [parent, data.code, addToQueue, insertOutput]);

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

  const parentExecutionState = useNodesStore((state) => state.groupNodesExecutionStates[parentNode!]); // can be undefined

  useEffect(() => {
    if (parentExecutionState && parentExecutionState.state === KERNEL_INTERRUPTED && parentExecutionState.nodeId !== id){
      // update the nodes that were in the queue and some other one interrupted
      setExecutionCount(data?.executionCount.execCount);
    }
  }, [parentExecutionState]); 

 // INFO :: 🗑️DELETE CELL
  // when deleting the node, automatically delete the output node as well
  const deleteNode = () =>
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

  const copyCode = () => {
    let copyText = data.code;
    navigator.clipboard.writeText(copyText);
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

  const predecessorExecutionState = useNodesStore((state) => state.groupNodesExecutionStates[parent?.data.predecessor]); // can be undefined
  const isInfluenced = useNodesStore((state) => state.groupNodesInfluenceStates[parent?.id!]); // can be undefined
  const hasBusySucc = useHasBusySuccessors();

  const canBeRun = useCallback(() => {
    return (
      hasParent &&
      wsRunning &&
      parentExecutionState?.state !== KERNEL_BUSY_FROM_PARENT &&
      !(predecessorExecutionState?.state === KERNEL_BUSY && isInfluenced) && // something is soon to be executed on this child -> prevent running
      !hasBusySucc(parentNode!) // something is currently executed on an influenced child -> prevent running
    );
  }, [hasParent, wsRunning, parentExecutionState, predecessorExecutionState, isInfluenced, hasBusySucc]);

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

          <button onClick={deleteNode} title="Delete Cell">
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
                if (canBeRun()) runCode();
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
          title="Copy Text from Cell"
          className={`inputCentered cellButton bRight ${
            isClicked ? "clicked" : ""
          }`}
          onClick={copyCode}
          onMouseDown={() => setIsClicked(true)}
          onMouseUp={() => setIsClicked(false)}
        >
          <FontAwesomeIcon className="icon" icon={faCopy} />
        </button>
      </div>
      <Handle type="source" position={Position.Right}>
        <div>
          {!hasError() ? (
            // INFO :: ▶️ run button when there is no error
            <div>
              {(executionCount !== "*") ? (
                // allowing to run code only if there is no error & we are not running the code
                <button
                  title="Run Code"
                  className="rinputCentered playButton rcentral"
                  onClick={runCode}
                  disabled={!canBeRun()}
                >
                  <FontAwesomeIcon className="icon" icon={faPlayCircle} />
                </button>
              ) : (
                // when we are running the code allow to interrupt kernel
                <button
                  title="Interrupt Kernel ⛔"
                  className="rinputCentered playInterruptButton rcentral"
                  onClick={interruptKernel}
                  disabled={!canBeRun()}
                >
                  <FontAwesomeIcon className="icon" icon={faStopCircle} />
                </button>
              )}
            </div>
          ) : (
            // INFO :: ▶️ run button when we have error ❌
            <div>
              {isHovered ? (
                // show the run button when we hover over it
                <button
                  title="Error: Fix your Code and then let's try it again mate"
                  className="rinputCentered playButton rcentral"
                  onClick={runCode}
                  disabled={!canBeRun()}
                  onMouseEnter={() => setIsHovered(true)}
                  onMouseLeave={() => setIsHovered(false)}
                >
                  <FontAwesomeIcon className="icon" icon={faCirclePlay} />
                </button>
              ) : (
                <div>
                  {(executionCount !== "*") ? (
                    // show the error button when we don't hover over it and nothing is running
                    <button
                      title="Error: Fix your Code and then let's try it again mate"
                      className="rinputCentered playErrorButton rcentral"
                      onClick={runCode}
                      disabled={!canBeRun()}
                      onMouseEnter={() => setIsHovered(true)}
                     >
                      <FontAwesomeIcon className="icon" icon={faXmarkCircle} />
                    </button>
                  ) : (
                    // show the interrupt button when we don't hover over it and something is running
                    <button
                      title="Interrupt Kernel ⛔"
                      className="rinputCentered playInterruptButton rcentral"
                      onClick={interruptKernel}
                      disabled={!canBeRun()}
                    >
                      <FontAwesomeIcon className="icon" icon={faStopCircle} />
                    </button>
                  )}
                </div>
              )}
            </div>
          )}
          {/* COMMENT - show execution count and lock only if the cell has been run for the first time */}
          {executionCount !== EXEC_CELL_NOT_YET_RUN && (
            <>
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
            </>
          )}
        </div>
      </Handle>
    </>
  );
}

export default memo(SimpleNode);
