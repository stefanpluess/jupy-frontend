//COMMENT :: External modules/libraries
import { 
  useState, 
  useEffect, 
  useRef 
} from "react";
import { memo } from "react";
import {
  Handle,
  Position,
  NodeToolbar,
  NodeProps,
  useStore,
  NodeResizeControl,
} from "reactflow";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faCopy,
  faObjectUngroup,
  faSave,
  faTriangleExclamation,
  faCheck
} from "@fortawesome/free-solid-svg-icons";
import Swal from "sweetalert2";
import withReactContent from "sweetalert2-react-content";
import * as clipboard from "clipboard-polyfill";
//COMMENT :: Internal modules HELPERS
import { 
  useDetachNodes, 
  useResizeBoundaries 
} from "../../helpers/hooks";
import useNodesStore from "../../helpers/nodesStore";
import { getConnectedNodeId } from "../../helpers/utils";
//COMMENT :: Internal modules CONFIG
import { OutputNodeData } from "../../config/types";
import { CONTROL_STLYE } from "../../config/constants";
//COMMENT :: Internal modules UI
import { ResizeIcon } from "../ui";

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

  const [isCopyClicked, setIsCopyClicked] = useState(false);
  const [isSaveClicked, setIsSaveClicked] = useState(false);

  const getResizeBoundaries = useResizeBoundaries();
  const { maxWidth, maxHeight } = useStore((store) => {
    // isEqual needed for rerendering purposes
    return getResizeBoundaries(id);
  }, isEqual);
  // outerDivMaxSize & setOuterDivMaxSize neede for proper resizing of the node at the initial render
  const OFFSET = 10; // this is the offset caused by the border width and padding of the our outer div comapred to react flow node
  const [outerDivMaxSize, setOuterDivMaxSize] = useState({ maxWidth: maxWidth-OFFSET, maxHeight: maxHeight-OFFSET});
  const onResizeStart = () => {
    setOuterDivMaxSize({ maxWidth: maxWidth-OFFSET, maxHeight: maxHeight-OFFSET});
  }

  const outputs = useNodesStore((state) => state.nodeIdToOutputs[id]);
  const setOutputTypeEmpty = useNodesStore((state) => state.setOutputTypeEmpty);
  const outputTypeEmpty = useNodesStore((state) => state.outputNodesOutputType[id] ?? false);

  /**
   * This useEffect is responsible for grouping the outputs of the code cell
   */
  useEffect(() => {
    if (!outputs) return;
    // solve bug in case output was received before execution count
    if (outputTypeEmpty && outputs.length > 0) setOutputTypeEmpty(id, false);
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
              : "stream",
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

      // TODO :: correctly handle \r in output
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
    data.outputs = grouped; // save the outputs grouped in the data object
  }, [outputs]);

  const onDetach = () => detachNodes([id]);

  /* Method used to copy the selected (or all) outputs */
  const copyOutput = async (index: number = -1) => {
    // if index is -1, copy all outputs to clipboard
    if (index === -1) {
      var html = "";
      groupedOutputs.forEach((output) => {
        if (!output.isImage) {
          html += output.output + "<br>";
        } else {
          html += '<img src="data:image/png;base64,' + output.output + '"><br>';
        }
      });
      const item = new clipboard.ClipboardItem({
        "text/html": new Blob([html], { type: "text/html" }),
      });
      await clipboard.write([item]);
      //alert("Copied all Outputs to Clipboard!");
      return;
    }

    if (groupedOutputs[index]?.output === "") return;
    if (!groupedOutputs[index]?.isImage) {
      var copiedOutput = groupedOutputs[index].output;
      clipboard.writeText(copiedOutput);
      // alert("Copied Output to Clipboard!");
    } else {
      const item = new clipboard.ClipboardItem({
        "image/png": b64toBlob(groupedOutputs[index]?.output, "image/png", 512),
      });
      await clipboard.write([item]);
      // alert("Copied Image as PNG to Clipboard!");
    }
  };

  /* Method used for saving of images (convert b64 string to blob object) */
  function b64toBlob(
    b64Data: string,
    contentType = "image/png",
    sliceSize = 512
  ) {
    let byteCharacters = atob(b64Data);
    let byteArrays = [];
    for (let offset = 0; offset < byteCharacters.length; offset += sliceSize) {
      let slice = byteCharacters.slice(offset, offset + sliceSize);
      let byteNumbers = new Array(slice.length);
      for (let i = 0; i < slice.length; i++) {
        byteNumbers[i] = slice.charCodeAt(i);
      }
      var byteArray = new Uint8Array(byteNumbers);
      byteArrays.push(byteArray);
    }
    return new Blob(byteArrays, { type: contentType });
  }

  /* Method used to save the output (only in case of images) */
  const saveOutput = (index: number) => {
    // return if there is no output yet
    if (groupedOutputs[index]?.output === "") return;
    if (groupedOutputs[index]?.isImage) {
      // Create a new anchor link
      const link = document.createElement("a");
      link.href = "data:image/png;base64," + groupedOutputs[index]?.output;
      link.download = "image.png"; // Set a default filename for the downloaded image
      link.style.display = "none"; // Hide the link
      document.body.appendChild(link); // Add the link to the DOM
      link.click(); // Programmatically click the link to trigger the download
      // Remove the link from the DOM after a short delay
      setTimeout(() => {
        document.body.removeChild(link);
      }, 1000);
      // console.log("Saved Output:\n" + link);
      // alert("Saved Output:\n" + link);
    }
  };

  // INFO :: lock functionality - observe the lock state of the connected SimpleNode with code
  const isSimpleNodeLocked = useNodesStore(
    (state) => state.locks[getConnectedNodeId(id)]
  );
  const MySwal = withReactContent(Swal);
  const showAlertDetachOff = () => {
    // window.alert('Unlock 🔓 before detaching!');
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
      return output.output.replace(/\n/g, "<br>");
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

  return (
    <div className={canRenderEmpty ? "OutputNodeEmpty" : "OutputNode"}
      style={outerDivMaxSize} // needed to maintain the size of the outer div
    >
      {/* {!canRenderEmpty && */}
        <NodeResizeControl
          style={CONTROL_STLYE}
          minWidth={35}
          minHeight={35}
          maxWidth={maxWidth} // this is only triggered after the node is resized
          maxHeight={maxHeight} // this is only triggered after the node is resized
          onResizeStart={onResizeStart}
        >
          <ResizeIcon isSmaller />
        </NodeResizeControl>
      {/* } */}
      <NodeToolbar className="nodrag">
        {!isSimpleNodeLocked ? (
          hasParent && (
            <button
              title="Ungroup OutputCell from BubbleCell"
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
        <div className="oinputCentered obuttonArea nodrag">
          <button
            title="Copy Output"
            className={`obuttonArea oUpper ${isCopyClicked ? "oClicked" : ""}`}
            onClick={() => copyOutput(0)}
            onMouseDown={() => setIsCopyClicked(true)}
            onMouseUp={() => setIsCopyClicked(false)}
          >
            <FontAwesomeIcon className="icon" icon={faCopy} />
          </button>
          {outputs && outputs[0]?.isImage && (
            <button
              className={`obuttonArea oLower ${
                isSaveClicked ? "oClickedSave" : ""
              }`}
              title="Save Output"
              onClick={() => saveOutput(0)}
              onMouseDown={() => setIsSaveClicked(true)}
              onMouseUp={() => setIsSaveClicked(false)}
            >
              <FontAwesomeIcon className="icon" icon={faSave} />
            </button>
          )}
        </div>
      )}

      {/* ----- Multiple Outputs - Only show buttons for selected ones, also highlighting them (no selection - show copy for all) ----- */}
      {groupedOutputs.length !== 1 && !canRenderEmpty &&(
        <div className="oinputCentered obuttonArea nodrag">
          <button
            title="Copy Selected Output"
            className={`obuttonArea oUpper ${isCopyClicked ? "oClicked" : ""}`}
            onClick={() => copyOutput(selectedOutputIndex)}
            onMouseDown={() => setIsCopyClicked(true)}
            onMouseUp={() => setIsCopyClicked(false)}
          >
            <FontAwesomeIcon className="icon" icon={faCopy} />
          </button>

          {outputs && outputs[selectedOutputIndex]?.isImage && (
            <button
              className={`obuttonArea oLower ${
                isSaveClicked ? "oClickedSave" : ""
              }`}
              title="Save Selected Output"
              onClick={() => saveOutput(selectedOutputIndex)}
              onMouseDown={() => setIsSaveClicked(true)}
              onMouseUp={() => setIsSaveClicked(false)}
            >
              <FontAwesomeIcon className="icon" icon={faSave} />
            </button>
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
            className={
              selectedOutputIndex === index && groupedOutputs.length !== 1
                ? "outputNode selected" +
                  (groupedOutput.outputType === "error" ? " errorMessage" : "")
                : "outputNode" +
                  (groupedOutput.outputType === "error" ? " errorMessage" : "")
            }
            dangerouslySetInnerHTML={{ __html: getHtmlOutput(groupedOutput) }}
            onClick={() => handleSelect(index)}
          ></div>
        ))}
        {/* COMMENT: Display when already run and no output*/}
        {(canRenderEmpty) && (
          <FontAwesomeIcon className="icon" icon={faCheck} />
        )}
      </div>
      <Handle
        type="target"
        position={Position.Left}
        isConnectableStart={false}
        style={{ height: "6px", width: "6px" }}
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
