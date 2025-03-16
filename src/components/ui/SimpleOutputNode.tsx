//COMMENT :: External modules/libraries
import { 
  useState, 
  useEffect, 
  useRef, 
  useCallback
} from "react";
import { memo } from "react";
import {
  Handle,
  Position,
  NodeToolbar,
  NodeProps,
  useStore,
  NodeResizeControl,
  useReactFlow,
  ResizeDragEvent,
  ResizeParams,
} from "reactflow";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faObjectUngroup,
  faTriangleExclamation,
  faCheck
} from "@fortawesome/free-solid-svg-icons";
import Swal from "sweetalert2";
import withReactContent from "sweetalert2-react-content";
//COMMENT :: Internal modules HELPERS
import { 
  useDetachNodes, 
  useResizeBoundaries 
} from "../../helpers/hooks";
import useNodesStore from "../../helpers/nodesStore";
import { ansiToHtml, getConnectedNodeId, getSimpleNodeId } from "../../helpers/utils";
//COMMENT :: Internal modules CONFIG
import { OutputNodeData } from "../../config/types";
import { CONTROL_STLYE, OUTPUT_NODE } from "../../config/constants";
//COMMENT :: Internal modules UI
import { ResizeIcon } from "../ui";
import useSettingsStore from "../../helpers/settingsStore";
//COMMENT :: Internal modules BUTTONS
import CopyButton from "../buttons/CopyContentButton";
import SaveGraphButton from "../buttons/SaveGraphButton";
import { useUpdateWebSocket } from "../../helpers/hooks/useUpdateWebSocket";

/**
 * A React component that represents an output node on the canvas.
 * it is responsible for rendering the output of the code cell correctly.
 * @param id The ID of the node.
 * @param data The data associated with the node - in this case, the outputs.
 * It has functionalities like:
 * - Detaching the output node from the parent group cell when edge is unlocked.
 * - Copying the output to clipboard.
 * - Saving the output as image.
 */

function SimpleOutputNode({
  id,
  data,
}: NodeProps<{ outputs: OutputNodeData[] }>) {
  const hasParent = useStore(
    (store) => !!store.nodeInternals.get(id)?.parentNode
  );
  
  const detachNodes = useDetachNodes();
  const [groupedOutputs, setGroupedOutputs] = useState([] as OutputNodeData[]);
  const [selectedOutputIndex, setSelectedOutputIndex] = useState(-1 as number);

  const getResizeBoundaries = useResizeBoundaries();
  const { maxWidth, maxHeight } = useStore((store) => {
    // isEqual needed for rerendering purposes
    return getResizeBoundaries(id);
  }, isEqual);
  // outerDivMaxSize & setOuterDivMaxSize neede for proper resizing of the node at the initial render
  const OFFSET = 10; // this is the offset caused by the border width and padding of the our outer div comapred to react flow node
  const [outerDivMaxSize, setOuterDivMaxSize] = useState({ maxWidth: maxWidth-OFFSET, maxHeight: maxHeight-OFFSET});
  const onResize = () => {
    setOuterDivMaxSize({ maxWidth: maxWidth-OFFSET, maxHeight: maxHeight-OFFSET});
  }

  const outputs = useNodesStore((state) => state.nodeIdToOutputs[id]);
  const setOutputTypeEmpty = useNodesStore((state) => state.setOutputTypeEmpty);
  const outputTypeEmpty = useNodesStore((state) => state.outputNodesOutputType[id] ?? false);
  const floatingEdgesSetting = useSettingsStore((state) => state.floatingEdges);
  const getExecCountForNodeId = useNodesStore((state) => state.getExecCountFromNodeId);
  const {getNode} = useReactFlow();
  const {sendResize} = useUpdateWebSocket();

  /**
   * This useEffect is responsible for grouping the outputs of the code cell
   */
  useEffect(() => {
    if (!outputs) return;
    // console.log(`OutputNode ${id}: `, outputs);
    setSelectedOutputIndex(-1);
    const grouped = [] as OutputNodeData[];
    let currentGroup = null as OutputNodeData | null;
    outputs.forEach((output) => {
      // group execute_result and stream outputs together. Images, display_data and errors are always in their own group.
      if (
        !currentGroup ||
        currentGroup.isImage ||
        output.isImage ||
        currentGroup.outputType === "display_data" ||
        output.outputType === "display_data" ||
        output.outputType === "error"
      ) {
        currentGroup = {
          output: "",
          outputHTML: output.outputHTML,
          isImage: output.isImage,
          outputType:
            output.outputType === "display_data"
              ? "display_data"
              : output.outputType === "error"
              ? "error"
              : "execute_result",
          timestamp: output.timestamp,
        };
        grouped.push(currentGroup);
      }
      // in case of live updates (f.ex. training a model), \b is used to delete the previous output
      // display the output in a way that the \b is respected (removing from prevous output, replacing with '' in current output)
      const strippedOutput = output.output.split("\b");
      const indexOfCorrectOutput = strippedOutput.length - 1;
      if (indexOfCorrectOutput > 0) {
        currentGroup.output = currentGroup.output.slice(
          0,
          -indexOfCorrectOutput
        );
      }

      // before adding to the output, if a \r is present, remove everything before it from the end of currentGroup.output
      // const indexOfCarriageReturn = strippedOutput[indexOfCorrectOutput].indexOf("\r");
      // if (indexOfCarriageReturn >= 0) {
      //   console.log("found carriage return")
      //   currentGroup.output = currentGroup.output.slice(
      //     0,
      //     -indexOfCarriageReturn
      //   );
      // }
      currentGroup.output += strippedOutput[indexOfCorrectOutput];
    });
    setGroupedOutputs(grouped);
    data.outputs = grouped;
     // save the outputs grouped in the data object
  }, [outputs]);

  /* Ensure that, even if outputs is received before exec count, it is correctly set to check mark icon (only when empty) */
  useEffect(() => {
    if (outputs && outputs.length > 0) setOutputTypeEmpty(id, false);
  }, [outputs, outputTypeEmpty]);

  const onDetach = () => detachNodes([id]);

  // INFO :: lock functionality - observe the lock state of the connected SimpleNode with code
  const isSimpleNodeLocked = useNodesStore(
    (state) => state.locks[getConnectedNodeId(id)]
  );
  const MySwal = withReactContent(Swal);
  const showAlertDetachOff = () => {
    MySwal.fire({
      title: <strong>Detach error!</strong>,
      html: <i>Unlock 🔓 before detaching!</i>,
      icon: "error",
    });
  };

  /* Method used to get the html output */
  function getHtmlOutput(output: OutputNodeData) {
    if (output.isImage) {
      return '<img src="data:image/png;base64,' + output.output + '">';
    } else if (output.outputHTML) {
      return '<div class="rendered_html">' + output.outputHTML + "</div>";
    } else {
      return ansiToHtml(output.output.replace(/\n/g, "<br>"));
    }
  }

  const handleSelect = (index: number) => {
    // if index is already selected, deselect it
    if (selectedOutputIndex === index) {
      setSelectedOutputIndex(-1);
    } else {
      setSelectedOutputIndex(index);
    }
  };

  // INFO :: 🖱️ making the output node scrollable with mouse wheel if the content is bigger than max height
  const divRef = useRef<HTMLDivElement | null>(null);
  const [isScrollbarVisible, setIsScrollbarVisible] = useState(false);
  useEffect(() => {
    const divElement = divRef.current;
    if (divElement) {
      // if (divElement.scrollHeight !=  divElement.clientHeight) it means that the scrollbar is visible
      setIsScrollbarVisible(divElement.scrollHeight != divElement.clientHeight);
    }
  }, [groupedOutputs]);

  // INFO :: 0️⃣ change class when no output
  const canRenderEmpty = useNodesStore((state) => state.outputNodesOutputType[id] ?? false);

  const onResizeEnd = useCallback((event: ResizeDragEvent, params: ResizeParams) => {
    sendResize(id, params.height, params.width);
  }, [])

  return (
    <div className={canRenderEmpty ? "OutputNodeEmpty" : "OutputNode"}
      style={outerDivMaxSize} // needed to maintain the size of the outer div
    >
      <NodeResizeControl
        style={CONTROL_STLYE}
        minWidth={35}
        minHeight={35}
        maxWidth={maxWidth} // this is only triggered after the node is resized
        maxHeight={maxHeight} // this is only triggered after the node is resized
        onResize={onResize}
        onResizeEnd={onResizeEnd}
      >
        <ResizeIcon isSmaller />
      </NodeResizeControl>
      
      <NodeToolbar className="nodrag">
        {!isSimpleNodeLocked ? (
          hasParent && (
            <button
              title="Ungroup OutputCell from Kernel"
              onClick={onDetach}
            >
              <FontAwesomeIcon className="icon" icon={faObjectUngroup} />
            </button>
          )
        ) : (
          <button
            title="Unlock 🔓 before detaching"
            onClick={showAlertDetachOff}
            className="detachDisabled"
          >
            <FontAwesomeIcon
              className="icon-detachoff-warning"
              icon={faTriangleExclamation}
            />
            <FontAwesomeIcon
              className="icon-detachoff-detach"
              icon={faObjectUngroup}
            />
          </button>
        )}
      </NodeToolbar>

      {/* ----- Single Output - Always show buttons ----- */}
      {groupedOutputs.length === 1 && (
        <div className="OutputNodeButtonsArea nodrag">
          <CopyButton
            title="Copy Output"
            className='cellButton'
            nodeType={OUTPUT_NODE} 
            groupedOutputs={groupedOutputs}
            copyOutputIndex = {0}
          />
          {outputs && outputs[0]?.isImage && (
            <SaveGraphButton
              title="Save Output"
              className='cellButton'
              groupedOutputs={groupedOutputs}
              saveOutputIndex = {0}
            />
          )}
        </div>
      )}

      {/* ----- Multiple Outputs - Only show buttons for selected ones, also highlighting them (no selection - show copy for all) ----- */}
      {groupedOutputs.length !== 1 && !canRenderEmpty &&(
        <div className="OutputNodeButtonsArea nodrag">
          <CopyButton
            title="Copy Selected Output"
            className='cellButton'
            nodeType={OUTPUT_NODE} 
            groupedOutputs={groupedOutputs}
            copyOutputIndex = {selectedOutputIndex}
          />
          {outputs && outputs[selectedOutputIndex]?.isImage && (
            <SaveGraphButton
              title="Save Selected Output"
              className='cellButton'
              groupedOutputs={groupedOutputs}
              saveOutputIndex = {selectedOutputIndex}
            />
          )}
        </div>
      )}

      <div
        ref={divRef}
        className={isScrollbarVisible ? "nowheel" : "outputContent"}
      >
        {groupedOutputs.map((groupedOutput, index) => (
          <div
            key={index}
            className={selectedOutputIndex === index && groupedOutputs.length !== 1 ? "outputNode selected" : "outputNode"}
            // style={groupedOutput.outputType === "error" ? { whiteSpace: "pre" } : {}}
            dangerouslySetInnerHTML={{ __html: getHtmlOutput(groupedOutput) }}
            onClick={() => handleSelect(index)}
          />
        ))}
        {/* COMMENT: Display when already run and no output*/}
        {(canRenderEmpty) && (
          <FontAwesomeIcon className="icon" icon={faCheck} />
        )}
      </div>
      <Handle
        className="handle-output"
        type="target"
        position={Position.Left}
        isConnectableStart={false}
      />
    </div>
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
export default memo(SimpleOutputNode);
