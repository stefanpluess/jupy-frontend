import {
  faSave,
  faToggleOff,
  faToggleOn,
} from "@fortawesome/free-solid-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { DragEvent, useEffect, useState } from "react";
import { Button } from "react-bootstrap";
import { Node, Edge } from "reactflow";
import { saveNotebook } from "../../helpers/utils";
import { usePath } from "../../helpers/hooks";
import { shallow } from "zustand/shallow";
import { selectorHome, useWebSocketStore } from "../../helpers/websocket";

const onDragStart = (event: DragEvent, nodeType: string) => {
  event.dataTransfer.setData("application/reactflow", nodeType);
  event.dataTransfer.effectAllowed = "move";
};

type SidebarProps = {
  nodes: Node[];
  edges: Edge[];
  setShowSuccessAlert: any;
  setShowErrorAlert: any;
};

const Sidebar = ({
  nodes,
  edges,
  setShowSuccessAlert,
  setShowErrorAlert,
}: SidebarProps) => {
  const path = usePath();
  const { token } = useWebSocketStore(selectorHome, shallow);
  const [isAutosave, setIsAutosave] = useState(false);

  const changeAutoSave = () => {
    if (isAutosave) {
      setIsAutosave(false);
    } else {
      setIsAutosave(true);
    }
  };

  const performAutosave = () => {
    saveNotebook(
      nodes,
      edges,
      token,
      path,
      setShowSuccessAlert,
      setShowErrorAlert
    );
  };

  useEffect(() => {
    let autosaveInterval: string | number | NodeJS.Timer | undefined;

    if (isAutosave) {
      autosaveInterval = setInterval(performAutosave, 30000); // 30 seconds=30000 milliseconds
    } else {
      clearInterval(autosaveInterval);
    }

    // Clean up the interval when component unmounts or when isAutosave changes
    return () => {
      clearInterval(autosaveInterval);
    };
  }, [
    isAutosave,
    nodes,
    edges,
    token,
    path,
    setShowSuccessAlert,
    setShowErrorAlert,
  ]);

  return (
    <aside>
      <div
        className="react-flow__node-group"
        onDragStart={(event: DragEvent) => onDragStart(event, "group")}
        draggable
      >
        <div className="label">Bubble</div>
      </div>
      <div
        className="react-flow__node-node"
        onDragStart={(event: DragEvent) => onDragStart(event, "node")}
        draggable
      >
        <div className="label">Code</div>
      </div>
      <div
        className="react-flow__node-mdNode"
        onDragStart={(event: DragEvent) => onDragStart(event, "mdNode")}
        draggable
      >
        <div className="label">Markdown</div>
      </div>

      <div className="autoSave">AutoSave</div>

      {!isAutosave ? (
        <button
          title="Activate Autosave"
          onClick={changeAutoSave}
          // className="fa-regular fa-toggle-off"
          className="sliderOff"
        >
          <div className="autoSave">OFF</div>

          <FontAwesomeIcon className="" icon={faToggleOff} />
        </button>
      ) : (
        <button
          title="Deactivate Autosave"
          onClick={changeAutoSave}
          //className="fa-regular fa-toggle-on"
          className="sliderOn"
        >
          <div className="autoSave">ON</div>
          <FontAwesomeIcon icon={faToggleOn} />
        </button>
      )}

      <Button
        variant="success"
        className="saveButton"
        onClick={() => {
          saveNotebook(
            nodes,
            edges,
            token,
            path,
            setShowSuccessAlert,
            setShowErrorAlert
          );
        }}
      >
        <FontAwesomeIcon icon={faSave} />
      </Button>
    </aside>
  );
};

export default Sidebar;
