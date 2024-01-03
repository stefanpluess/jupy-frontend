import React, { useState } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faClipboard } from '@fortawesome/free-regular-svg-icons';
import { IconProp } from '@fortawesome/fontawesome-svg-core';
import { useReactFlow } from 'reactflow';
import { OutputNodeData } from "../../config/types";
import * as clipboard from "clipboard-polyfill";
import { OUTPUT_NODE } from '../../config/constants';
import CheckIcon from './CheckIcon';

interface CopyButtonProps {
  nodeType: string;
  title: string;
  className: string;
  nodeId?: string; // Make groupedOutputs optional
  groupedOutputs?: OutputNodeData[]; // Make groupedOutputs optional
  copyOutputIndex?: number; // Make copyOutputIndex optional
}

const CopyButton: React.FC<CopyButtonProps> = ({ nodeType, title, className, nodeId, groupedOutputs, copyOutputIndex}) => {
  const { getNode } = useReactFlow();
  const [isCopied, setIsCopied] = useState(false);

  // INFO :: function used in SimpleNode and MarkdownNode
  const copyCode = () => {
    if (nodeId === undefined) {
      return;
    }
    setIsCopied(true);
    const node = getNode(nodeId);
    let copyText = node!.data.code
    if (copyText === undefined) {
      copyText = ''
    }
    navigator.clipboard.writeText(copyText);
    setTimeout(() => {
      setIsCopied(false);
    }, 700);
  };

  // INFO :: function used in OutputNode
  /* Method used to copy the selected (or all) outputs */
  const copyOutput = async (index: number = -1) => {
    setIsCopied(true);

    /* groupedOutputs might be undefined, add a nullish coalescing operator (??) 
    to ensure not trying to access properties on an undefined variable. */
    const outputs = groupedOutputs ?? [];

    // if index is -1, copy all outputs to clipboard
    if (index === -1) {
      let html = "";
      outputs.forEach((output) => {
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
      setTimeout(() => {
        setIsCopied(false);
      }, 700);
      return;
    }

    if (outputs[index]?.output === "") {
      setTimeout(() => {
        setIsCopied(false);
      }, 700);
      return;
    }
    
    if (!outputs[index]?.isImage) {
      let copiedOutput = outputs[index].output;
      clipboard.writeText(copiedOutput);
      // alert("Copied Output to Clipboard!");
    } else {
      const item = new clipboard.ClipboardItem({
        "image/png": b64toBlob(outputs[index]?.output, "image/png", 512),
      });
      await clipboard.write([item]);
      // alert("Copied Image as PNG to Clipboard!");
    }
    setTimeout(() => {
      setIsCopied(false);
    }, 700);
  };

  /* Method used for saving of images (convert b64 string to blob object) */
  // method transfered from SimpleOutputNode which was done by @lerchal1
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
      let byteArray = new Uint8Array(byteNumbers);
      byteArrays.push(byteArray);
    }
    return new Blob(byteArrays, { type: contentType });
  }

  return (
    <button
      title={title}
      className={className}
      // use copyCode function if nodeType is not OUTPUT_NODE
      onClick={nodeType !== OUTPUT_NODE ?  copyCode : () => copyOutput(copyOutputIndex)}
    >
      {isCopied ? (
        <CheckIcon />
      ) : (
        <FontAwesomeIcon className='copy-icon' icon={faClipboard as IconProp} />
      )}
    </button>
  );
};

export default CopyButton;