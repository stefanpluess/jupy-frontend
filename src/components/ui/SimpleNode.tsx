//COMMENT :: External modules/libraries
import {
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
  NodeResizeControl,
  Panel
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
  faHourglass,
  faTriangleExclamation
} from "@fortawesome/free-solid-svg-icons";
import MonacoEditor from "@uiw/react-monacoeditor";
import Swal from "sweetalert2";
import withReactContent from "sweetalert2-react-content";
//COMMENT :: Internal modules HELPERS
import { 
  useDetachNodes, 
  useExecuteOnSuccessors, 
  useHasBusyPredecessor, 
  useHasBusySuccessors, 
  useInsertOutput, 
  useResetExecCounts, 
  useResizeBoundaries,
  useAddComment,
  useDuplicateCell,
  useAnalyzeStaleState
} from "../../helpers/hooks";
import { 
  getConnectedNodeId,
  getNodeOrder,
  isSuccessor,
} from "../../helpers/utils";
import useNodesStore from "../../helpers/nodesStore";
import { 
  useWebSocketStore, 
  onInterrupt 
} from "../../helpers/websocket";
//COMMENT :: Internal modules CONFIG
import { OutputNodeData } from "../../config/types";
import {
  KERNEL_BUSY_FROM_PARENT,
  KERNEL_IDLE,
  KERNEL_INTERRUPTED,
  EXEC_CELL_NOT_YET_RUN,
  MIN_WIDTH,
  MIN_HEIGHT,
  CONTROL_STLYE,
  EXPORT_ACTION,
  RUNBRANCH_ACTION,
} from "../../config/constants";
//COMMENT :: Internal modules UI
import { ResizeIcon} from "../ui";
import useSettingsStore from "../../helpers/settingsStore";

/**
 * A React component that represents a code cell node on the canvas.
 * @param id - The unique identifier of the node.
 * @param data - The data associated with the node - in this case the code.
 * It has functionalities like:
 * - run code
 * - interrupt kernel
 * - lock/unlock node
 * - delete node
 * - duplicate node
 * - detach node
 * - stale state indicator
 */

function SimpleNode({ id, data }: NodeProps) {
  const { deleteElements, getNode, getNodes } = useReactFlow();
  const hasParent = useStore(
    (store) => !!store.nodeInternals.get(id)?.parentNode
  );
  const parentNode = useStore(
    (store) => store.nodeInternals.get(id)?.parentNode
  );
  const parent = getNode(parentNode!);
  const detachNodes = useDetachNodes();
  const insertOutput = useInsertOutput();
  const executionCount = useNodesStore((state) => state.nodeIdToExecCount[id]?.execCount); // can be undefined
  const setNodeIdToExecCount = useNodesStore((state) => state.setNodeIdToExecCount);
  // INFO :: 😴 STALE STATE
  const deleteNodeFromUsedIdentifiersForGroupNodes = useNodesStore(
    (state) => state.deleteNodeFromUsedIdentifiersForGroupNodes
  );
  const staleState = useNodesStore((state) => state.staleState[id] ?? false);
  const setStaleState = useNodesStore((state) => state.setStaleState);
  const analyzeStaleState = useAnalyzeStaleState();
  // INFO :: 0️⃣ empty output type functionality
  const setOutputTypeEmpty = useNodesStore((state) => state.setOutputTypeEmpty);
  // INFO :: queue 🚶‍♂️🚶‍♀️🚶‍♂️functionality
  const addToQueue = useNodesStore((state) => state.addToQueue);
  const removeFromQueue = useNodesStore((state) => state.removeFromQueue);
  const setExecutionStateForGroupNode = useNodesStore(
    (state) => state.setExecutionStateForGroupNode
  );
  // INFO :: 🛑INTERRUPT KERNEL
  const clearQueue = useNodesStore((state) => state.clearQueue);
  const getExecutionStateForGroupNode = useNodesStore((state) => state.getExecutionStateForGroupNode);
  const parentExecutionState = useNodesStore((state) => state.groupNodesExecutionStates[parentNode!]); // can be undefined
  // INFO :: 🔒lock functionality
  const [transitioning, setTransitioning] = useState(false);
  const toggleLock = useNodesStore((state) => state.toggleLock);
  const isLocked = useNodesStore((state) => state.locks[id]);
  // INFO :: 🧫 CELL BRANCH
  const isCellBranchActive = useNodesStore((state) => state.isCellBranchActive);
  const clickedNodeOrder = useNodesStore((state) => state.clickedNodeOrder);
  const [nodeNumber, setNodeNumber] = useState('');
  // INFO :: DUPLICATE CELL
  const handleDuplicateCell = useDuplicateCell(id);
  
  const outputs = useNodesStore((state) => state.nodeIdToOutputs[id+"_output"]);
  const [isHovered, setIsHovered] = useState(false);
  // INFO :: resizing logic
  const getResizeBoundaries = useResizeBoundaries();
  const { maxWidth, maxHeight } = useStore((store) => {
    // isEqual needed for rerendering purposes
    return getResizeBoundaries(id);
  }, isEqual);

  // INFO :: show order
  const showOrder = useNodesStore((state) => state.showOrder);
	const runAllOrderSetting = useSettingsStore((state) => state.runAllOrder);
	const exportOrderSetting = useSettingsStore((state) => state.exportOrder);
  const fetchNodeOrder = useCallback(() => {
    const order = showOrder.action === EXPORT_ACTION ? exportOrderSetting : runAllOrderSetting;
    const number = getNodeOrder(id, showOrder.node, getNodes(), order, showOrder.action);
    return number;
  }, [showOrder, runAllOrderSetting, exportOrderSetting, id, parentNode, getNodes, getNodeOrder]);

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

  // INFO :: 🚀 EXECUTION COUNT - handling update of execution count
  useEffect(() => {
    const handleStaleStateAndExecCountChange = async () => {
      if (executionCount !== "*") {
        const assignedVariables = await analyzeStaleState(id); // INFO :: 😴 STALE STATE
        handleExecCountChange(assignedVariables);
      }
    };
    handleStaleStateAndExecCountChange();
  }, [executionCount]);

  const handleExecCountChange = useCallback(async (assignedVariables: string[] | undefined) => {
    if (hasParent) {
      data.executionCount.execCount = executionCount; // set it to the data prop
      const groupId = parent!.id;
      if (hasError()) stopFurtherExecution(false);
      else await executeOnSuccessors(parent!.id, assignedVariables);
      setExecutionStateForGroupNode(groupId, {nodeId: id, state: KERNEL_IDLE});
      removeFromQueue(groupId); // INFO :: queue 🚶‍♂️🚶‍♀️🚶‍♂️functionality
    }
    // INFO :: 0️⃣ empty output type functionality
    if (outputs && outputs.length === 0) setOutputTypeEmpty(id + "_output", true);
  }, [executionCount, hasParent, hasError, outputs, setExecutionStateForGroupNode, removeFromQueue, executeOnSuccessors]);

  // INFO :: 🟢 RUN CODE
  const runCode = useCallback(async () => {
    if (!data.code || data.code.trim() === '') return;
    if (executionCount === "") await insertOutput([id]); // if the execution count is "", create an output node and add an edge
    if (parent) {
      const groupId = parent.id;
      setNodeIdToExecCount(id, "*");
      addToQueue(groupId, id, data.code); // INFO :: queue 🚶‍♂️🚶‍♀️🚶‍♂️functionality
    }
  }, [parent, data.code, addToQueue, insertOutput, executionCount, setNodeIdToExecCount]);

  // INFO :: 🛑INTERRUPT KERNEL
  const interruptKernel = useCallback(() => {
    if (parent) {
      onInterrupt(token, parent.data.session.kernel.id);
      stopFurtherExecution(true);
    } else {
      console.warn("interruptKernel: parent is undefined");
    }
  }, [parentNode]);

  const resetExecCounts = useResetExecCounts();

  /* In case en error appears / kernel was interrupted, stop the further execution */
  const stopFurtherExecution = useCallback((was_interrupted: boolean) => {
    if (!parent) return;
    clearQueue(parent.id); // in case of interrupt: queue most likely was already cleared
    const nodeRunning = getExecutionStateForGroupNode(parent.id).nodeId;
    if (was_interrupted) setExecutionStateForGroupNode(parent.id, {nodeId: nodeRunning, state: KERNEL_INTERRUPTED});
    resetExecCounts(parent.id, nodeRunning);
  }, [parent, clearQueue, setExecutionStateForGroupNode, hasError]);

 // INFO :: 🗑️DELETE CELL
  // when deleting the node, automatically delete the output node as well
  const deleteNode = () =>
    deleteElements({ nodes: [{ id }, { id: id + "_output" }] });

  const onDetach = () => {
    if (isLocked) {
      // if locked then detach the SimpleNode and the OutputNode
      const outputNodeId = getConnectedNodeId(id);
      // console.log("run detach for " + id + " and " + outputNodeId + "!");
      detachNodes([id, outputNodeId]);
    } else {
      // if unlocked then detach just the SimpleNode
      // console.log("run detach for " + id + "!");
      detachNodes([id]);
    }
    // remove the node from the list of used identifiers for the group node
    deleteNodeFromUsedIdentifiersForGroupNodes(parentNode!, id);
    // mark as stale
    setStaleState(id, false);
  };

  const MySwal = withReactContent(Swal);
  const showInfoStaleState = () => {
    MySwal.fire({
      title: 'Stale state detected...',
      html: <i>This cell might be using variables that changed!</i>,
      icon: "info",
    });
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
  const duplicateCell = () => {
    handleDuplicateCell();
  };

  // INFO :: 🔒lock functionality
  const runLockUnlock = () => {
    setTransitioning(true);
    toggleLock(id);
    setTimeout(() => {
      setTransitioning(false);
    }, 300);
  };

  // INFO :: 🧫 CELL BRANCH
  useEffect( () => {
    // filter to exclude the output node ids and markdown node ids
    const clickedNodeOrderFiltered = clickedNodeOrder.filter((id) => !id.includes("_output") && !id.includes("mdNode"));
    // find the position of the id inside clickedNodeOrder
    const position = clickedNodeOrderFiltered.indexOf(id);
    // set the node number
    if (position === -1) {
      setNodeNumber('');
    }
    else{
      setNodeNumber((position + 1).toString());
    }
  }, [clickedNodeOrder]);

  const selectorCellBranch = (
    isCellBranchActive.isActive && isCellBranchActive.id === parentNode && (
      <Panel position="top-left" style={{ position: "absolute", top: "-1.5em", left: "-1.5em"}}>
        {nodeNumber === '' ? (
          <span className="dotNumberEmpty">{'\u00A0'}</span>
          ) : (
            <span className="dotNumberSelected">{nodeNumber}</span>
          )
        }
      </Panel>)
  );

  const shouldShowOrder = (
    showOrder.node === parentNode || 
    (showOrder.action === RUNBRANCH_ACTION && isSuccessor(getNodes(), parentNode!, showOrder.node))
  );

  const hasBusySucc = useHasBusySuccessors();
  const hasBusyPred = useHasBusyPredecessor();

  const canBeRun = useCallback(() => {
    return (
      hasParent &&
      wsRunning &&
      parentExecutionState?.state !== KERNEL_BUSY_FROM_PARENT &&
      !hasBusyPred(parentNode!) && // something is soon to be executed on this child -> prevent running
      !hasBusySucc(parentNode!) // something is currently executed on an influenced child -> prevent running
    );
  }, [hasParent, wsRunning, parentExecutionState, hasBusyPred, hasBusySucc]);

  return (
    <>
      {selectorCellBranch}
      <NodeResizeControl
        style={CONTROL_STLYE}
        minWidth={MIN_WIDTH}
        minHeight={MIN_HEIGHT}
        maxWidth={maxWidth}
        maxHeight={maxHeight}
      >
        <ResizeIcon />
      </NodeResizeControl>
      <NodeToolbar className="nodrag">
        <div>
          <button onClick={deleteNode} title="Delete Cell">
            <FontAwesomeIcon className="icon" icon={faTrashAlt} />
          </button>

          <button onClick={duplicateCell} title="Duplicate Cell">
            <FontAwesomeIcon className="icon" icon={faCopy} />
          </button>

          {hasParent && (
            <button title="Ungroup CodeCell from BubbleCell" onClick={onDetach}>
              <FontAwesomeIcon className="icon" icon={faObjectUngroup} />
            </button>
          )}

          <button
            title="Add Comment to Cell"
            onClick={onAddComment}
            value="textComment"
          >
            <FontAwesomeIcon className="icon" icon={faCommentAlt} />
          </button>
          
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
        <div className="inner" style={{ opacity: shouldShowOrder ? 0.5 : 1 }}>
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
            options={{
              padding: { top: 3, bottom: 3 },
              theme: "vs-dark",
              selectOnLineNumbers: true,
              roundedSelection: true,
              automaticLayout: true,
              lineNumbersMinChars: 3,
              lineNumbers: "on",
              folding: false,
              scrollBeyondLastLine: false,
              scrollBeyondLastColumn: 0,
              fontSize: 10,
              wordWrap: "on",
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
          {/* INFO :: bottom bar below Monaco with buttons for code cell */}
          <div className="bottomCodeCellButtons">
            {/* COPY CELL */}
            <button
              title="Copy Text from Cell"
              className="cellButton"
              onClick={copyCode}
            >
              <FontAwesomeIcon className="copy-icon" icon={faCopy} />
            </button>
            {/* STALE STATE INDICATOR */}
            {staleState && (
              <button
                className="cellButton staleIcons"
                onClick = {showInfoStaleState}
              >
                <FontAwesomeIcon className="stale-icon" icon={faHourglass} />
                <FontAwesomeIcon className="stalewarning-icon" icon={faTriangleExclamation} />
              </button>
            )}
            <div style={{width: "20px"}}/>
          </div>
        </div>
        {shouldShowOrder && (
        <div className="innerOrder">
          {fetchNodeOrder()}
        </div>)}
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
              {(isHovered || !hasParent) ? (
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
                [{executionCount ?? ""}]
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

type IsEqualCompareObj = {
  maxWidth: number;
  maxHeight: number;
};

function isEqual(prev: IsEqualCompareObj, next: IsEqualCompareObj): boolean {
  return (
    prev.maxWidth === next.maxWidth &&
    prev.maxHeight === next.maxHeight
  );
}

export default memo(SimpleNode);
