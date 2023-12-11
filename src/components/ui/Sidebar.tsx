//COMMENT :: External modules/libraries
import { 
  DragEvent, 
  useEffect,
  useState,
} from "react";
import { 
  Node, 
  Edge 
} from "reactflow";
import {
  faSave,
  faToggleOff,
  faToggleOn,
  faGear,
} from "@fortawesome/free-solid-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { Button } from "react-bootstrap";
//COMMENT :: Internal modules HELPERS
import { saveNotebook } from "../../helpers/utils";
import { usePath } from "../../helpers/hooks";
import { useWebSocketStore } from "../../helpers/websocket";
import useSettingsStore from "../../helpers/settingsStore";

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

/**
 * Sidebar component that displays a list of draggable nodes and provides functionality 
 * for autosaving and manual saving of the current state of the nodes and edges.
 * @param nodes - An array of Node objects representing the nodes present on the canvas.
 * @param edges - An array of Edge objects representing the edges present on the canvas.
 * @param setShowSuccessAlert - A function to set the state of the success alert.
 * @param setShowErrorAlert - A function to set the state of the error alert.
 */

const Sidebar = ({
  nodes,
  edges,
  setShowSuccessAlert,
  setShowErrorAlert,
}: SidebarProps) => {
  const path = usePath();
  const token = useWebSocketStore((state) => state.token)
  const setShowSettings = useSettingsStore((state) => state.setShowSettings);
  const autoSaveSetting = useSettingsStore((state) => state.autoSave);
  const setAutoSaveSetting = useSettingsStore((state) => state.setAutoSave);
  const [isSpinning, setIsSpinning] = useState(false);

  const handleSettingsClick = () => {
    setShowSettings(true);
    setIsSpinning(true);

    setTimeout(() => {
      setIsSpinning(false);
    }, 300);
  };

  const changeAutoSave = () => {
    setAutoSaveSetting(!autoSaveSetting);
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

  const handleBeforeUnload = (event: BeforeUnloadEvent) => {
    if (autoSaveSetting) performAutosave();
  };

  useEffect(() => {
    let autosaveInterval: NodeJS.Timeout | undefined;

    if (autoSaveSetting) {
      autosaveInterval = setInterval(performAutosave, 20000); // 20 seconds=20000 milliseconds
    } else {
      clearInterval(autosaveInterval);
    }

    window.addEventListener("beforeunload", handleBeforeUnload);

    // Clean up the interval when component unmounts or when isAutosave changes
    return () => {
      clearInterval(autosaveInterval);
      window.removeEventListener("beforeunload", handleBeforeUnload);
    };
  }, [
    autoSaveSetting,
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

      {!autoSaveSetting ? (
        <button
          title="Activate AutoSave"
          onClick={changeAutoSave}
          className="sliderOff"
        >
          <div className="autoSave">OFF</div>

          <FontAwesomeIcon className="" icon={faToggleOff} />
        </button>
      ) : (
        <button
          title="Deactivate AutoSave"
          onClick={changeAutoSave}
          className="sliderOn"
        >
          <div className="autoSave">ON</div>
          <FontAwesomeIcon icon={faToggleOn} />
        </button>
      )}

      {/* Settings Button */}
      <Button 
        className="my-1"
        title="Settings"
        variant="secondary"
        onClick={handleSettingsClick}
      >
        <FontAwesomeIcon icon={faGear} spin={isSpinning} />
      </Button>

      <Button
        variant="success"
        className="saveButton"
        title="Save Notebook"
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
