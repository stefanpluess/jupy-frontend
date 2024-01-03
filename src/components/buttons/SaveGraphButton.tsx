import React, { useState } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faSave } from "@fortawesome/free-solid-svg-icons";
import { OutputNodeData } from "../../config/types";
import CheckIcon from './CheckIcon';

interface SaveGraphButtonProps {
  title: string;
  className: string;
  groupedOutputs: OutputNodeData[];
  saveOutputIndex: number;
}

const SaveGraphButton: React.FC<SaveGraphButtonProps> = ({ title, className, groupedOutputs, saveOutputIndex}) => {
  const [isSaved, setIsSaved] = useState(false);

  /* Method used to save the output (only in case of images) */
  const saveOutput = (index: number) => {
    setIsSaved(true);

    /* groupedOutputs might be undefined, add a nullish coalescing operator (??) 
    to ensure not trying to access properties on an undefined variable. */
    const outputs = groupedOutputs ?? [];

    // return if there is no output yet
    if (outputs[index]?.output === "") {
        setTimeout(() => {
            setIsSaved(false);
        }, 700);
        return;
    }
    if (outputs[index]?.isImage) {
        // Create a new anchor link
        const link = document.createElement("a");
        link.href = "data:image/png;base64," + outputs[index]?.output;
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
        setTimeout(() => {
            setIsSaved(false);
        }, 700);
    }
  };

  return (
    <button
      title={title}
      className={className}
      onClick={() => saveOutput(saveOutputIndex)}
    >
      {isSaved ? (
        <CheckIcon />
      ) : (
        <FontAwesomeIcon className="save-icon" icon={faSave} />
      )}
    </button>
  );
};

export default SaveGraphButton;