import { useState, useEffect } from "react";
import { memo } from "react";
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
  faCopy,
  faObjectUngroup,
  faSave,
  faTriangleExclamation,
} from "@fortawesome/free-solid-svg-icons";
import { useDetachNodes } from "../../helpers/hooks";
import useNodesStore from "../../helpers/nodesStore";
import { getConnectedNodeId } from "../../helpers/utils";
import Swal from "sweetalert2";
import withReactContent from "sweetalert2-react-content";
import { OutputNodeData } from "../../config/types";
import * as clipboard from "clipboard-polyfill";

function SimpleOutputNode({ id, data }: NodeProps<{ outputs: OutputNodeData[] }>) {
  const hasParent = useStore((store) => !!store.nodeInternals.get(id)?.parentNode);
  const detachNodes = useDetachNodes();
  const [groupedOutputs, setGroupedOutputs] = useState([] as OutputNodeData[]);

  useEffect(() => {
    if (!data.outputs) return;

    const grouped = [] as OutputNodeData[];
    let currentGroup = null as OutputNodeData | null;
    data.outputs.forEach((output) => {
      if (!currentGroup || currentGroup.isImage || output.isImage) {
        currentGroup = {
          output: '',
          isImage: output.isImage,
          outputType: output.isImage ? 'display_data' : 'stream',
          timestamp: output.timestamp,
        };
        grouped.push(currentGroup);
      }
      // in case of live updates (f.ex. training a model), \b is used to delete the previous output
      // display the output in a way that the \b is respected (removing from prevous output, replacing with '' in current output)
      const strippedOutput = output.output.split('\b')
      const indexOfCorrectOutput = strippedOutput.length - 1;
      if (indexOfCorrectOutput > 0) currentGroup.output = currentGroup.output.slice(0, -indexOfCorrectOutput);
      currentGroup.output += strippedOutput[indexOfCorrectOutput];
    });

    setGroupedOutputs(grouped);
  }, [data.outputs]);

  //   const onDelete = () => deleteElements({ nodes: [{ id }] });
  const onDetach = () => detachNodes([id]);

  const copyOutput = async (index: number) => {
    // return if there is no output yet
    if (groupedOutputs[index]?.output === "") return;
    if (!groupedOutputs[index]?.isImage) {
      var copiedOutput = groupedOutputs[index].output;
      navigator.clipboard.writeText(copiedOutput);
      alert("Copied Output:\n" + copiedOutput);
      console.log("Copied Output:\n" + copiedOutput);
    } else {
      const item = new clipboard.ClipboardItem({
        "image/png": b64toBlob(groupedOutputs[index]?.output, 'image/png', 512)
      });
      await clipboard.write([item]);
      alert("Copied Image as PNG to Clipboard!");
    }
  };

  function b64toBlob(b64Data: string, contentType = 'image/png', sliceSize = 512) {
    let byteCharacters = atob(b64Data)
    let byteArrays = []
    for (let offset = 0; offset < byteCharacters.length; offset += sliceSize) {
      let slice = byteCharacters.slice(offset, offset + sliceSize)
      let byteNumbers = new Array(slice.length);
      for (let i = 0; i < slice.length; i++) {
        byteNumbers[i] = slice.charCodeAt(i)
      }
      var byteArray = new Uint8Array(byteNumbers)
      byteArrays.push(byteArray)
    }
    return new Blob(byteArrays, {type: contentType})
  }

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
  const isSimpleNodeLocked = useNodesStore((state) => state.locks[getConnectedNodeId(id)]);
  const MySwal = withReactContent(Swal);
  const showAlertDetachOff = () => {
    // window.alert('Unlock 🔓 before detaching!');
    MySwal.fire({
      title: <strong>Detach error!</strong>,
      html: <i>Unlock 🔓 before detaching!</i>,
      icon: "error",
    });
  };

  function getHtmlOutput(output: OutputNodeData) {
    if (output.isImage) {
      return '<img src="data:image/png;base64,' + output.output + '">';
    } else {
      return output.output.replace(/\n/g, "<br>");
    }
  }

  return (
    <>
      <NodeToolbar className="nodrag">
        {/* <button onClick={onDelete}>Delete</button> */}
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

      <div style={{ maxHeight: "200px", maxWidth: "500px", overflow: "auto" }}>
        {groupedOutputs.map((groupedOutput, index) => (
          <>
            <div className="oinputCentered obuttonArea nodrag">
              <button
                title="Copy Output"
                className="obuttonArea oUpper"
                onClick={() => copyOutput(index)}
              >
                <FontAwesomeIcon className="icon" icon={faCopy} />
              </button>

              {data.outputs[index]?.isImage && (
                <button
                  className="obuttonArea oLower"
                  title="Save Output"
                  onClick={() => saveOutput(index)}
                >
                  <FontAwesomeIcon className="icon" icon={faSave} />
                </button>
              )}
            </div>
            
            <div
              className="outputNode"
              dangerouslySetInnerHTML={{ __html: getHtmlOutput(groupedOutput) }}
              // style={groupedOutput.isImage ? { maxHeight: "200px", maxWidth: "500px", overflow: "auto" } : {}}
            ></div>
          </>
        ))}
      </div>
      {/* TODO: change this */}
      {groupedOutputs.length === 0 && (
        <div
          className="outputNode"
          dangerouslySetInnerHTML={{ __html: "" }}
          style={{ maxHeight: "200px", maxWidth: "500px", overflow: "auto" }}
        ></div>
      )}
      <Handle type="target" position={Position.Left} />
    </>
  );
}

export default memo(SimpleOutputNode);
