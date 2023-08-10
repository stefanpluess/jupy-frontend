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
} from "@fortawesome/free-solid-svg-icons";
import { useDetachNodes } from "../../helpers/hooks";

function SimpleOutputNode({ id, data }: NodeProps) {
  const hasParent = useStore(
    (store) => !!store.nodeInternals.get(id)?.parentNode
  );
  const parentNode = useStore(
    (store) => store.nodeInternals.get(id)?.parentNode
  );
  const { deleteElements } = useReactFlow();
  const detachNodes = useDetachNodes();

  const [output, setOutput] = useState({ __html: "" });
  const [outputType, setOutputType] = useState(data?.outputType);

  useEffect(() => {
    // console.log(id+ " ----- Output Changed ----- now: " + data?.output)
    var formattedOutput = "";
    if (data?.isImage) {
      formattedOutput =
        '<img src="data:image/png;base64,' + data?.output + '">';
    } else {
      formattedOutput = data?.output.replace(/\n/g, "<br>");
    }
    const outputHtml = { __html: formattedOutput };
    setOutput(outputHtml);
  }, [data?.output]);

  //   const onDelete = () => deleteElements({ nodes: [{ id }] });
  const onDetach = () => detachNodes([id]);

  const copyOutput = () => {
    if (data?.output === "") {
      alert(
        "No output to copy yet mate.\nFirst put in some work and execute the cell bro:)"
      );
      return;
    }

    //TODO: copy an image to clipboard (currently not working) --> see https://stackoverflow.com/questions/66649604/how-to-copy-an-image-to-the-clipboard-in-react

    if (data?.isImage) {
      // Create an image element and set its source to the base64 data
      const img = new Image();
      img.src = "data:image/png;base64," + data?.output;

      // When the image is loaded, handle the clipboard copy
      img.onload = () => {
        // Create a canvas element and draw the image on it
        const canvas = document.createElement("canvas");
        canvas.width = img.width;
        canvas.height = img.height;
        const ctx = canvas.getContext("2d");
        ctx?.drawImage(img, 0, 0);

        // Convert the canvas data to a data URL
        const dataURL = canvas.toDataURL();

        // Copy the data URL to the clipboard
        navigator.clipboard
          .writeText(dataURL)
          .then(() => {
            alert("Copied Image to Clipboard!");
          })
          .catch((error) => {
            console.error("Failed to copy image to clipboard:", error);
          });
      };
    }
    // Create a new anchor link
    //   const link = document.createElement("a");
    //   link.href = "data:image/png;base64," + data?.output;
    //   link.download = "image.png"; // Set a default filename for the downloaded image
    //   link.style.display = "none"; // Hide the link

    //   // Add the link to the DOM
    //   document.body.appendChild(link);

    //   // Programmatically click the link to trigger the download
    //   link.click();

    //   // Remove the link from the DOM after a short delay
    //   setTimeout(() => {
    //     document.body.removeChild(link);
    //   }, 1000);
    // }

    // if (data?.isImage) {
    //   // Fetch the image data from the URL
    //   fetch(data.output)
    //     .then((response) => response.blob())
    //     .then((blob) => {
    //       // Convert the blob to a data URL
    //       const reader = new FileReader();
    //       reader.onloadend = () => {
    //         if (typeof reader.result === "string") {
    //           // Check if it's a valid string
    //           // Copy the data URL to the clipboard
    //           navigator.clipboard
    //             .writeText(reader.result)
    //             .then(() => {
    //               alert("Copied Image Output to Clipboard!");
    //             })
    //             .catch((error) => {
    //               console.error("Failed to copy image to clipboard:", error);
    //             });
    //         } else {
    //           console.error("Invalid data format: expected a string.");
    //         }
    //       };
    //       reader.readAsDataURL(blob);
    //     })
    //     .catch((error) => {
    //       console.error("Failed to fetch image:", error);
    //     });

    //return;
    else {
      var copiedOutput = output.__html.replace(/<br>/g, "\n");
      navigator.clipboard.writeText(copiedOutput);
      alert("Copied Output:\n" + copiedOutput);
      console.log("Copied Output:\n" + copiedOutput);
    }
  };

  const saveOutput = () => {
    // first if clause can be deleted if saveOutput is working
    if (data?.output === "") {
      alert(
        "No output to save yet mate.\nFirst put in some work and execute the cell bro:)"
      );
      return;
    }
    if (data?.isImage) {
      // Create a new anchor link
      const link = document.createElement("a");
      link.href = "data:image/png;base64," + data?.output;
      link.download = "image.png"; // Set a default filename for the downloaded image
      link.style.display = "none"; // Hide the link

      // Add the link to the DOM
      document.body.appendChild(link);

      // Programmatically click the link to trigger the download
      link.click();

      // Remove the link from the DOM after a short delay
      setTimeout(() => {
        document.body.removeChild(link);
      }, 1000);

      // alert("Saved Output:\n" + link);
      // console.log("Saved Output:\n" + link);
      // alert("Saved Output:\n" + link);
    }
  };

  return (
    <>
      <NodeToolbar className="nodrag">
        {/* <button onClick={onDelete}>Delete</button> */}
        {hasParent && (
          <button title="Ungroup OutputCell from BubbleCell" onClick={onDetach}>
            <FontAwesomeIcon className="icon" icon={faObjectUngroup} />
          </button>
        )}
      </NodeToolbar>
      <div className="oinputCentered obuttonArea nodrag">
        <button
          title="Copy Output"
          className="obuttonArea oUpper"
          onClick={copyOutput}
        >
          <FontAwesomeIcon className="icon" icon={faCopy} />
        </button>

        {data?.isImage && (
          <button
            className="obuttonArea oLower"
            title="Save Output"
            onClick={saveOutput}
            //disabled={!data?.isImage} --> disabled and turning red if output != image
            //disabled={!data.output} --> as long as there is no output button is disabled and red
          >
            <FontAwesomeIcon className="icon" icon={faSave} />
          </button>
        )}
      </div>

      {data?.isImage ? (
        <div
          className="outputNode" //to be deleted???
          dangerouslySetInnerHTML={output}
          style={{ maxHeight: "400px", maxWidth: "500px", overflow: "auto" }}
        ></div>
      ) : (
        <div className="outputNode" dangerouslySetInnerHTML={output}></div>
      )}

      <Handle type="target" position={Position.Left} />
    </>
  );
}

export default memo(SimpleOutputNode);
